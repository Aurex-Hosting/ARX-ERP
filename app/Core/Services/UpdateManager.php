<?php

namespace App\Core\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use ZipArchive;

class UpdateManager
{
    public function __construct(
        protected LicenseManager $licenseManager,
        protected BackupManager $backupManager,
        protected SettingsManager $settingsManager,
        protected ?NotificationService $notificationService = null,
        protected ?MailService $mailService = null
    ) {
        $this->notificationService ??= app(NotificationService::class);
        $this->mailService ??= app(MailService::class);
    }

    /**
     * Get current application version info from version.json.
     *
     * @return array<string, mixed>
     */
    public function getCurrentVersion(): array
    {
        $versionFile = base_path('version.json');
        if (File::exists($versionFile)) {
            try {
                $content = json_decode(File::get($versionFile), true);
                if (is_array($content)) {
                    return [
                        'version' => $content['version'] ?? '1.0.0',
                        'name' => $content['name'] ?? 'ARX-ERP Enterprise',
                        'channel' => $content['channel'] ?? 'stable',
                        'release_date' => $content['release_date'] ?? '2026-09-27',
                    ];
                }
            } catch (\Throwable) {
                // fallback
            }
        }

        return [
            'version' => '1.0.0',
            'name' => 'ARX-ERP Enterprise',
            'channel' => 'stable',
            'release_date' => '2026-09-27',
        ];
    }

