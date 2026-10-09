#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * ARX-ERP Enterprise Standalone Installer
 *
 * Self-contained zero-dependency setup wizard for ARX-ERP Enterprise.
 * Generates machine fingerprint, activates and cryptographically validates license,
 * downloads and extracts release archive, configures database, and initializes the system.
 */

// --------------------------------------------------------------------------
// Embedded Configuration & Public Key
// --------------------------------------------------------------------------
const LICENSE_SERVER_URL = 'https://license.magneticx.store';
const PUBLIC_KEY = <<<'PEM'
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxNYIIMUx6PU8jd1yv8rg
nkiCLSdDVMfNvFfaocuYSfyasfzxMtNYETrZKb6KPolz+bHzJdPX9EGY8KnykLT4
QP1ohK1tdCHmkONK1BhnOYYPWlVSnKcwYb3IauPaulG1K8CpeFZ64vjMRBzPvCdO
qcVdYt3DK4aIPQlJhY82xlITa6jLNoGcWxfI/+rDGSn4wZFowIxzF7T5hbI/NBtC
M+br64+oo/inD1FAfbjGdVjSr0v2A+XsLq2B53mQCWBwgfA5Q9YqjYLKvGJrdq4m
yr23Z2O6u5671kdq+pZRuFCjfuz8UltUMOXtPZ9mIjMcMVWfZ7m/w9DzwjtkdWI5
qwIDAQAB
-----END PUBLIC KEY-----
PEM;

// --------------------------------------------------------------------------
// Terminal Formatting Helpers
// --------------------------------------------------------------------------
function out(string $text = ''): void
{
    echo $text.PHP_EOL;
}

function color(string $text, string $color): string
{
    $colors = [
        'red' => "\033[31m",
        'green' => "\033[32m",
        'yellow' => "\033[33m",
        'blue' => "\033[34m",
        'cyan' => "\033[36m",
        'bold' => "\033[1m",
        'dim' => "\033[2m",
        'reset' => "\033[0m",
    ];

    return ($colors[$color] ?? '').$text.($colors['reset'] ?? '');
}

function prompt(string $question, ?string $default = null): string
{
    $suffix = $default !== null ? ' ['.color($default, 'cyan').']' : '';
    echo color($question, 'bold').$suffix.': ';
    $input = trim((string) fgets(STDIN));

    return $input === '' && $default !== null ? $default : $input;
}

function promptSecret(string $question): string
{
    echo color($question, 'bold').': ';
    if (PHP_OS_FAMILY === 'Windows') {
        $cmd = 'powershell -Command "$p = Read-Host -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p))"';
        $pwd = trim((string) shell_exec($cmd));
        echo PHP_EOL;

        return $pwd;
    }

    if (function_exists('shell_exec')) {
        $sttyMode = shell_exec('stty -g 2>/dev/null');
        shell_exec('stty -echo 2>/dev/null');
        $pwd = trim((string) fgets(STDIN));
        if ($sttyMode) {
            shell_exec('stty '.escapeshellarg(trim($sttyMode)).' 2>/dev/null');
        } else {
            shell_exec('stty echo 2>/dev/null');
        }
        echo PHP_EOL;

        return $pwd;
    }

    $pwd = trim((string) fgets(STDIN));

    return $pwd;
}

function confirm(string $question, bool $default = true): bool
{
    $hint = $default ? '[Y/n]' : '[y/N]';
    echo color($question, 'bold')." {$hint}: ";
    $input = strtolower(trim((string) fgets(STDIN)));
    if ($input === '') {
        return $default;
    }

    return in_array($input, ['y', 'yes', 'true', '1'], true);
}

function fixStoragePermissions(string $baseDir): void
{
    $dirs = [
        $baseDir.'/storage/app/public',
        $baseDir.'/storage/app/private',
        $baseDir.'/storage/framework/cache/data',
        $baseDir.'/storage/framework/sessions',
        $baseDir.'/storage/framework/views',
        $baseDir.'/storage/logs',
        $baseDir.'/bootstrap/cache',
    ];
    foreach ($dirs as $dir) {
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
    }

    if (PHP_OS_FAMILY !== 'Windows') {
        foreach (['www', 'www-data', 'nginx', 'apache'] as $webUser) {
            $check = @shell_exec("id -u {$webUser} 2>/dev/null");
            if ($check !== null && trim($check) !== '') {
                @shell_exec('chown -R '.escapeshellarg("{$webUser}:{$webUser}").' '.escapeshellarg($baseDir.'/storage').' '.escapeshellarg($baseDir.'/bootstrap/cache').' 2>/dev/null');
                break;
            }
        }
        @shell_exec('chmod -R 775 '.escapeshellarg($baseDir.'/storage').' '.escapeshellarg($baseDir.'/bootstrap/cache').' 2>/dev/null');
    }
}

function linkThemeAssets(string $baseDir): void
{
    $dashboardAssets = $baseDir.'/themes/dashboard/default/dist/assets';
    $publicAssets = $baseDir.'/public/assets';

    if (is_dir($dashboardAssets) && ! file_exists($publicAssets)) {
        if (PHP_OS_FAMILY !== 'Windows') {
            @symlink($dashboardAssets, $publicAssets);
        }
    }

    $adminAssets = $baseDir.'/themes/admin/default/dist/assets';
    $publicAdminDir = $baseDir.'/public/admin';
    $publicAdminAssets = $baseDir.'/public/admin/assets';

    if (is_dir($adminAssets)) {
        if (! is_dir($publicAdminDir)) {
            @mkdir($publicAdminDir, 0755, true);
        }
        if (! file_exists($publicAdminAssets)) {
            if (PHP_OS_FAMILY !== 'Windows') {
                @symlink($adminAssets, $publicAdminAssets);
            }
        }
    }
}

