<?php

namespace App\Core\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class LicenseManager
{
    public function __construct(
        protected SettingsManager $settingsManager
    ) {}

    /**
     * Get or generate the persistent machine hardware fingerprint (Installation ID).
     */
    public function getInstallationId(): string
    {
        // 1. Check environment variable override
        $envId = env('INSTALLATION_ID');
        if (! empty($envId)) {
            return trim((string) $envId);
        }

        // 2. Check storage file
        $storagePath = storage_path('app/.installation_id');
        if (File::exists($storagePath)) {
            $existingId = trim((string) File::get($storagePath));
            if (! empty($existingId)) {
                return $existingId;
            }
        }

        // 3. Generate hardware fingerprint
        $fingerprint = $this->generateHardwareFingerprint();

        // 4. Persist in storage
        if (! File::isDirectory(dirname($storagePath))) {
            File::makeDirectory(dirname($storagePath), 0755, true, true);
        }
        File::put($storagePath, $fingerprint);

        return $fingerprint;
    }

    /**
     * Generate an immutable hardware fingerprint based on machine attributes.
     */
    protected function generateHardwareFingerprint(): string
    {
        $rawSeed = [];

        // OS & Hostname
        $rawSeed[] = php_uname('s').'-'.php_uname('n').'-'.php_uname('m');

        if (PHP_OS_FAMILY === 'Windows') {
            // Windows Registry MachineGuid
            try {
                $output = @shell_exec('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography" /v MachineGuid 2>nul');
                if ($output && preg_match('/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9\-]+)/i', $output, $matches)) {
                    $rawSeed[] = trim($matches[1]);
                }
            } catch (\Throwable) {
                // fallback
            }

            // Windows Network MAC
            try {
                $macOutput = @shell_exec('getmac /NH 2>nul');
                if ($macOutput && preg_match('/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/', $macOutput, $matches)) {
                    $rawSeed[] = trim($matches[0]);
                }
            } catch (\Throwable) {
                // fallback
            }
        } else {
            // Linux / Unix Machine ID
            if (File::exists('/etc/machine-id')) {
                $rawSeed[] = trim((string) File::get('/etc/machine-id'));
            } elseif (File::exists('/var/lib/dbus/machine-id')) {
                $rawSeed[] = trim((string) File::get('/var/lib/dbus/machine-id'));
            }

            // Linux MAC Address
            $netInterfaces = @glob('/sys/class/net/*/address');
            if ($netInterfaces) {
                foreach ($netInterfaces as $iface) {
                    $mac = trim((string) @file_get_contents($iface));
                    if (! empty($mac) && $mac !== '00:00:00:00:00:00') {
                        $rawSeed[] = $mac;
                        break;
                    }
                }
            }
        }

        // Project Root Path as anchor
        $rawSeed[] = base_path();

        $hash = hash('sha256', implode('|', $rawSeed));

        // Format: ARX-XXXX-XXXX-XXXX-XXXX
        return 'ARX-'.strtoupper(substr($hash, 0, 4))
            .'-'.strtoupper(substr($hash, 4, 4))
            .'-'.strtoupper(substr($hash, 8, 4))
            .'-'.strtoupper(substr($hash, 12, 4));
    }

