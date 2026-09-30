<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Core\Services\UpdateManager;
use Illuminate\Console\Command;
use Throwable;

class CheckUpdatesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'updates:check {--apply : Automatically download and apply the update if eligible}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for ARX-ERP system updates with RSA cryptographic verification';

    public function __construct(
        protected UpdateManager $updateManager
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for system updates...');

        try {
            $result = $this->updateManager->checkForUpdates();

            if (! empty($result['message']) && empty($result['update_available'])) {
                $this->line("Status: {$result['message']}");
            }

            if (! empty($result['update_available'])) {
                $this->components->info("A new update is available: v{$result['latest_version']}");
                $this->table(
                    ['Field', 'Value'],
                    [
                        ['Current Version', $result['current_version']],
                        ['Latest Version', $result['latest_version']],
                        ['Package Name', $result['name'] ?? '-'],
                        ['Published At', $result['published_at'] ?? 'Recent'],
                        ['Package Checksum', $result['zip_hash'] ?? 'Verified'],
                    ]
                );

                if ($this->option('apply')) {
                    $this->info('Attempting automated update application...');

                    $eligibility = $this->updateManager->checkBackupEligibility();
                    if (! $eligibility['eligible']) {
                        $this->error("Update blocked: {$eligibility['message']}");

                        return self::FAILURE;
                    }

                    $releaseName = $result['name'] ?? "v{$result['latest_version']}";
                    $this->info("Downloading package '{$releaseName}'...");
                    $zipPath = $this->updateManager->downloadAndVerifyUpdate($releaseName, (string) ($result['zip_hash'] ?? ''));

                    $this->info('Applying update snapshot and running migrations...');
                    $applyResult = $this->updateManager->applyUpdate($zipPath, (string) $result['latest_version'], $result['notes'] ?? null);

                    $this->info($applyResult['message']);
                } else {
                    $this->line('Run <fg=yellow>php artisan updates:check --apply</> or update from the Admin Portal.');
                }
            } else {
                $this->info("System is up to date (Running v{$result['current_version']}).");
            }

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error("Update check failed: {$e->getMessage()}");

            return self::FAILURE;
        }
    }
}