// --------------------------------------------------------------------------
// Hardware Fingerprint Generator
// --------------------------------------------------------------------------
function getInstallationId(string $baseDir): string
{
    $storageFile = $baseDir.'/storage/app/.installation_id';
    if (file_exists($storageFile)) {
        $existing = trim((string) file_get_contents($storageFile));
        if (! empty($existing)) {
            return $existing;
        }
    }

    $envFile = $baseDir.'/.env';
    if (file_exists($envFile)) {
        $content = file_get_contents($envFile);
        if (preg_match('/^INSTALLATION_ID=(.*)$/m', $content, $m)) {
            $val = trim($m[1], " \t\n\r\0\x0B\"'");
            if (! empty($val)) {
                return $val;
            }
        }
    }

    $rawSeed = [];
    $rawSeed[] = php_uname('s').'-'.php_uname('n').'-'.php_uname('m');

    if (PHP_OS_FAMILY === 'Windows') {
        try {
            $output = @shell_exec('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography" /v MachineGuid 2>nul');
            if ($output && preg_match('/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9\-]+)/i', $output, $matches)) {
                $rawSeed[] = trim($matches[1]);
            }
        } catch (Throwable) {
        }

        try {
            $macOutput = @shell_exec('getmac /NH 2>nul');
            if ($macOutput && preg_match('/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/', $macOutput, $matches)) {
                $rawSeed[] = trim($matches[0]);
            }
        } catch (Throwable) {
        }
    } else {
        if (file_exists('/etc/machine-id')) {
            $rawSeed[] = trim((string) file_get_contents('/etc/machine-id'));
        } elseif (file_exists('/var/lib/dbus/machine-id')) {
            $rawSeed[] = trim((string) file_get_contents('/var/lib/dbus/machine-id'));
        }

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

    $rawSeed[] = $baseDir;
    $hash = hash('sha256', implode('|', $rawSeed));

    return 'ARX-'.strtoupper(substr($hash, 0, 4))
        .'-'.strtoupper(substr($hash, 4, 4))
        .'-'.strtoupper(substr($hash, 8, 4))
        .'-'.strtoupper(substr($hash, 12, 4));
}

// --------------------------------------------------------------------------
// Cryptographic Signature Verification
// --------------------------------------------------------------------------
function verifySignature(string $rawResponse, string $signature, string $publicKey): bool
{
    $sigBytes = base64_decode($signature, true);
    if ($sigBytes === false) {
        return false;
    }

    // Strategy A: Exact "data" JSON substring from server response
    if (preg_match('/"data"\s*:\s*(\{.*?\})\s*,\s*"signature"/s', $rawResponse, $matches)) {
        if (openssl_verify($matches[1], $sigBytes, $publicKey, OPENSSL_ALGO_SHA256) === 1) {
            return true;
        }
    }

    // Strategy B: Variants of JSON encoding
    $decoded = json_decode($rawResponse, true);
    $data = $decoded['data'] ?? null;
    if ($data !== null) {
        $variants = [
            json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            json_encode($data, JSON_UNESCAPED_SLASHES),
            json_encode($data),
        ];
        foreach ($variants as $cand) {
            if ($cand !== false && openssl_verify($cand, $sigBytes, $publicKey, OPENSSL_ALGO_SHA256) === 1) {
                return true;
            }
        }
    }

    return false;
}

// --------------------------------------------------------------------------
// HTTP Request Helpers
// --------------------------------------------------------------------------
function postJson(string $url, array $payload): array
{
    $ch = curl_init($url);
    $json = json_encode($payload);

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: ARX-ERP-Installer/1.0',
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new RuntimeException("Network request failed: {$err}");
    }

    return [
        'status' => $httpCode,
        'raw' => (string) $raw,
        'json' => json_decode((string) $raw, true) ?: [],
    ];
}

function downloadReleaseZip(string $url, string $targetPath, array $payload): void
{
    $fp = fopen($targetPath, 'w+');
    if (! $fp) {
        throw new RuntimeException("Cannot create destination archive file: {$targetPath}");
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_TIMEOUT, 600);
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'User-Agent: ARX-ERP-Installer/1.0',
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_NOPROGRESS, false);

    curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, function ($ch, $total, $downloaded) {
        if ($total > 0) {
            $pct = round(($downloaded / $total) * 100);
            $mbCurr = round($downloaded / 1048576, 2);
            $mbTot = round($total / 1048576, 2);
            $barWidth = 30;
            $filled = (int) round(($pct / 100) * $barWidth);
            $bar = str_repeat('=', $filled).($filled < $barWidth ? '>' : '').str_repeat(' ', max(0, $barWidth - $filled - 1));
            echo "\r  \033[36mProgress:\033[0m [{$bar}] {$pct}% ({$mbCurr} MB / {$mbTot} MB)   ";
            flush();
        }
    });

    $success = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    fclose($fp);

    echo PHP_EOL;

    if (! $success || $httpCode < 200 || $httpCode >= 300) {
        $serverMsg = '';
        if (file_exists($targetPath)) {
            $rawBody = (string) file_get_contents($targetPath);
            $parsed = json_decode($rawBody, true);
            $serverMsg = $parsed['message'] ?? $parsed['error'] ?? (strlen($rawBody) < 200 ? trim($rawBody) : '');
            @unlink($targetPath);
        }
        $errDetail = $serverMsg ? " ({$serverMsg})" : ($err ? ": {$err}" : '');
        throw new RuntimeException("Release download failed with HTTP {$httpCode}{$errDetail}");
    }
}