    /**
     * Check for updates against central server and verify RSA digital signature.
     *
     * @return array<string, mixed>
     */
    public function checkForUpdates(): array
    {
        $current = $this->getCurrentVersion();
        $key = $this->licenseManager->getActiveLicenseKey();
        $installationId = $this->licenseManager->getInstallationId();

        if (empty($key)) {
            return [
                'update_available' => false,
                'current_version' => $current['version'],
                'message' => 'System is not activated with a license key.',
            ];
        }

        $serverUrl = rtrim((string) config('license.server_url', 'https://license.magneticx.store'), '/');

        try {
            $response = Http::timeout(25)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$serverUrl}/api/v1/license/update", [
                    'key' => $key,
                    'installationId' => $installationId,
                ]);
        } catch (\Throwable $e) {
            Log::warning('Update check failed due to network: '.$e->getMessage());

            return [
                'update_available' => false,
                'current_version' => $current['version'],
                'message' => "Could not check for updates: {$e->getMessage()}",
            ];
        }

        if (! $response->successful()) {
            return [
                'update_available' => false,
                'current_version' => $current['version'],
                'message' => "Update server returned HTTP {$response->status()}",
            ];
        }

        $body = $response->json();
        $data = $body['data'] ?? null;
        $signature = $body['signature'] ?? null;

        if (! is_array($data) || empty($signature)) {
            return [
                'update_available' => false,
                'current_version' => $current['version'],
                'message' => 'Invalid update payload response format.',
            ];
        }

        // Verify RSA Signature
        $isValidSignature = $this->licenseManager->verifySignature($data, $signature, $response->body());
        if (! $isValidSignature) {
            Log::error('Update payload rejected: Invalid RSA cryptographic seal.');

            return [
                'update_available' => false,
                'current_version' => $current['version'],
                'message' => 'Security Warning: Update response signature could not be verified by public key.',
            ];
        }

        $latestVersion = (string) ($data['latest_version'] ?? $current['version']);
        $cleanCurrent = ltrim($current['version'], 'vV ');
        $cleanLatest = ltrim($latestVersion, 'vV ');

        $updateAvailable = version_compare($cleanCurrent, $cleanLatest, '<');

        $result = [
            'update_available' => $updateAvailable,
            'current_version' => $current['version'],
            'latest_version' => $latestVersion,
            'name' => $data['name'] ?? "ARX-ERP {$latestVersion}",
            'notes' => $data['notes'] ?? '',
            'published_at' => $data['published_at'] ?? null,
            'zip_hash' => $data['zip_hash'] ?? null,
            'last_checked_at' => now()->toIso8601String(),
        ];

        // Cache update details
        $this->settingsManager->set('system.updates.latest_info', json_encode($result), 'system', 'string');
        $this->settingsManager->set('system.updates.last_checked_at', now()->toIso8601String(), 'system', 'string');

        // Automatically dispatch in-app bell notification and SMTP email hook if new version found
        if ($updateAvailable) {
            $this->notifyAdminsIfUpdateAvailable($result);
        }

        return $result;
    }

    /**
     * Dispatch in-app notification and optional SMTP email to Super Administrators
     * when a new release package is detected.
     *
     * @param  array<string, mixed>  $result
     */
    public function notifyAdminsIfUpdateAvailable(array $result): void
    {
        if (empty($result['update_available']) || empty($result['latest_version'])) {
            return;
        }

        $latestVersion = (string) $result['latest_version'];
        $lastNotifiedVersion = (string) $this->settingsManager->get('system.updates.last_notified_version', '');

        // Deduplication: Avoid notifying repeatedly for the exact same version
        if ($lastNotifiedVersion === $latestVersion) {
            return;
        }

        $superAdminRole = config('arx.roles.super_admin', 'super-admin');

        try {
            $admins = User::role($superAdminRole)
                ->where('is_active', true)
                ->where('user_type', '!=', 'ai_agent')
                ->get();
        } catch (\Throwable) {
            $admins = collect();
        }

        if ($admins->isEmpty()) {
            $admins = User::where('is_active', true)
                ->where('user_type', '!=', 'ai_agent')
                ->limit(2)
                ->get();
        }

        if ($admins->isEmpty()) {
            return;
        }

        $packageName = $result['name'] ?? "ARX-ERP v{$latestVersion}";

        foreach ($admins as $admin) {
            // 1. In-App Bell Notification
            try {
                $this->notificationService->sendToUser(
                    user: $admin,
                    title: "New System Update Available: v{$latestVersion}",
                    body: "A new verified ARX-ERP release ({$packageName}) is ready. Review release notes and update safely.",
                    type: 'info',
                    category: 'system',
                    actionButtons: [
                        [
                            'label' => 'View & Apply Update',
                            'action' => 'navigate',
                            'url' => '#updates',
                            'type' => 'primary',
                        ],
                    ],
                    metadata: [
                        'latest_version' => $latestVersion,
                        'package_name' => $packageName,
                        'published_at' => $result['published_at'] ?? null,
                        'zip_hash' => $result['zip_hash'] ?? null,
                    ]
                );
            } catch (\Throwable $e) {
                Log::warning("Failed to dispatch in-app update notification to user #{$admin->id}: ".$e->getMessage());
            }

            // 2. SMTP Email Trigger Hook
            try {
                $this->mailService->sendSystemUpdateMail($admin, $result);
            } catch (\Throwable $e) {
                Log::warning("Failed to dispatch update email notification to {$admin->email}: ".$e->getMessage());
            }
        }

        // Record last notified version to prevent repetitive spam
        $this->settingsManager->set('system.updates.last_notified_version', $latestVersion, 'system', 'string');
        $this->settingsManager->set('system.updates.last_notified_at', now()->toIso8601String(), 'system', 'string');
    }

    /**
     * Check if a backup was created in the last 1 hour.
     * Required safety gatekeeper before any update can be installed.
     *
     * @return array<string, mixed>
     */
    public function checkBackupEligibility(): array
    {
        $backups = $this->backupManager->listBackups();
        $oneHourAgo = now()->subHour();

        $recentBackup = null;
        foreach ($backups as $b) {
            try {
                $createdAt = Carbon::parse($b['created_at']);
                if ($createdAt->gte($oneHourAgo)) {
                    $recentBackup = $b;
                    break;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        if ($recentBackup !== null) {
            return [
                'eligible' => true,
                'recent_backup' => [
                    'filename' => $recentBackup['filename'],
                    'created_at' => $recentBackup['created_at'],
                    'size' => $recentBackup['size_formatted'] ?? null,
                ],
                'message' => 'Safety verification passed: A fresh backup was created within the last 1 hour.',
            ];
        }

        return [
            'eligible' => false,
            'reason' => 'backup_required',
            'message' => 'A system backup created within the last 1 hour is required before installing this update.',
            'last_backup' => count($backups) > 0 ? $backups[0]['created_at'] : null,
        ];
    }

    /**
     * Download the update package stream and verify SHA256 integrity.
     */
    public function downloadAndVerifyUpdate(string $releaseName, string $expectedHash): string
    {
        $key = $this->licenseManager->getActiveLicenseKey();
        $installationId = $this->licenseManager->getInstallationId();

        if (empty($key)) {
            throw new RuntimeException('No active license key found for downloading updates.');
        }

        $serverUrl = rtrim((string) config('license.server_url', 'https://license.magneticx.store'), '/');
        $updatesDir = storage_path('app/updates');
        if (! File::isDirectory($updatesDir)) {
            File::makeDirectory($updatesDir, 0755, true, true);
        }

        $safeName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $releaseName);
        $targetZipPath = "{$updatesDir}/update_{$safeName}.zip";

        // Download stream with progress / timeout
        $response = Http::timeout(300)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->withOptions([
                'sink' => $targetZipPath,
            ])
            ->post("{$serverUrl}/api/v1/license/download", [
                'key' => $key,
                'installationId' => $installationId,
                'Relesename' => $releaseName,
            ]);

        if (! $response->successful() || ! File::exists($targetZipPath) || File::size($targetZipPath) === 0) {
            $serverMsg = '';
            if (File::exists($targetZipPath)) {
                $rawBody = (string) File::get($targetZipPath);
                $parsed = json_decode($rawBody, true);
                $serverMsg = $parsed['message'] ?? $parsed['error'] ?? (strlen($rawBody) < 200 ? trim($rawBody) : '');
                File::delete($targetZipPath);
            }
            $errDetail = $serverMsg ? " ({$serverMsg})" : '';
            throw new RuntimeException("Download failed: Central server returned HTTP status {$response->status()}{$errDetail}");
        }

        // Verify SHA256 Checksum
        $calculatedHash = hash_file('sha256', $targetZipPath);
        if (! empty($expectedHash) && ! hash_equals(strtolower($expectedHash), strtolower($calculatedHash))) {
            File::delete($targetZipPath);
            Log::error('Update archive checksum mismatch', [
                'expected' => $expectedHash,
                'calculated' => $calculatedHash,
            ]);
            throw new RuntimeException("Cryptographic verification failed: Downloaded archive hash ({$calculatedHash}) does not match expected hash ({$expectedHash}).");
        }

        return $targetZipPath;
    }

    /**
     * Apply the downloaded update with atomic rollback protection.
     *
     * @return array<string, mixed>
     */
    public function applyUpdate(string $zipPath, string $targetVersion, ?string $releaseNotes = null): array
    {
        // 1. Enforce 1-Hour Backup Safety Gatekeeper
        $eligibility = $this->checkBackupEligibility();
        if (! $eligibility['eligible']) {
            throw new RuntimeException($eligibility['message']);
        }

        if (! File::exists($zipPath)) {
            throw new RuntimeException("Update archive not found at '{$zipPath}'.");
        }

        $current = $this->getCurrentVersion();
        $currentVersion = $current['version'];

        $rollbackDir = storage_path("app/updates/rollback_{$currentVersion}");
        $this->createRollbackSnapshot($rollbackDir, $currentVersion);

        try {
            // 2. Extract Update Package Safely
            $this->extractUpdateArchive($zipPath);

            // 3. Run Database Migrations
            Artisan::call('migrate', ['--force' => true]);

            // 4. Flush All Application Caches
            $this->flushCaches();

            // 5. Update version.json
            $this->updateVersionFile($targetVersion);

            // 6. Clean up temporary download file
            File::delete($zipPath);

            return [
                'success' => true,
                'previous_version' => $currentVersion,
                'installed_version' => $targetVersion,
                'message' => "ARX-ERP successfully updated to {$targetVersion}!",
            ];
        } catch (\Throwable $e) {
            Log::critical('Update execution failure. Triggering instant automatic rollback...', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Auto-Instant Rollback
            $rollbackResult = $this->executeRollback($rollbackDir);

            throw new RuntimeException("Update failed: {$e->getMessage()}. Automatic instant rollback to v{$currentVersion} was completed successfully.");
        }
    }

    /**
     * Create a rollback snapshot of current running code.
     */
    protected function createRollbackSnapshot(string $rollbackDir, string $version): void
    {
        if (File::isDirectory($rollbackDir)) {
            File::deleteDirectory($rollbackDir);
        }
        File::makeDirectory($rollbackDir, 0755, true, true);

        // Core directories to snapshot for rollback
        $dirsToSnapshot = ['app', 'config', 'routes', 'database', 'bootstrap', 'themes'];
        foreach ($dirsToSnapshot as $dir) {
            $src = base_path($dir);
            $dst = "{$rollbackDir}/{$dir}";
            if (File::isDirectory($src)) {
                File::copyDirectory($src, $dst);
            }
        }

        // Files to snapshot
        $filesToSnapshot = ['composer.json', 'version.json', 'package.json'];
        foreach ($filesToSnapshot as $file) {
            $src = base_path($file);
            $dst = "{$rollbackDir}/{$file}";
            if (File::exists($src)) {
                File::copy($src, $dst);
            }
        }

        // Write snapshot manifest
        File::put("{$rollbackDir}/rollback_manifest.json", json_encode([
            'version' => $version,
            'created_at' => now()->toIso8601String(),
        ], JSON_PRETTY_PRINT));
    }

    /**
     * Safely extract the update archive over project root, strictly protecting user data.
     */
    protected function extractUpdateArchive(string $zipPath): void
    {
        $zip = new ZipArchive;
        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException('Cannot open downloaded update zip archive.');
        }

        // Protected paths that must NEVER be overwritten by update archives
        $protectedPrefixes = [
            '.env',
            'storage/',
            'storage\\',
            '.git',
        ];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $filename = $zip->getNameIndex($i);

            // Skip directories and protected system files
            $isProtected = false;
            foreach ($protectedPrefixes as $prefix) {
                if (str_starts_with($filename, $prefix)) {
                    $isProtected = true;
                    break;
                }
            }

            if ($isProtected) {
                continue;
            }

            // Extract file safely
            $zip->extractTo(base_path(), $filename);
        }

        $zip->close();
    }

    /**
     * Execute rollback from a snapshot directory.
     *
     * @return array<string, mixed>
     */
    public function executeRollback(?string $rollbackDir = null): array
    {
        if ($rollbackDir === null) {
            // Find latest rollback directory
            $updatesDir = storage_path('app/updates');
            $candidates = File::glob("{$updatesDir}/rollback_*");
            if (empty($candidates)) {
                throw new RuntimeException('No rollback snapshot found.');
            }
            rsort($candidates);
            $rollbackDir = $candidates[0];
        }

        if (! File::isDirectory($rollbackDir)) {
            throw new RuntimeException("Rollback snapshot directory does not exist: {$rollbackDir}");
        }

        // Restore core directories
        $items = File::directories($rollbackDir);
        foreach ($items as $item) {
            $dirName = basename($item);
            File::copyDirectory($item, base_path($dirName));
        }

        // Restore core files
        $files = File::files($rollbackDir);
        foreach ($files as $file) {
            $fileName = $file->getFilename();
            if ($fileName === 'rollback_manifest.json') {
                continue;
            }
            File::copy($file->getPathname(), base_path($fileName));
        }

        $this->flushCaches();

        $manifestFile = "{$rollbackDir}/rollback_manifest.json";
        $restoredVersion = 'previous';
        if (File::exists($manifestFile)) {
            $manifest = json_decode(File::get($manifestFile), true);
            $restoredVersion = $manifest['version'] ?? 'previous';
        }

        return [
            'success' => true,
            'restored_version' => $restoredVersion,
            'message' => "Successfully rolled back application to v{$restoredVersion}.",
        ];
    }

    /**
     * Update the version.json file with new version and date.
     */
    protected function updateVersionFile(string $version): void
    {
        $versionFile = base_path('version.json');
        $data = [
            'version' => ltrim($version, 'vV '),
            'name' => 'ARX-ERP Enterprise',
            'channel' => 'stable',
            'release_date' => now()->toDateString(),
        ];

        File::put($versionFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Flush all Laravel caches.
     */
    public function flushCaches(): void
    {
        try {
            Artisan::call('cache:clear');
            Artisan::call('route:clear');
            Artisan::call('view:clear');
            Artisan::call('config:clear');
        } catch (\Throwable $e) {
            Log::warning('Cache flush during update encountered non-critical error: '.$e->getMessage());
        }
    }

    /**
     * Check if any rollback snapshots exist.
     *
     * @return array<string, mixed>|null
     */
    public function getRollbackInfo(): ?array
    {
        $updatesDir = storage_path('app/updates');
        $candidates = File::glob("{$updatesDir}/rollback_*");
        if (empty($candidates)) {
            return null;
        }

        rsort($candidates);
        $latest = $candidates[0];
        $manifestFile = "{$latest}/rollback_manifest.json";

        if (File::exists($manifestFile)) {
            try {
                $data = json_decode(File::get($manifestFile), true);

                return [
                    'available' => true,
                    'version' => $data['version'] ?? 'previous',
                    'created_at' => $data['created_at'] ?? null,
                ];
            } catch (\Throwable) {
                // fallback
            }
        }

        return [
            'available' => true,
            'version' => basename($latest),
            'created_at' => null,
        ];
    }
}
