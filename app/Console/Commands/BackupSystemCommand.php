<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Core\Services\BackupManager;
use Illuminate\Console\Command;

class BackupSystemCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'arx:backup 
                            {--type=full : Backup type: full, db, or files}
                            {--notes= : Optional description or backup reason}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a system backup (database, storage files, or full archive)';

    /**
     * Execute the console command.
     */
    public function handle(BackupManager $backupManager): int
    {
        $type = (string) ($this->option('type') ?: 'full');
        $notes = $this->option('notes') ? (string) $this->option('notes') : null;

        $this->info("Creating '{$type}' backup for ARX-ERP...");

        try {
            $result = $backupManager->createBackup($type, $notes);

            $this->info('Backup created successfully!');
            $this->table(
                ['Attribute', 'Value'],
                [
                    ['Filename', $result['filename']],
                    ['Type', $result['type']],
                    ['Size', $result['size_formatted']],
                    ['Tables Dumped', $result['tables_count']],
                    ['Records Dumped', $result['records_count']],
                    ['Files Archived', $result['files_count']],
                    ['SHA256 Checksum', $result['checksum']],
                    ['Created At', $result['created_at']],
                ]
            );

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Backup failed: {$e->getMessage()}");

            return self::FAILURE;
        }
    }
}
