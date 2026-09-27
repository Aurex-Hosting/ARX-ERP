<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Core\Services\BackupManager;
use Illuminate\Console\Command;

class RestoreSystemCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'arx:restore 
                            {file : Backup archive filename or absolute path}
                            {--force : Bypass interactive confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Restore system database and storage files from a backup archive';

    /**
     * Execute the console command.
     */
    public function handle(BackupManager $backupManager): int
    {
        $file = (string) $this->argument('file');
        $force = (bool) $this->option('force');

        if (! $force) {
            $confirmed = $this->confirm(
                "WARNING: Restoring backup '{$file}' will overwrite existing database records and storage files. Do you want to proceed?",
                false
            );

            if (! $confirmed) {
                $this->warn('Restore operation cancelled.');

                return self::SUCCESS;
            }
        }

        $this->info("Restoring system from '{$file}'...");

        try {
            $result = $backupManager->restoreBackup($file);

            $this->info('Restore completed successfully!');
            $this->table(
                ['Attribute', 'Value'],
                [
                    ['Filename', $result['filename']],
                    ['Type', $result['type']],
                    ['Tables Restored', $result['restored_tables']],
                    ['Records Restored', $result['restored_records']],
                    ['Files Restored', $result['restored_files']],
                    ['Status', 'All Caches & Registrars Flushed & Re-synchronized'],
                ]
            );

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Restore failed: {$e->getMessage()}");

            return self::FAILURE;
        }
    }
}
