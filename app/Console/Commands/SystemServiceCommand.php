<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Throwable;

class SystemServiceCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:service
                            {action=status : Action to perform: install, remove, status, start, stop, restart}
                            {--name=arx_erp : The systemd service name}
                            {--host=0.0.0.0 : Host IP address to bind to}
                            {--port= : Web server port (defaults to APP_URL port or 8000)}
                            {--user= : Linux user to run the service under}
                            {--server= : Server engine: octane, roadrunner, or serve (defaults to octane if installed)}
                            {--workers=4 : Worker process count for Octane}
                            {--with-worker : Also install and start a dedicated background queue worker service}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage ARX-ERP as a native Linux systemd background service (systemctl start/enable arx_erp)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $this->error('systemd services are only supported on Linux / Unix environments.');

            return self::FAILURE;
        }

        $action = strtolower((string) $this->argument('action'));
        $serviceName = (string) $this->option('name');

        return match ($action) {
            'install' => $this->installService($serviceName),
            'remove', 'uninstall' => $this->removeService($serviceName),
            'status' => $this->serviceStatus($serviceName),
            'start', 'stop', 'restart' => $this->controlService($serviceName, $action),
            default => $this->invalidAction($action),
        };
    }

    /**
     * Install and enable the systemd service.
     */
    protected function installService(string $serviceName): int
    {
        $this->components->info("Configuring systemd service '{$serviceName}'...");

        $systemdDir = '/etc/systemd/system';
        if (! File::isDirectory($systemdDir)) {
            $this->error("systemd directory '{$systemdDir}' was not found. Is systemd installed?");

            return self::FAILURE;
        }

        $serviceFilePath = "{$systemdDir}/{$serviceName}.service";
        $workingDir = base_path();
        $phpBinary = PHP_BINARY;

        // Resolve Port
        $port = (string) $this->option('port');
        if (empty($port)) {
            $appUrl = (string) config('app.url', 'http://localhost:8000');
            $parsedPort = parse_url($appUrl, PHP_URL_PORT);
            $port = $parsedPort ? (string) $parsedPort : '8000';
        }

        $host = (string) $this->option('host');

        // Resolve User & Group
        $user = (string) $this->option('user');
        $group = 'root';
        if (empty($user)) {
            if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) {
                $userInfo = posix_getpwuid(posix_geteuid());
                $user = $userInfo['name'] ?? 'root';
            } else {
                $user = get_current_user() ?: 'root';
            }
        }

        if (function_exists('posix_getgrgid') && function_exists('posix_getegid')) {
            $groupInfo = posix_getgrgid(posix_getegid());
            $group = $groupInfo['name'] ?? 'root';
        }

        // Resolve Server Engine (Octane vs Serve)
        $runner = strtolower((string) ($this->option('server') ?: ''));
        if (empty($runner)) {
            $runner = file_exists(base_path('config/octane.php')) ? 'octane' : 'serve';
        }

        $workers = (int) ($this->option('workers') ?: 4);

        if ($runner === 'octane' || $runner === 'roadrunner') {
            $execStart = "{$phpBinary} {$workingDir}/artisan octane:start --server=roadrunner --host={$host} --port={$port} --workers={$workers}";
            $execReload = "ExecReload={$phpBinary} {$workingDir}/artisan octane:reload\n";
        } else {
            $execStart = "{$phpBinary} {$workingDir}/artisan serve --host={$host} --port={$port}";
            $execReload = '';
        }

        // Ensure storage and logs exist
        $logDir = "{$workingDir}/storage/logs";
        if (! File::isDirectory($logDir)) {
            File::makeDirectory($logDir, 0775, true, true);
        }

        $serviceContent = <<<INI
[Unit]
Description=ARX-ERP Enterprise Application Service
After=network.target network-online.target mysql.service mariadb.service postgresql.service
Wants=network-online.target