    /**
     * Verify the RSA-SHA256 signature against central authority public key.
     */
    public function verifySignature(mixed $data, string $signature, ?string $rawResponse = null): bool
    {
        $publicKey = (string) config('license.public_key');
        if (empty($publicKey) || empty($signature)) {
            return false;
        }

        $signatureBytes = base64_decode($signature, true);
        if ($signatureBytes === false) {
            return false;
        }

        // Strategy A: If raw HTTP response is provided, extract the raw "data" JSON substring
        if ($rawResponse !== null) {
            if (preg_match('/"data"\s*:\s*(\{.*?\})\s*,\s*"signature"/s', $rawResponse, $matches)) {
                $rawJsonData = $matches[1];
                if (openssl_verify($rawJsonData, $signatureBytes, $publicKey, OPENSSL_ALGO_SHA256) === 1) {
                    return true;
                }
            }
        }

        // Strategy B: Serialized string if already formatted
        if (is_string($data)) {
            if (openssl_verify($data, $signatureBytes, $publicKey, OPENSSL_ALGO_SHA256) === 1) {
                return true;
            }
        }

        // Strategy C: JSON encoded with and without unescaped slashes
        $jsonVariants = [
            json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            json_encode($data, JSON_UNESCAPED_SLASHES),
            json_encode($data),
        ];

        foreach ($jsonVariants as $candidate) {
            if ($candidate !== false && openssl_verify($candidate, $signatureBytes, $publicKey, OPENSSL_ALGO_SHA256) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * Activate product license with the central server.
     *
     * @return array<string, mixed>
     */
    public function activateLicense(string $licenseKey): array
    {
        $licenseKey = trim($licenseKey);
        if (empty($licenseKey)) {
            throw new RuntimeException('Product License Key cannot be empty.');
        }

        $installationId = $this->getInstallationId();
        $serverUrl = rtrim((string) config('license.server_url', 'https://license.magneticx.store'), '/');

        try {
            $response = Http::timeout(20)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$serverUrl}/api/v1/license/activate", [
                    'key' => $licenseKey,
                    'installationId' => $installationId,
                ]);
        } catch (\Throwable $e) {
            Log::error('License activation network failure', ['error' => $e->getMessage()]);
            throw new RuntimeException("Could not connect to central licensing server: {$e->getMessage()}");
        }

        if (! $response->successful()) {
            $errorMsg = $response->json('message')
                ?? $response->json('error')
                ?? "Server returned HTTP status {$response->status()}";
            throw new RuntimeException("License activation failed: {$errorMsg}");
        }

        $body = $response->json();
        $data = $body['data'] ?? null;
        $signature = $body['signature'] ?? null;

        if (! is_array($data) || empty($signature)) {
            throw new RuntimeException('Invalid response format from licensing server (missing data or signature).');
        }

        // Verify RSA Signature
        $isValidSignature = $this->verifySignature($data, $signature, $response->body());
        if (! $isValidSignature) {
            Log::warning('License activation rejected: Invalid RSA-SHA256 digital signature.');
            throw new RuntimeException('Cryptographic seal verification failed: Response signature does not match public key.');
        }

        if (! ($data['success'] ?? false)) {
            throw new RuntimeException($data['message'] ?? 'Licensing server reported unsuccessful activation.');
        }

        // Persist activated license credentials
        $this->persistLicenseDetails($licenseKey, $data, $signature);

        return [
            'success' => true,
            'message' => $data['message'] ?? 'License activated successfully',
            'expiresAt' => $data['expiresAt'] ?? null,
            'appSecret' => $data['appSecret'] ?? null,
            'installationId' => $installationId,
        ];
    }

    /**
     * Validate active license with central server or fallback to local cache.
     *
     * @return array<string, mixed>
     */
    public function validateLicense(?string $licenseKey = null, bool $force = false): array
    {
        $key = $licenseKey ?? $this->getActiveLicenseKey();
        if (empty($key)) {
            return [
                'is_valid' => false,
                'message' => 'No active license key configured.',
                'installation_id' => $this->getInstallationId(),
            ];
        }

        $cacheKey = "arx_license_val_{$key}";
        if (! $force && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $installationId = $this->getInstallationId();
        $serverUrl = rtrim((string) config('license.server_url', 'https://license.magneticx.store'), '/');

        try {
            $response = Http::timeout(15)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$serverUrl}/api/v1/license/validate", [
                    'key' => $key,
                    'installationId' => $installationId,
                ]);