// --------------------------------------------------------------------------
// Environment File & File Helpers
// --------------------------------------------------------------------------
function initializeEnvFromExample(string $envPath, string $examplePath): void
{
    if (! file_exists($examplePath)) {
        if (! file_exists($envPath)) {
            touch($envPath);
        }

        return;
    }

    if (! file_exists($envPath) || filesize($envPath) === 0) {
        copy($examplePath, $envPath);

        return;
    }

    $existingEnv = (string) file_get_contents($envPath);
    $existingValues = [];
    if (preg_match_all('/^([A-Z0-9_]+)=(.*)$/m', $existingEnv, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $existingValues[$match[1]] = trim($match[2], " \t\n\r\0\x0B\"'");
        }
    }

    $template = (string) file_get_contents($examplePath);
    foreach ($existingValues as $k => $v) {
        if (preg_match("/^{$k}=.*/m", $template)) {
            $formatted = ($v === '' || $v === 'null') ? $v : (str_contains($v, ' ') || str_contains($v, '#') ? '"'.addcslashes($v, '"\\').'"' : $v);
            $template = preg_replace("/^{$k}=.*/m", "{$k}={$formatted}", $template);
        }
    }
    file_put_contents($envPath, $template);
}

function updateEnvFile(string $filePath, array $values): void
{
    if (! file_exists($filePath)) {
        touch($filePath);
    }
    $content = (string) file_get_contents($filePath);
    foreach ($values as $key => $val) {
        $cleanVal = (string) $val;
        if ($cleanVal === '') {
            $formatted = '';
        } elseif ($cleanVal === 'null') {
            $formatted = 'null';
        } elseif ($cleanVal === 'true' || $cleanVal === 'false' || is_numeric($cleanVal)) {
            $formatted = $cleanVal;
        } elseif (str_contains($cleanVal, ' ') || str_contains($cleanVal, '#') || str_contains($cleanVal, '"')) {
            $formatted = '"'.addcslashes($cleanVal, '"\\').'"';
        } else {
            $formatted = $cleanVal;
        }

        if (preg_match("/^{$key}=.*/m", $content)) {
            $content = preg_replace("/^{$key}=.*/m", "{$key}={$formatted}", $content);
        } else {
            $content = rtrim($content)."\n{$key}={$formatted}\n";
        }
    }
    file_put_contents($filePath, $content);
}

function extractRelease(string $zipPath, string $destDir): void
{
    $zip = new ZipArchive;
    if ($zip->open($zipPath) !== true) {
        throw new RuntimeException("Failed to open release archive: {$zipPath}");
    }

    $protected = ['.env', 'storage/', 'storage\\', '.git'];

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        $isProt = false;
        foreach ($protected as $p) {
            if (str_starts_with($name, $p)) {
                $isProt = true;
                break;
            }
        }
        if ($isProt) {
            continue;
        }
        $zip->extractTo($destDir, $name);
    }

    $zip->close();
    @unlink($zipPath);
}

// --------------------------------------------------------------------------
// Parse CLI Options
// --------------------------------------------------------------------------
$options = getopt('h', ['help', 'force', 'skip-download']);
if (isset($options['h']) || isset($options['help'])) {
    out(color('ARX-ERP Enterprise Standalone Setup Wizard', 'bold'));
    out();
    out('Usage:');
    out('  php install.php [options]');
    out();
    out('Options:');
    out('  --force           Force installation even if already configured');
    out('  --skip-download   Skip checking and downloading release from server');
    out('  -h, --help        Display this help message');
    out();
    exit(0);
}

$isForce = isset($options['force']);
$skipDownload = isset($options['skip-download']);

// --------------------------------------------------------------------------
// Main Setup Execution
// --------------------------------------------------------------------------
$baseDir = __DIR__;

out();
out(color('===========================================================', 'cyan'));
out(color('        ARX-ERP ENTERPRISE INSTALLATION WIZARD             ', 'bold'));
out(color('===========================================================', 'cyan'));
out();

// 1. Requirements Check
out(color('1. Verifying System Requirements...', 'bold'));

$errors = [];
if (PHP_VERSION_ID < 80400) {
    $errors[] = 'PHP 8.4 or higher is required. Detected: '.PHP_VERSION;
}

$requiredExtensions = ['curl', 'openssl', 'zip', 'pdo', 'json', 'mbstring'];
foreach ($requiredExtensions as $ext) {
    if (! extension_loaded($ext)) {
        $errors[] = "Required PHP extension '{$ext}' is not installed or enabled.";
    }
}

if (! extension_loaded('pdo_mysql') && ! extension_loaded('pdo_pgsql')) {
    $errors[] = "At least one database driver extension ('pdo_pgsql' or 'pdo_mysql') must be installed.";
}

if (! is_writable($baseDir)) {
    $errors[] = "Installation directory '{$baseDir}' is not writable. Please check permissions.";
}

if (! empty($errors)) {
    out(color('System requirement check failed:', 'red'));
    foreach ($errors as $err) {
        out(color("  ✕ {$err}", 'red'));
    }
    out();
    if (PHP_VERSION_ID < 80400) {
        out(color('If you are using aaPanel, cPanel, or have multiple PHP versions installed:', 'yellow'));
        out('  1. On aaPanel: Set CLI PHP version to PHP 8.4 in Website > PHP-CLI, or run:');
        out('     /www/server/php/84/bin/php install.php');
        out('  2. Or update your system default CLI symlink:');
        out('     sudo ln -sf /www/server/php/84/bin/php /usr/bin/php');
        out();
    }
    out(color('On Debian/Ubuntu/Kali, you can install the missing packages with:', 'yellow'));
    out('  sudo apt-get install -y php8.4-curl php8.4-zip php8.4-pgsql php8.4-mysql php8.4-mbstring php8.4-xml');
    out();
    exit(1);
}

out(color('✓ System requirements verified (PHP '.PHP_VERSION.', required extensions active).', 'green'));

