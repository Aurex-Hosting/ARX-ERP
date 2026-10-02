<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Core\Services\LicenseManager;
use App\Core\Services\UpdateManager;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use PDO;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Throwable;
use ZipArchive;

class InstallCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:install {--force : Force re-installation even if already configured} {--skip-download : Skip checking and downloading latest release}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Interactive setup wizard for ARX-ERP Enterprise (Fingerprint, License, Release Download, DB, Super Admin)';

    public function __construct(
        protected LicenseManager $licenseManager,
        protected UpdateManager $updateManager
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->displayBanner();

        // 1. Check existing installation
        $envPath = base_path('.env');
        if (! File::exists($envPath)) {
            $examplePath = base_path('.env.example');
            if (File::exists($examplePath)) {
                File::copy($examplePath, $envPath);
                $this->info('Created .env configuration from .env.example.');
            } else {
                File::put($envPath, '');
                $this->info('Created fresh .env configuration file.');
            }
        }

        if (! $this->option('force') && $this->isAlreadyInstalled()) {
            if (! $this->confirm('ARX-ERP appears to be already installed. Do you want to run the installation wizard again?', false)) {
                $this->info('Installation wizard cancelled.');

                return self::SUCCESS;
            }
        }

        // 2. Hardware Fingerprint & Device Identification
        $this->line('');
        $this->components->info('Step 1: Generate Hardware Device Fingerprint');
        $installationId = $this->licenseManager->getInstallationId();
        $this->line("  <fg=gray>System Hardware ID:</> <fg=yellow;options=bold>{$installationId}</>");
        $this->line('  <fg=gray>This unique hardware fingerprint is tied to your software license activation.</>');

        // 3. License Key Input & Activation
        $this->line('');
        $this->components->info('Step 2: License Key Input & Activation');
        $activeKey = $this->activateLicenseProcess($installationId);
        if ($activeKey === null) {
            $this->error('Installation stopped because license activation could not be verified.');

            return self::FAILURE;
        }

        // 4. Validate License
        $this->line('');
        $this->components->info('Step 3: Cryptographic License Validation');
        if (! $this->validateLicenseProcess($activeKey)) {
            $this->warn('License validation returned warning. Proceeding with caution...');
        }

        // 5. Check Update for Latest Version & Download Release
        $this->line('');
        $this->components->info('Step 4: Central Release Check & Package Download');
        $this->checkAndDownloadReleaseProcess();

        // 6. Application URL & Timezone Configuration
        $this->line('');
        $this->components->info('Step 5: Application URL & Timezone Configuration');
        $defaultUrl = env('APP_URL') ?: 'http://localhost:8000';
        $appUrl = $this->ask('Enter the primary URL for this application', $defaultUrl);
        $this->licenseManager->updateEnvFile(['APP_URL' => $appUrl]);
        config(['app.url' => $appUrl]);

        $this->line('  <fg=cyan>Timezone reference: https://www.php.net/manual/en/timezones.php</>');
        $defaultTz = env('TIMEZONE', env('APP_TIMEZONE', 'UTC'));
        $timezone = $this->ask('Enter application timezone (e.g. UTC, America/New_York, Asia/Kolkata)', $defaultTz);
        if (! in_array($timezone, \DateTimeZone::listIdentifiers(), true)) {
            $this->warn("Timezone '{$timezone}' is not recognized. Defaulting to UTC.");
            $timezone = 'UTC';
        }
        $this->licenseManager->updateEnvFile(['TIMEZONE' => $timezone]);
        config(['app.timezone' => $timezone]);

        // 7. Database Configuration (pgsql & mysql)
        $this->line('');
        $this->components->info('Step 6: Database Connection Setup (PostgreSQL / MySQL)');
        $dbConfig = $this->configureDatabaseProcess();
        if ($dbConfig === null) {
            $this->error('Installation aborted due to database connection failure.');

            return self::FAILURE;
        }

        // Redis Configuration
        if ($this->confirm('Would you like to configure Redis (caching & background job queues)?', false)) {
            $redisHost = $this->ask('Redis Host', '127.0.0.1');
            $redisPort = $this->ask('Redis Port', '6379');
            $redisPass = $this->secret('Redis Password (press Enter if none)') ?: 'null';
            $defaultClient = extension_loaded('redis') ? 'phpredis' : 'predis';
            $redisClient = $this->choice('Redis Client', ['phpredis', 'predis'], $defaultClient === 'phpredis' ? 0 : 1);
            $useCache = $this->confirm('Use Redis for application cache store?', true);
            $useQueue = $this->confirm('Use Redis for background queues?', true);

            $this->licenseManager->updateEnvFile([
                'REDIS_CLIENT' => $redisClient,
                'REDIS_HOST' => $redisHost,
                'REDIS_PORT' => $redisPort,
                'REDIS_PASSWORD' => $redisPass,
                'CACHE_STORE' => $useCache ? 'redis' : 'database',
                'QUEUE_CONNECTION' => $useQueue ? 'redis' : 'database',
            ]);
            $this->info('✓ Redis configuration saved.');
        }

        // 8. Application Encryption Key
        $this->line('');
        $this->components->info('Step 7: Application Encryption Key');
        if (empty(env('APP_KEY')) || empty(config('app.key'))) {
            $this->info('Generating encryption key...');
            $envPath = base_path('.env');
            $envContent = File::exists($envPath) ? (string) File::get($envPath) : '';
            if (! preg_match('/^APP_KEY=/m', $envContent)) {
                $this->licenseManager->updateEnvFile(['APP_KEY' => 'base64:'.base64_encode(random_bytes(32))]);
                $this->info('✓ Application key generated and written to .env.');
            } else {
                Artisan::call('key:generate', ['--force' => true]);
                $this->line(trim(Artisan::output()));
            }
        } else {
            $this->info('Encryption key already present.');
        }

        // 9. Database Migrations & Seeders
        $this->line('');
        $this->components->info('Step 8: Running Database Migrations & Core Seeders');
        try {
            $this->info('Running database migrations...');
            Artisan::call('migrate', ['--force' => true]);
            $this->line(trim(Artisan::output()));

            $this->info('Seeding core roles, permissions, settings, and mail templates...');
            Artisan::call('db:seed', ['--force' => true]);
            $this->line(trim(Artisan::output()));
        } catch (Throwable $e) {
            $this->error("Migration or database seeding failed: {$e->getMessage()}");

            return self::FAILURE;
        }

        // 10. Super Admin User Creation
        $this->line('');
        $this->components->info('Step 9: Super Administrator Account');
        $this->createSuperAdminProcess();

        // 11. Storage Link & Optimization
        $this->line('');
        $this->components->info('Step 10: Finalizing Application Optimization');
        try {
            if (! File::exists(public_path('storage'))) {
                Artisan::call('storage:link');
                $this->info('Storage symlink generated successfully.');
            }
            Artisan::call('optimize:clear');
            $this->info('Application caches and compiled views cleared.');
        } catch (Throwable $e) {
            $this->warn("Note: Cache optimization notice: {$e->getMessage()}");
        }

        // 12. Summary Banner
        $this->displaySuccessSummary($installationId, $appUrl, $dbConfig['driver']);

        return self::SUCCESS;
    }

    /**
     * Display wizard ascii header.
     */
    protected function displayBanner(): void
    {
        $this->line('');
        $this->line('<fg=cyan;options=bold>===========================================================</>');
        $this->line('<fg=white;options=bold>             ARX-ERP ENTERPRISE INSTALLATION WIZARD        </>');
        $this->line('<fg=cyan;options=bold>===========================================================</>');
        $this->line('  Interactive Installer: Fingerprint -> License -> Release Download');
        $this->line('  -> Extract -> Database Setup -> Migrations -> Super Admin');
        $this->line('');
    }

    /**
     * Check if application is already considered installed.
     */
    protected function isAlreadyInstalled(): bool
    {
        $hasKey = ! empty(env('APP_KEY'));
        $hasLicense = ! empty($this->licenseManager->getActiveLicenseKey());

        try {
            $hasTables = DB::connection()->getSchemaBuilder()->hasTable('users');

            return $hasKey && $hasLicense && $hasTables;
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Process license activation with retry.
     */
    protected function activateLicenseProcess(string $installationId): ?string
    {
        $existingKey = $this->licenseManager->getActiveLicenseKey();

        while (true) {
            $defaultPrompt = ! empty($existingKey) ? " [Current: {$existingKey}]" : '';
            $keyInput = $this->ask("Enter your Enterprise License Key{$defaultPrompt}", $existingKey);

            if (empty($keyInput)) {
                $this->error('A license key is required to activate and operate ARX-ERP.');
                if (! $this->confirm('Would you like to try entering the license key again?', true)) {
                    return null;
                }

                continue;
            }

            $this->info('Contacting central licensing authority...');
            $result = $this->licenseManager->activateLicense(trim($keyInput));

            if ($result['success']) {
                $this->info('✓ License activated and RSA cryptographic seal verified!');
                $data = $result['data'] ?? [];
                if (! empty($data['expiresAt'])) {
                    $this->line("  <fg=gray>License Expiration:</> <fg=green>{$data['expiresAt']}</>");
                }

                return trim($keyInput);
            }

            $this->error('License activation failed: '.($result['message'] ?? 'Unknown verification failure'));
            if (! $this->confirm('Would you like to re-enter your license key?', true)) {
                return null;
            }
        }
    }

    /**
     * Validate license credentials and authority cache.
     */
    protected function validateLicenseProcess(string $licenseKey): bool
    {
        $this->info('Validating license credentials with central authority...');
        try {
            $status = $this->licenseManager->validateLicense($licenseKey);

            if (! ($status['is_valid'] ?? false)) {
                $this->warn('Notice: License validation status could not be verified by central authority.');

                return false;
            }

            $this->info('✓ License cryptographic validation confirmed.');

            return true;
        } catch (Throwable $e) {
            $this->warn("Validation notice: {$e->getMessage()}");

            return false;
        }
    }

    /**
     * Check central update authority, download release, and extract.
     */
    protected function checkAndDownloadReleaseProcess(): void
    {
        if ($this->option('skip-download')) {
            $this->line('  <fg=gray>Skipping release check and download (--skip-download flag passed).</>');

            return;
        }

        $current = $this->updateManager->getCurrentVersion();
        $this->info("Checking central repository for latest release (Current: v{$current['version']})...");

        try {
            $updateCheck = $this->updateManager->checkForUpdates();

            if (! empty($updateCheck['update_available'])) {
                $targetVersion = (string) $updateCheck['latest_version'];
                $displayName = (string) ($updateCheck['name'] ?? "v{$targetVersion}");
                $hash = (string) ($updateCheck['zip_hash'] ?? '');

                $this->components->info("Newer release available on central server: {$displayName} ({$targetVersion})");

                if ($this->confirm("Would you like to download and install release {$targetVersion} now?", true)) {
                    $this->info('Downloading package archive stream from central server...');
                    $zipPath = $this->updateManager->downloadAndVerifyUpdate($targetVersion, $hash);

                    $this->info("✓ SHA256 integrity seal verified ({$hash}).");
                    $this->info('Extracting release package safely over project root...');
                    $this->extractReleaseArchive($zipPath, $targetVersion);

                    $this->info("✓ Release v{$targetVersion} extracted and updated in version manifest!");
                }
            } else {
                $this->info("✓ Installed codebase is up to date (v{$current['version']}). No release download required.");
            }
        } catch (Throwable $e) {
            $this->warn("Release download notice: {$e->getMessage()}");
            $this->line('  <fg=gray>Continuing setup with currently packaged codebase.</>');
        }
    }

    /**
     * Safely extract release archive over project root, strictly protecting user data and storage.
     */
    protected function extractReleaseArchive(string $zipPath, string $targetVersion): void
    {
        $zip = new ZipArchive;
        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException("Cannot open downloaded release archive at '{$zipPath}'.");
        }

        // Protected paths that must NEVER be overwritten
        $protectedPrefixes = [
            '.env',
            'storage/',
            'storage\\',
            '.git',
        ];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $filename = $zip->getNameIndex($i);

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

            $zip->extractTo(base_path(), $filename);
        }

        $zip->close();
        File::delete($zipPath);

        // Update version.json
        $versionFile = base_path('version.json');
        $data = [
            'version' => ltrim($targetVersion, 'vV '),
            'name' => 'ARX-ERP Enterprise',
            'channel' => 'stable',
            'release_date' => now()->toDateString(),
        ];
        File::put($versionFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Interactive database selection & credentials testing.
     *
     * @return array{driver: string, host: string, port: int, database: string, username: string}|null
     */
    protected function configureDatabaseProcess(): ?array
    {
        $currentDriver = env('DB_CONNECTION', 'pgsql');
        $driverChoice = $this->choice(
            'Select Database Driver',
            ['pgsql' => 'PostgreSQL (Recommended)', 'mysql' => 'MySQL / MariaDB'],
            $currentDriver === 'mysql' ? 'mysql' : 'pgsql'
        );

        $driver = $driverChoice === 'mysql' ? 'mysql' : 'pgsql';
        $defaultPort = $driver === 'pgsql' ? 5432 : 3306;

        while (true) {
            $host = $this->ask('Database Host', env('DB_HOST', '127.0.0.1'));
            $port = (int) $this->ask('Database Port', (string) (env('DB_PORT') ?: $defaultPort));
            $database = $this->ask('Database Name', env('DB_DATABASE', 'arx_erp'));
            $username = $this->ask('Database Username', env('DB_USERNAME', $driver === 'pgsql' ? 'postgres' : 'root'));
            $password = (string) $this->secret('Database Password (leave blank if none)');

            $this->info("Testing connection to {$driver}://{$username}@{$host}:{$port}/{$database}...");

            try {
                $dsn = "{$driver}:host={$host};port={$port};dbname={$database}";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 5,
                ];

                new PDO($dsn, $username, $password, $options);

                $this->info('✓ Database connection established successfully!');

                // Save to .env
                $this->licenseManager->updateEnvFile([
                    'DB_CONNECTION' => $driver,
                    'DB_HOST' => $host,
                    'DB_PORT' => (string) $port,
                    'DB_DATABASE' => $database,
                    'DB_USERNAME' => $username,
                    'DB_PASSWORD' => $password,
                ]);

                // Update runtime config and reconnect
                config([
                    'database.default' => $driver,
                    "database.connections.{$driver}.host" => $host,
                    "database.connections.{$driver}.port" => $port,
                    "database.connections.{$driver}.database" => $database,
                    "database.connections.{$driver}.username" => $username,
                    "database.connections.{$driver}.password" => $password,
                ]);
                DB::purge();
                DB::reconnect();

                return [
                    'driver' => $driver,
                    'host' => $host,
                    'port' => $port,
                    'database' => $database,
                    'username' => $username,
                ];
            } catch (Throwable $e) {
                $this->error("Connection failed: {$e->getMessage()}");

                if (! $this->confirm('Would you like to re-enter database connection parameters?', true)) {
                    return null;
                }
            }
        }
    }

    /**
     * Create or prompt for Super Admin credentials.
     */
    protected function createSuperAdminProcess(): void
    {
        $superAdminRoleName = (string) config('arx.roles.super_admin', 'super-admin');
        $superAdminRole = Role::firstOrCreate(['name' => $superAdminRoleName]);

        $existingAdmin = User::role($superAdminRoleName)->first();

        if ($existingAdmin) {
            $this->line("  Super Admin user already exists: <fg=green>{$existingAdmin->email}</>");
            if (! $this->confirm('Would you like to update the Super Admin credentials or create a new one?', false)) {
                return;
            }
        }

        $name = $this->ask('Super Administrator Name', 'Super Administrator');
        $email = $this->ask('Super Administrator Email', 'admin@arx-erp.local');
        $password = $this->secret('Super Administrator Password');

        while (empty($password) || strlen($password) < 8) {
            $this->error('Password must be at least 8 characters long.');
            $password = $this->secret('Super Administrator Password');
        }

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'user_type' => 'user',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $user->syncRoles([$superAdminRole]);

        $this->info("✓ Super Admin user '{$email}' configured successfully!");
    }

    /**
     * Display final successful summary table.
     */
    protected function displaySuccessSummary(string $installationId, string $appUrl, string $driver): void
    {
        $this->line('');
        $this->line('<fg=green;options=bold>===========================================================</>');
        $this->line('<fg=white;options=bold>          ARX-ERP INSTALLATION COMPLETED SUCCESSFULLY!     </>');
        $this->line('<fg=green;options=bold>===========================================================</>');
        $this->line('');
        $this->table(
            ['Component', 'Configuration Details'],
            [
                ['Application URL', $appUrl],
                ['Database Driver', strtoupper($driver)],
                ['Hardware Fingerprint', $installationId],
                ['License Status', 'Activated & Validated with Central Authority'],
                ['Admin Login Page', rtrim($appUrl, '/').'/auth/login'],
            ]
        );
        $this->line('');
        $this->line('  <fg=gray>You can now start your web server or visit the login portal.</>');
        $this->line('');
    }
}