[Service]
Type=simple
User={$user}
Group={$group}
WorkingDirectory={$workingDir}
ExecStart={$execStart}
{$execReload}Restart=always
RestartSec=3s
Environment=APP_ENV=production
StandardOutput=append:{$workingDir}/storage/logs/systemd.log
StandardError=append:{$workingDir}/storage/logs/systemd-error.log
KillMode=process
TimeoutStopSec=15
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
INI;

        try {
            File::put($serviceFilePath, $serviceContent);
            $this->info("✓ Service unit file created at {$serviceFilePath}");
        } catch (Throwable $e) {
            $this->error("Failed to write to {$serviceFilePath}: {$e->getMessage()}");
            $this->line('  <fg=yellow>Try running with sudo:</> <fg=cyan>sudo php artisan app:service install</>');

            return self::FAILURE;
        }

        // Optionally create background Queue Worker service unit
        $withWorker = (bool) $this->option('with-worker');
        $workerServiceName = "{$serviceName}_worker";
        $workerFilePath = "{$systemdDir}/{$workerServiceName}.service";

        if ($withWorker) {
            $workerContent = <<<INI
[Unit]
Description=ARX-ERP Enterprise Background Queue Worker
After=network.target network-online.target mysql.service mariadb.service postgresql.service redis.service
Wants=network-online.target

[Service]
Type=simple
User={$user}
Group={$group}
WorkingDirectory={$workingDir}
ExecStart={$phpBinary} {$workingDir}/artisan queue:work --sleep=3 --tries=3 --max-time=3600
Restart=always
RestartSec=5s
Environment=APP_ENV=production
StandardOutput=append:{$workingDir}/storage/logs/worker-systemd.log
StandardError=append:{$workingDir}/storage/logs/worker-systemd-error.log
KillMode=process
TimeoutStopSec=30
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
INI;
            try {
                File::put($workerFilePath, $workerContent);
                $this->info("✓ Queue worker service unit file created at {$workerFilePath}");
            } catch (Throwable $e) {
                $this->warn("Failed to write to {$workerFilePath}: {$e->getMessage()}");
            }
        }

        // Reload systemd and enable services
        $this->info('Reloading systemd daemon...');
        @shell_exec('systemctl daemon-reload 2>&1');

        $this->info("Enabling service '{$serviceName}' to start at boot...");
        @shell_exec("systemctl enable {$serviceName} 2>&1");
        @shell_exec("systemctl start {$serviceName} 2>&1");

        if ($withWorker && File::exists($workerFilePath)) {
            $this->info("Enabling service '{$workerServiceName}' to start at boot...");
            @shell_exec("systemctl enable {$workerServiceName} 2>&1");
            @shell_exec("systemctl start {$workerServiceName} 2>&1");
        }

        // Verify active state
        $isActive = trim((string) @shell_exec("systemctl is-active {$serviceName} 2>/dev/null")) === 'active';
        $isWorkerActive = $withWorker ? trim((string) @shell_exec("systemctl is-active {$workerServiceName} 2>/dev/null")) === 'active' : false;

        $this->line('');
        if ($isActive) {
            $this->components->info("✓ Web service '{$serviceName}' is active and running!");
        } else {
            $this->warn("Service '{$serviceName}' was installed. Check status with: systemctl status {$serviceName}");
        }

        if ($withWorker) {
            if ($isWorkerActive) {
                $this->components->info("✓ Queue worker '{$workerServiceName}' is active and running!");
            } else {
                $this->warn("Queue worker '{$workerServiceName}' was installed. Check status with: systemctl status {$workerServiceName}");
            }
        }

        $this->line('');
        $this->line('  <fg=white;options=bold>Management Commands:</>');
        $this->line("    <fg=cyan>systemctl status {$serviceName}</>   - Check web service health and logs");
        if ($runner === 'octane' || $runner === 'roadrunner') {
            $this->line("    <fg=cyan>systemctl reload {$serviceName}</>   - Graceful zero-downtime worker reload (Octane)");
        }
        $this->line("    <fg=cyan>systemctl restart {$serviceName}</>  - Restart ARX-ERP web service");
        if ($withWorker) {
            $this->line("    <fg=cyan>systemctl status {$workerServiceName}</> - Check queue worker status");
            $this->line("    <fg=cyan>systemctl restart {$workerServiceName}</> - Restart queue worker");
        }
        $this->line("    <fg=cyan>systemctl stop {$serviceName}</>     - Stop ARX-ERP service");
        $this->line("    <fg=cyan>systemctl disable {$serviceName}</>  - Disable startup at boot");
        $this->line('');

        return self::SUCCESS;
    }

    /**
     * Remove and disable the systemd service.
     */
    protected function removeService(string $serviceName): int
    {
        $this->info("Stopping and disabling service '{$serviceName}'...");
        @shell_exec("systemctl stop {$serviceName} 2>&1");
        @shell_exec("systemctl disable {$serviceName} 2>&1");

        $serviceFilePath = "/etc/systemd/system/{$serviceName}.service";
        if (File::exists($serviceFilePath)) {
            File::delete($serviceFilePath);
            $this->info("✓ Removed {$serviceFilePath}");
        }

        $workerServiceName = "{$serviceName}_worker";
        $workerFilePath = "/etc/systemd/system/{$workerServiceName}.service";
        if (File::exists($workerFilePath)) {
            @shell_exec("systemctl stop {$workerServiceName} 2>&1");
            @shell_exec("systemctl disable {$workerServiceName} 2>&1");
            File::delete($workerFilePath);
            $this->info("✓ Removed {$workerFilePath}");
        }

        @shell_exec('systemctl daemon-reload 2>&1');
        $this->components->info("✓ Service '{$serviceName}' successfully removed.");

        return self::SUCCESS;
    }

    /**
     * Check status of the systemd service.
     */
    protected function serviceStatus(string $serviceName): int
    {
        $serviceFilePath = "/etc/systemd/system/{$serviceName}.service";
        if (! File::exists($serviceFilePath)) {
            $this->warn("Service '{$serviceName}' is not installed.");
            $this->line('  Install it using: <fg=cyan>php artisan app:service install</>');

            return self::FAILURE;
        }

        $statusOutput = @shell_exec("systemctl status {$serviceName} 2>&1");
        $this->line($statusOutput ?: "No status output from systemctl for {$serviceName}.");

        $workerServiceName = "{$serviceName}_worker";
        if (File::exists("/etc/systemd/system/{$workerServiceName}.service")) {
            $this->line('');
            $workerOutput = @shell_exec("systemctl status {$workerServiceName} 2>&1");
            $this->line($workerOutput ?: "No status output for {$workerServiceName}.");
        }

        return self::SUCCESS;
    }

    /**
     * Control the service state (start, stop, restart).
     */
    protected function controlService(string $serviceName, string $action): int
    {
        $this->info("Executing 'systemctl {$action} {$serviceName}'...");
        passthru("systemctl {$action} {$serviceName}");

        $workerServiceName = "{$serviceName}_worker";
        if (File::exists("/etc/systemd/system/{$workerServiceName}.service")) {
            $this->info("Executing 'systemctl {$action} {$workerServiceName}'...");
            passthru("systemctl {$action} {$workerServiceName}");
        }

        return self::SUCCESS;
    }

    protected function invalidAction(string $action): int
    {
        $this->error("Unknown action '{$action}'. Valid actions: install, remove, status, start, stop, restart.");

        return self::FAILURE;
    }
}