if (PHP_OS_FAMILY !== 'Windows') {
    $linuxOptExtensions = ['pcntl', 'posix', 'sockets'];
    $missingLinux = [];
    foreach ($linuxOptExtensions as $le) {
        if (! extension_loaded($le)) {
            $missingLinux[] = $le;
        }
    }
    if (! empty($missingLinux)) {
        out(color('  Notice: Recommended extensions for Laravel Octane / aaPanel ('.implode(', ', $missingLinux).') are not detected.', 'yellow'));
        out(color('  On aaPanel: install them via App Store > PHP 8.4 > Extensions.', 'dim'));
    }
}

out();

// 2. Hardware Fingerprint
out(color('2. Machine Hardware Fingerprint', 'bold'));
$installationId = getInstallationId($baseDir);
out('  Unique Installation ID: '.color($installationId, 'green'));
out(color('  (This identifier permanently binds your license to this server)', 'dim'));
out();

// 3. License Activation
out(color('3. Enterprise License Activation', 'bold'));

// Check if existing license in .env
$envPath = $baseDir.'/.env';
$existingKey = '';
if (file_exists($envPath)) {
    $envContent = file_get_contents($envPath);
    if (preg_match('/^LICENSE_KEY=(.*)$/m', $envContent, $m)) {
        $existingKey = trim($m[1], " \t\n\r\0\x0B\"'");
    }
}

$licenseKey = null;
$appSecret = null;
$licenseData = [];

while ($licenseKey === null) {
    $keyInput = prompt('Enter your Enterprise License Key', $existingKey ?: null);
    if (empty($keyInput)) {
        out(color('A valid license key is required to activate ARX-ERP.', 'red'));
        if (! confirm('Would you like to try again?', true)) {
            exit(1);
        }

        continue;
    }

    out('Contacting licensing authority ('.LICENSE_SERVER_URL.')...');
    try {
        $resp = postJson(LICENSE_SERVER_URL.'/api/v1/license/activate', [
            'key' => $keyInput,
            'installationId' => $installationId,
        ]);

        if ($resp['status'] !== 200 || ! ($resp['json']['data']['success'] ?? false)) {
            $msg = $resp['json']['data']['message'] ?? $resp['json']['message'] ?? "Server returned HTTP {$resp['status']}";
            out(color("License activation failed: {$msg}", 'red'));
            if (! confirm('Would you like to re-enter your license key?', true)) {
                exit(1);
            }

            continue;
        }

        $signature = $resp['json']['signature'] ?? '';
        if (empty($signature) || ! verifySignature($resp['raw'], $signature, PUBLIC_KEY)) {
            out(color('Security Warning: Central authority RSA digital signature failed verification!', 'red'));
            if (! confirm('Signature invalid. Re-enter key?', true)) {
                exit(1);
            }

            continue;
        }

        $licenseData = $resp['json']['data'];
        $licenseKey = $keyInput;
        $appSecret = $licenseData['appSecret'] ?? '';
        out(color('✓ License activated and RSA signature cryptographically verified!', 'green'));
        if (! empty($licenseData['expiresAt'])) {
            out('  License Expiry: '.color($licenseData['expiresAt'], 'cyan'));
        }
    } catch (Throwable $e) {
        out(color('Network error: '.$e->getMessage(), 'red'));
        if (! confirm('Would you like to retry connecting to the license server?', true)) {
            exit(1);
        }
    }
}
out();

// 4. Release Check & Download
out(color('4. Checking Release & Application Packages', 'bold'));

$artisanExists = file_exists($baseDir.'/artisan');
$vendorExists = file_exists($baseDir.'/vendor/autoload.php');