            if ($response->successful()) {
                $body = $response->json();
                $data = $body['data'] ?? null;
                $signature = $body['signature'] ?? null;

                if (is_array($data) && ! empty($signature) && $this->verifySignature($data, $signature, $response->body())) {
                    $expiresAt = isset($data['expiresAt']) ? Carbon::parse($data['expiresAt']) : null;
                    $isExpired = $expiresAt ? $expiresAt->isPast() : false;

                    $result = [
                        'is_valid' => ($data['success'] ?? false) && ! $isExpired && ! ($data['isFrozen'] ?? false),
                        'message' => $data['message'] ?? 'License validated successfully',
                        'expires_at' => $expiresAt?->toIso8601String(),
                        'app_secret' => $data['appSecret'] ?? $this->settingsManager->get('system.license.app_secret'),
                        'installation_id' => $installationId,
                        'last_checked_at' => now()->toIso8601String(),
                    ];

                    $ttl = (int) config('license.cache_ttl_minutes', 720);
                    Cache::put($cacheKey, $result, now()->addMinutes($ttl));

                    return $result;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Central license validation check skipped due to network: '.$e->getMessage());
        }

        // If network is unreachable, fallback to stored expiration
        $storedExpires = $this->settingsManager->get('system.license.expires_at');
        $isExpired = false;
        if ($storedExpires) {
            try {
                $isExpired = Carbon::parse($storedExpires)->isPast();
            } catch (\Throwable) {
                $isExpired = false;
            }
        }

        return [
            'is_valid' => ! $isExpired && ! empty($this->settingsManager->get('system.license.app_secret')),
            'message' => $isExpired ? 'License expired' : 'Operating in offline cache mode',
            'expires_at' => $storedExpires,
            'app_secret' => $this->settingsManager->get('system.license.app_secret'),
            'installation_id' => $installationId,
            'last_checked_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get the active license key configured in settings or environment.
     */
    public function getActiveLicenseKey(): ?string
    {
        return $this->settingsManager->get('system.license.key')
            ?: env('PRODUCT_LICENSE_KEY')
            ?: null;
    }

    /**
     * Get the stored appSecret.
     */
    public function getAppSecret(): ?string
    {
        return (string) $this->settingsManager->get('system.license.app_secret', '');
    }

    /**
     * Read complete current license status.
     *
     * @return array<string, mixed>
     */
    public function getLicenseStatus(): array
    {
        $key = $this->getActiveLicenseKey();
        $installationId = $this->getInstallationId();
        $validation = $this->validateLicense($key);

        return [
            'has_license' => ! empty($key),
            'license_key' => $key ? (substr($key, 0, 4).'-****-****-'.substr($key, -4)) : null,
            'full_license_key' => $key,
            'installation_id' => $installationId,
            'is_valid' => $validation['is_valid'] ?? false,
            'expires_at' => $validation['expires_at'] ?? null,
            'app_secret' => ! empty($validation['app_secret']) ? (substr($validation['app_secret'], 0, 6).'...'.substr($validation['app_secret'], -4)) : null,
            'last_checked_at' => $validation['last_checked_at'] ?? null,
        ];
    }

    /**
     * Save verified license details into database settings and .env.
     *
     * @param  array<string, mixed>  $data
     */
    protected function persistLicenseDetails(string $licenseKey, array $data, string $signature): void
    {
        $this->settingsManager->set('system.license.key', $licenseKey, 'system', 'string');
        $this->settingsManager->set('system.license.signature', $signature, 'system', 'string');

        if (! empty($data['appSecret'])) {
            $this->settingsManager->set('system.license.app_secret', (string) $data['appSecret'], 'system', 'string');
        }

        if (! empty($data['expiresAt'])) {
            $this->settingsManager->set('system.license.expires_at', (string) $data['expiresAt'], 'system', 'string');
        }

        $this->settingsManager->set('system.license.activated_at', now()->toIso8601String(), 'system', 'string');

        // Update .env file
        $this->updateEnvFile([
            'PRODUCT_LICENSE_KEY' => $licenseKey,
            'INSTALLATION_ID' => $this->getInstallationId(),
        ]);
    }

    /**
     * Helper to write keys into .env safely.
     *
     * @param  array<string, string>  $entries
     */
    public function updateEnvFile(array $entries): void
    {
        $envPath = base_path('.env');
        if (! File::exists($envPath)) {
            if (File::exists(base_path('.env.example'))) {
                File::copy(base_path('.env.example'), $envPath);
            } else {
                File::put($envPath, '');
            }
        }

        $envContent = File::get($envPath);

        foreach ($entries as $key => $value) {
            $pattern = "/^{$key}=.*/m";
            $formattedValue = str_contains($value, ' ') || str_contains($value, '#')
                ? '"'.addcslashes($value, '"').'"'
                : $value;

            if (preg_match($pattern, $envContent)) {
                $envContent = preg_replace($pattern, "{$key}={$formattedValue}", $envContent);
            } else {
                $envContent .= "\n{$key}={$formattedValue}";
            }
        }

        File::put($envPath, $envContent);
    }
}