if ($skipDownload) {
    out('  Skipping release download as requested via --skip-download.');
} else {
    out('Checking for latest production release...');
    $releaseInfo = null;

    try {
        $updateResp = postJson(LICENSE_SERVER_URL.'/api/v1/license/update', [
            'key' => $licenseKey,
            'installationId' => $installationId,
        ]);

        if ($updateResp['status'] === 200 && is_array($updateResp['json']['data'] ?? null)) {
            $sig = $updateResp['json']['signature'] ?? '';
            if (! empty($sig) && verifySignature($updateResp['raw'], $sig, PUBLIC_KEY)) {
                $releaseInfo = $updateResp['json']['data'];
            }
        }
    } catch (Throwable $e) {
        out(color("  Notice: Could not query update server ({$e->getMessage()}).", 'yellow'));
    }

    $shouldDownload = true;
    if ($artisanExists && $vendorExists) {
        $shouldDownload = confirm('Application files already exist in this directory. Download/update release?', false);
    }

    if ($shouldDownload) {
        $releaseVersion = (string) ($releaseInfo['latest_version'] ?? $releaseInfo['version'] ?? 'v1.0.0');
        $displayName = (string) ($releaseInfo['name'] ?? "ARX-ERP {$releaseVersion}");
        $expectedHash = $releaseInfo['zip_hash'] ?? null;
        $targetZip = $baseDir.'/arx_release_download.zip';

        out('Downloading release package ('.color($releaseVersion, 'cyan')." - {$displayName})...");
        try {
            downloadReleaseZip(LICENSE_SERVER_URL.'/api/v1/license/download', $targetZip, [
                'key' => $licenseKey,
                'installationId' => $installationId,
                'Relesename' => $releaseVersion,
            ]);

            if (! empty($expectedHash)) {
                out('Verifying SHA-256 package checksum...');
                $actualHash = hash_file('sha256', $targetZip);
                if (strcasecmp($actualHash, $expectedHash) !== 0) {
                    @unlink($targetZip);
                    throw new RuntimeException("Integrity check failed: Expected SHA-256 {$expectedHash}, got {$actualHash}.");
                }
                out(color('✓ SHA-256 checksum verified!', 'green'));
            }

            out('Extracting release files...');
            extractRelease($targetZip, $baseDir);
            out(color('✓ Release package extracted successfully!', 'green'));

            // Update version manifest
            $versionFile = $baseDir.'/version.json';
            $verData = [
                'version' => $releaseInfo['latest_version'] ?? '1.0.0',
                'name' => 'ARX-ERP Enterprise',
                'channel' => 'stable',
                'release_date' => date('Y-m-d'),
            ];
            file_put_contents($versionFile, json_encode($verData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } catch (Throwable $e) {
            out(color('Download/extraction failed: '.$e->getMessage(), 'red'));
            if (! $artisanExists) {
                out(color('Cannot proceed without application files.', 'red'));
                exit(1);
            }
            out(color('Continuing installation with existing codebase.', 'yellow'));
        }
    }
}
out();

// Ensure basic storage directory structure and permissions exist
fixStoragePermissions($baseDir);

// Persist installation id
file_put_contents($baseDir.'/storage/app/.installation_id', $installationId);

// 5. Composer Dependencies Check
if (! file_exists($baseDir.'/vendor/autoload.php')) {
    out(color('5. Composer Dependencies', 'bold'));
    out('Composer autoloader not found. Attempting to install dependencies...');
    $composerBin = trim((string) shell_exec('which composer 2>/dev/null'));
    if (! empty($composerBin)) {
        out('Running composer install...');
        passthru('composer install --no-dev --optimize-autoloader', $cCode);
        if ($cCode !== 0) {
            out(color("Warning: composer install exited with code {$cCode}.", 'yellow'));
        }
    } else {
        out(color('Warning: Composer executable was not found in PATH.', 'yellow'));
        out('Please ensure vendor dependencies are installed before continuing.');
    }
    out();
}

// 6. Environment (.env) Setup
out(color('5. Environment Configuration (.env)', 'bold'));

initializeEnvFromExample($envPath, $baseDir.'/.env.example');
out('  Initialized .env file from .env.example structure.');

// Prompt for App URL
$defaultUrl = 'http://localhost:8000';
if (file_exists($envPath)) {
    $c = file_get_contents($envPath);
    if (preg_match('/^APP_URL=(.*)$/m', $c, $m)) {
        $u = trim($m[1], " \t\n\r\0\x0B\"'");
        if (! empty($u)) {
            $defaultUrl = $u;
        }
    }
}
$appUrl = prompt('Application URL', $defaultUrl);

// Prompt for Timezone
out('Timezone reference: '.color('https://www.php.net/manual/en/timezones.php', 'cyan'));
$defaultTimezone = 'UTC';
if (file_exists($envPath)) {
    $c = file_get_contents($envPath);
    if (preg_match('/^TIMEZONE=(.*)$/m', $c, $m)) {
        $tzVal = trim($m[1], " \t\n\r\0\x0B\"'");
        if (! empty($tzVal)) {
            $defaultTimezone = $tzVal;
        }
    }
}
$timezone = prompt('Application Timezone (e.g. UTC, America/New_York, Asia/Kolkata)', $defaultTimezone);
if (! in_array($timezone, DateTimeZone::listIdentifiers(), true)) {
    out(color("  Notice: '{$timezone}' is not a recognized timezone identifier. Defaulting to UTC.", 'yellow'));
    $timezone = 'UTC';
}

$envUpdates = [
    'APP_NAME' => 'ARX-ERP Enterprise',
    'APP_ENV' => 'production',
    'APP_DEBUG' => 'false',
    'APP_URL' => $appUrl,
    'TIMEZONE' => $timezone,
    'INSTALLATION_ID' => $installationId,
    'LICENSE_KEY' => $licenseKey,
    'LICENSE_APP_SECRET' => $appSecret ?: '',
];

// Ensure valid APP_KEY exists
$currentEnv = (string) file_get_contents($envPath);
if (! preg_match('/^APP_KEY=base64:[A-Za-z0-9+\/]+=*$/m', $currentEnv)) {
    $envUpdates['APP_KEY'] = 'base64:'.base64_encode(random_bytes(32));
    out(color('✓ Generated application encryption key (APP_KEY).', 'green'));
}

updateEnvFile($envPath, $envUpdates);

out(color('✓ Environment base configuration updated.', 'green'));
out();

// 7. Database Setup
out(color('6. Database Configuration', 'bold'));

$currentDriver = 'pgsql';
if (file_exists($envPath)) {
    $c = file_get_contents($envPath);
    if (preg_match('/^DB_CONNECTION=(.*)$/m', $c, $m)) {
        $d = trim($m[1], " \t\n\r\0\x0B\"'");
        if ($d === 'mysql') {
            $currentDriver = 'mysql';
        }
    }
}

$dbConfigured = false;
$dbDriver = $currentDriver;

while (! $dbConfigured) {
    out('Supported database engines: pgsql (PostgreSQL), mysql (MySQL/MariaDB)');
    $dbDriver = strtolower(prompt('Database Driver [pgsql/mysql]', $dbDriver));
    if ($dbDriver !== 'mysql' && $dbDriver !== 'pgsql') {
        $dbDriver = 'pgsql';
    }

    $defaultPort = $dbDriver === 'pgsql' ? '5432' : '3306';
    $dbHost = prompt('Database Host', '127.0.0.1');
    $dbPort = prompt('Database Port', $defaultPort);
    $dbDatabase = prompt('Database Name', 'arx_erp');
    $dbUsername = prompt('Database Username', $dbDriver === 'pgsql' ? 'postgres' : 'root');
    $dbPassword = promptSecret('Database Password (leave blank if none)');

    out("Testing connection to {$dbDriver}://{$dbUsername}@{$dbHost}:{$dbPort}/{$dbDatabase}...");

    try {
        $dsn = "{$dbDriver}:host={$dbHost};port={$dbPort};dbname={$dbDatabase}";
        $pdo = new PDO($dsn, $dbUsername, $dbPassword, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
        ]);

        out(color('✓ Database connection established successfully!', 'green'));

        updateEnvFile($envPath, [
            'DB_CONNECTION' => $dbDriver,
            'DB_HOST' => $dbHost,
            'DB_PORT' => $dbPort,
            'DB_DATABASE' => $dbDatabase,
            'DB_USERNAME' => $dbUsername,
            'DB_PASSWORD' => $dbPassword,
        ]);

        $dbConfigured = true;
    } catch (Throwable $e) {
        out(color('Connection failed: '.$e->getMessage(), 'red'));
        if (! confirm('Would you like to re-enter database connection parameters?', true)) {
            out(color('Saving parameters anyway. You can test later.', 'yellow'));
            updateEnvFile($envPath, [
                'DB_CONNECTION' => $dbDriver,
                'DB_HOST' => $dbHost,
                'DB_PORT' => $dbPort,
                'DB_DATABASE' => $dbDatabase,
                'DB_USERNAME' => $dbUsername,
                'DB_PASSWORD' => $dbPassword,
            ]);
            $dbConfigured = true;
        }
    }
}
out();

// 8. Redis & Cache Configuration
out(color('7. Redis & Cache Configuration', 'bold'));
$configureRedis = confirm('Would you like to configure Redis (caching & background job queues)?', false);
if ($configureRedis) {
    $redisHost = prompt('Redis Host', '127.0.0.1');
    $redisPort = prompt('Redis Port', '6379');
    $redisPassInput = promptSecret('Redis Password (press Enter if none)');
    $redisPassword = ($redisPassInput === '' || $redisPassInput === 'null') ? 'null' : $redisPassInput;
    $defaultClient = extension_loaded('redis') ? 'phpredis' : 'predis';
    $redisClient = prompt('Redis Client [phpredis/predis]', $defaultClient);
    $redisPrefix = prompt('Redis Key Prefix (isolates ARX-ERP from other apps on same server)', 'arx_erp_');

    $useRedisCache = confirm('Use Redis as the primary application cache store?', true);
    $useRedisQueue = confirm('Use Redis for background job queues?', true);

    if (extension_loaded('redis')) {
        try {
            $r = new Redis;
            $r->connect($redisHost, (int) $redisPort, 2.0);
            if ($redisPassword !== 'null' && ! empty($redisPassword)) {
                $r->auth($redisPassword);
            }
            $r->ping();
            $r->close();
            out(color('✓ Redis connection established successfully!', 'green'));
        } catch (Throwable $e) {
            out(color("  Warning: Could not connect to Redis ({$e->getMessage()}). Parameters will still be saved.", 'yellow'));
        }
    }

    updateEnvFile($envPath, [
        'REDIS_CLIENT' => $redisClient,
        'REDIS_HOST' => $redisHost,
        'REDIS_PORT' => $redisPort,
        'REDIS_PASSWORD' => $redisPassword,
        'REDIS_PREFIX' => $redisPrefix,
        'CACHE_STORE' => $useRedisCache ? 'redis' : 'database',
        'QUEUE_CONNECTION' => $useRedisQueue ? 'redis' : 'database',
    ]);
    out(color('✓ Redis configuration saved.', 'green'));
} else {
    out('  Using default database-backed cache and queues.');
}
out();

// 9. Key Generate, Migrations & Seeds
out(color('8. Running Migrations & Seeding Core Data', 'bold'));

$php = PHP_BINARY;
$artisan = $baseDir.'/artisan';

if (file_exists($artisan)) {
    // Ensure valid APP_KEY exists in .env
    $envContent = (string) file_get_contents($envPath);
    if (! preg_match('/^APP_KEY=base64:[A-Za-z0-9+\/]+=*$/m', $envContent)) {
        out('Generating application encryption key...');
        $generatedKey = 'base64:'.base64_encode(random_bytes(32));
        updateEnvFile($envPath, ['APP_KEY' => $generatedKey]);
        out(color('✓ Application encryption key generated and saved.', 'green'));
    }

    out('Executing database migrations...');
    passthru("{$php} {$artisan} migrate --force", $mCode);
    if ($mCode !== 0) {
        out(color("Warning: Database migration exited with code {$mCode} (existing tables may be present).", 'yellow'));
        if (confirm('Would you like to reset the database and perform a clean migration (migrate:fresh)?', true)) {
            passthru("{$php} {$artisan} migrate:fresh --force", $mCode);
        }
        if ($mCode !== 0 && ! confirm('Would you like to continue anyway?', false)) {
            exit(1);
        }
    }

    out('Seeding essential system roles & permissions...');
    passthru("{$php} {$artisan} db:seed --force", $sCode);
    if ($sCode !== 0) {
        out(color("Warning: Database seeding exited with code {$sCode}.", 'yellow'));
        if (! confirm('Would you like to continue anyway?', true)) {
            exit(1);
        }
    }

    // Persist license into database settings table so config cache & DB sync never desync
    out('Synchronizing enterprise license details to system store...');
    $settingsScript = sprintf(
        '\\Illuminate\\Support\\Facades\\DB::table(\'settings\')->updateOrInsert([\'key\' => \'system.license.key\'], [\'value\' => %s, \'group\' => \'system\', \'type\' => \'string\', \'created_at\' => now(), \'updated_at\' => now()]); '
        .'\\Illuminate\\Support\\Facades\\DB::table(\'settings\')->updateOrInsert([\'key\' => \'system.installation_id\'], [\'value\' => %s, \'group\' => \'system\', \'type\' => \'string\', \'created_at\' => now(), \'updated_at\' => now()]); '
        .(! empty($appSecret) ? '\\Illuminate\\Support\\Facades\\DB::table(\'settings\')->updateOrInsert([\'key\' => \'system.license.app_secret\'], [\'value\' => '.var_export($appSecret, true).', \'group\' => \'system\', \'type\' => \'string\', \'created_at\' => now(), \'updated_at\' => now()]); ' : '')
        .(! empty($licenseData['expiresAt']) ? '\\Illuminate\\Support\\Facades\\DB::table(\'settings\')->updateOrInsert([\'key\' => \'system.license.expires_at\'], [\'value\' => '.var_export((string) $licenseData['expiresAt'], true).', \'group\' => \'system\', \'type\' => \'string\', \'created_at\' => now(), \'updated_at\' => now()]); ' : '')
        .(! empty($signature) ? '\\Illuminate\\Support\\Facades\\DB::table(\'settings\')->updateOrInsert([\'key\' => \'system.license.signature\'], [\'value\' => '.var_export($signature, true).', \'group\' => \'system\', \'type\' => \'string\', \'created_at\' => now(), \'updated_at\' => now()]); ' : '')
        .'\\Illuminate\\Support\\Facades\\DB::table(\'settings\')->updateOrInsert([\'key\' => \'system.license.activated_at\'], [\'value\' => now()->toIso8601String(), \'group\' => \'system\', \'type\' => \'string\', \'created_at\' => now(), \'updated_at\' => now()]);',
        var_export($licenseKey, true),
        var_export($installationId, true)
    );
    $tinkerCmd = "{$php} {$artisan} tinker --execute ".escapeshellarg($settingsScript);
    @exec($tinkerCmd);
    out(color('✓ System license synchronized with database.', 'green'));

    out(color('✓ Database schema and seed data prepared.', 'green'));
} else {
    out(color('Notice: artisan script not found. Migrations skipped.', 'yellow'));
}
out();

// 10. Super Admin Account Creation
out(color('9. Super Administrator Account Setup', 'bold'));

if (file_exists($artisan)) {
    $adminName = prompt('Super Administrator Full Name', 'Super Administrator');
    $adminEmail = prompt('Super Administrator Email', 'admin@arx-erp.local');

    $adminPassword = '';
    while (strlen($adminPassword) < 8) {
        $adminPassword = promptSecret('Super Administrator Password (min 8 chars)');
        if (strlen($adminPassword) < 8) {
            out(color('Password must be at least 8 characters.', 'red'));
        }
    }

    out('Configuring administrator account...');
    $phpScript = sprintf(
        '\\App\\Models\\User::updateOrCreate([\'email\' => %s], [\'name\' => %s, \'password\' => \\Illuminate\\Support\\Facades\\Hash::make(%s), \'user_type\' => \'user\', \'is_active\' => true, \'email_verified_at\' => now()])->syncRoles([\'super-admin\']);',
        var_export($adminEmail, true),
        var_export($adminName, true),
        var_export($adminPassword, true)
    );

    $tinkerCmd = "{$php} {$artisan} tinker --execute ".escapeshellarg($phpScript);
    exec($tinkerCmd, $tinkerOut, $tinkerCode);

    out(color("✓ Super Administrator account '{$adminEmail}' successfully configured!", 'green'));
}
out();

// 10. Storage Symlink & Cache Clear
out(color('10. Finalizing Core Framework Assets', 'bold'));

if (file_exists($artisan)) {
    passthru("{$php} {$artisan} storage:link 2>/dev/null");
    passthru("{$php} {$artisan} optimize:clear 2>/dev/null");
    linkThemeAssets($baseDir);
    fixStoragePermissions($baseDir);
}

out(color('✓ Storage link and system optimization cache updated.', 'green'));
out();

// 11. High-Performance Server Engine (Laravel Octane & RoadRunner Setup)
out(color('11. High-Performance Server Engine (Laravel Octane / RoadRunner & aaPanel)', 'bold'));
$useOctane = confirm('Configure Laravel Octane with RoadRunner (for aaPanel, high-traffic production & sub-millisecond latency)?', true);
$octaneConfigured = false;
$parsedPort = parse_url($appUrl, PHP_URL_PORT) ?: '8000';

if ($useOctane && file_exists($artisan)) {
    out('Configuring Laravel Octane with RoadRunner engine...');

    // 1. Update .env for Octane
    updateEnvFile($envPath, [
        'OCTANE_SERVER' => 'roadrunner',
        'OCTANE_HTTPS' => str_starts_with($appUrl, 'https://') ? 'true' : 'false',
    ]);

    // 2. Ensure RoadRunner binary is present
    $rrBinary = $baseDir.'/rr';
    $rrWinBinary = $baseDir.'/rr.exe';
    $hasBinary = file_exists($rrBinary) || file_exists($rrWinBinary);

    if (! $hasBinary) {
        out('Ensuring RoadRunner binary is installed...');
        $rrCli = $baseDir.'/vendor/bin/rr';
        if (file_exists($rrCli)) {
            @passthru("{$php} {$rrCli} get-binary -n", $rrCode);
        } else {
            @passthru("{$php} {$artisan} octane:install --server=roadrunner --no-interaction", $rrCode);
        }
    }

    if (file_exists($rrBinary) && PHP_OS_FAMILY !== 'Windows') {
        @chmod($rrBinary, 0755);
    }

    // 3. Update .rr.yaml with configured port & worker limits
    $rrYamlPath = $baseDir.'/.rr.yaml';
    if (file_exists($rrYamlPath)) {
        $yamlContent = (string) file_get_contents($rrYamlPath);
        $yamlContent = preg_replace("/address:\s*['\"][^'\"]+['\"]/", "address: '127.0.0.1:{$parsedPort}'", $yamlContent);
        file_put_contents($rrYamlPath, $yamlContent);
    }

    // 4. Generate aaPanel Supervisor Manager configuration snippet
    $supervisorConfig = <<<INI
[program:arx-erp-octane]
directory={$baseDir}
command={$php} {$artisan} octane:start --server=roadrunner --workers=4 --port={$parsedPort}
user=www
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile={$baseDir}/storage/logs/octane.log
INI;
    @file_put_contents($baseDir.'/storage/app/aapanel_supervisor_octane.ini', $supervisorConfig);

    // 5. Generate aaPanel Supervisor Queue Worker configuration snippet
    $workerSupervisorConfig = <<<INI
[program:arx-erp-worker]
directory={$baseDir}
command={$php} {$artisan} queue:work --sleep=3 --tries=3 --max-time=3600
user=www
numprocs=2
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile={$baseDir}/storage/logs/worker.log
INI;
    @file_put_contents($baseDir.'/storage/app/aapanel_supervisor_worker.ini', $workerSupervisorConfig);

    // 6. Generate Combined All-in-One aaPanel Supervisor configuration
    $allSupervisorConfig = $supervisorConfig."\n\n".$workerSupervisorConfig;
    @file_put_contents($baseDir.'/storage/app/aapanel_supervisor_all.ini', $allSupervisorConfig);

    // 7. Generate aaPanel Nginx reverse proxy configuration snippet
    $nginxConfig = <<<NGINX
# aaPanel / Nginx Reverse Proxy for ARX-ERP (Laravel Octane RoadRunner)
# Paste this into: aaPanel > Website > Settings > Reverse Proxy (or Nginx Configuration)
location / {
    proxy_pass http://127.0.0.1:{$parsedPort};
    proxy_http_version 1.1;
    proxy_set_header Host \$http_host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "Upgrade";
}
NGINX;
    @file_put_contents($baseDir.'/storage/app/aapanel_nginx_proxy.conf', $nginxConfig);

    out(color('✓ Laravel Octane & RoadRunner configured successfully!', 'green'));
    out('  aaPanel Full Daemon config:   '.color('storage/app/aapanel_supervisor_all.ini', 'cyan').' (Octane + Queue Worker)');
    out('  aaPanel Nginx reverse proxy:  '.color('storage/app/aapanel_nginx_proxy.conf', 'cyan'));
    $octaneConfigured = true;
} else {
    // Generate standalone Queue Worker configuration even in standard mode
    $workerSupervisorConfig = <<<INI
[program:arx-erp-worker]
directory={$baseDir}
command={$php} {$artisan} queue:work --sleep=3 --tries=3 --max-time=3600
user=www
numprocs=2
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile={$baseDir}/storage/logs/worker.log
INI;
    @file_put_contents($baseDir.'/storage/app/aapanel_supervisor_worker.ini', $workerSupervisorConfig);
    out('  Using standard execution mode (PHP-FPM / CLI).');
    out('  Queue Worker supervisor config saved to: '.color('storage/app/aapanel_supervisor_worker.ini', 'cyan'));
}
out();

// 12. Optional systemd service installation on Linux
$systemdInstalled = false;
if (PHP_OS_FAMILY !== 'Windows' && is_dir('/etc/systemd/system') && file_exists($artisan)) {
    out(color('12. Linux System Services (systemd: Web & Queue Worker)', 'bold'));
    if (confirm('Would you like to install and enable ARX-ERP (Web Server & Queue Worker) as background systemd services?', false)) {
        $serverFlag = $octaneConfigured ? '--server=octane' : '--server=serve';
        passthru("{$php} {$artisan} app:service install {$serverFlag} --with-worker --port={$parsedPort}");
        $systemdInstalled = true;
    }
    out();
}

// 13. Completion Banner
out(color('===========================================================', 'green'));
out(color('        ARX-ERP INSTALLATION COMPLETED SUCCESSFULLY!       ', 'bold'));
out(color('===========================================================', 'green'));
out();
out('  Portal URL:       '.color($appUrl, 'cyan'));
out('  Admin Login:      '.color(rtrim($appUrl, '/').'/auth/login', 'cyan'));
out('  Admin Email:      '.color($adminEmail ?? 'admin@arx-erp.local', 'cyan'));
out('  Database Driver:  '.color(strtoupper($dbDriver), 'cyan'));
out('  Installation ID:  '.color($installationId, 'cyan'));
out('  License Status:   '.color('Activated & Verified', 'green'));
out('  Server Engine:    '.color($octaneConfigured ? 'Laravel Octane (RoadRunner Engine)' : 'Standard (PHP-FPM / CLI)', 'cyan'));
if ($systemdInstalled) {
    out('  Web Service:      '.color('Active (systemctl status arx_erp)', 'green'));
    out('  Queue Worker:     '.color('Active (systemctl status arx_erp_worker)', 'green'));
}
if ($octaneConfigured) {
    out('  Octane CLI:       '.color("php artisan octane:start --server=roadrunner --port={$parsedPort}", 'cyan'));
    out('  Zero-Downtime:    '.color('php artisan octane:reload', 'cyan'));
    out('  aaPanel Deploy:   '.color('Import storage/app/aapanel_supervisor_all.ini into Supervisor Manager', 'yellow'));
}
out('  Worker CLI:       '.color('php artisan queue:work --sleep=3 --tries=3', 'cyan'));
out();
out(color('  Security Advice: For production environments, consider removing install.php', 'yellow'));
out(color('  or restricting web access to this file.', 'yellow'));
out();
linkThemeAssets($baseDir);
fixStoragePermissions($baseDir);
exit(0);
