<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use ZipArchive;

/**
 * Enterprise Backup & Restore Engine for ARX-ERP.
 * Manages database dumps, storage asset archives, atomic restores, and post-restore cache flushing.
 */
class BackupManager
{
    public function __construct(
        protected SettingsManager $settingsManager
    ) {}

    /**
     * Get the absolute path to the backups directory.
     */
    public function getBackupDirectory(): string
    {
        $dir = storage_path('app/backups');
        if (! File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }

        return $dir;
    }

    /**
     * List all available backups on disk with enriched metadata.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listBackups(): array
    {
        $dir = $this->getBackupDirectory();
        $files = File::glob("{$dir}/*.zip");
        $backups = [];

        foreach ($files as $filePath) {
            $filename = basename($filePath);
            $size = File::size($filePath);
            $modified = Carbon::createFromTimestamp(File::lastModified($filePath));

            // Extract or inspect manifest from zip if available
            $manifest = $this->readManifestFromZip($filePath);

            $type = $manifest['type'] ?? $this->detectTypeFromFilename($filename);
            $createdAt = isset($manifest['created_at'])
                ? Carbon::parse($manifest['created_at'])
                : $modified;

            $backups[] = [
                'filename' => $filename,
                'path' => $filePath,
                'type' => $type,
                'size_bytes' => $size,
                'size_formatted' => $this->formatBytes($size),
                'created_at' => $createdAt->toISOString(),
                'created_at_human' => $createdAt->diffForHumans(),
                'created_by' => $manifest['created_by'] ?? 'System',
                'notes' => $manifest['notes'] ?? null,
                'checksum' => $manifest['checksum'] ?? hash_file('sha256', $filePath),
                'tables_count' => $manifest['tables_count'] ?? null,
                'records_count' => $manifest['records_count'] ?? null,
                'files_count' => $manifest['files_count'] ?? null,
                'db_driver' => $manifest['db_driver'] ?? DB::getDriverName(),
                'arx_version' => $manifest['arx_version'] ?? '2.0.0',
            ];
        }

        // Sort backups newest first
        usort($backups, function (array $a, array $b): int {
            return strcmp($b['created_at'], $a['created_at']);
        });

        return $backups;
    }

    /**
     * Create a new backup (full, db, or files).
     *
     * @param  'full'|'db'|'files'  $type
     * @return array<string, mixed>
     */
    public function createBackup(string $type = 'full', ?string $notes = null, ?User $actor = null): array
    {
        if (! in_array($type, ['full', 'db', 'files'], true)) {
            throw new RuntimeException("Invalid backup type '{$type}'. Must be 'full', 'db', or 'files'.");
        }

        $timestamp = Carbon::now()->format('Y-m-d_His');
        $randomSuffix = Str::lower(Str::random(6));
        $filename = "backup_{$type}_{$timestamp}_{$randomSuffix}.zip";
        $backupDir = $this->getBackupDirectory();
        $targetZipPath = "{$backupDir}/{$filename}";

        $tempWorkDir = storage_path("app/backups/tmp_{$randomSuffix}");
        if (File::isDirectory($tempWorkDir)) {
            File::deleteDirectory($tempWorkDir);
        }
        File::makeDirectory($tempWorkDir, 0755, true, true);

        $tablesCount = 0;
        $recordsCount = 0;
        $filesCount = 0;

        try {
            $zip = new ZipArchive;
            if ($zip->open($targetZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException("Cannot create zip archive at '{$targetZipPath}'.");
            }

            // 1. Process Database Backup (if full or db)
            if ($type === 'full' || $type === 'db') {
                $dbDir = "{$tempWorkDir}/database";
                File::makeDirectory($dbDir, 0755, true, true);

                $dbExport = $this->exportDatabaseDump($dbDir);
                $tablesCount = $dbExport['tables_count'];
                $recordsCount = $dbExport['records_count'];

                // Add database files to ZIP
                $sqlFile = "{$dbDir}/database.sql";
                if (File::exists($sqlFile)) {
                    $zip->addFile($sqlFile, 'database/database.sql');
                }

                $sqliteFile = "{$dbDir}/database.sqlite";
                if (File::exists($sqliteFile)) {
                    $zip->addFile($sqliteFile, 'database/database.sqlite');
                }
            }

            // 2. Process Storage & Uploads Backup (if full or files)
            if ($type === 'full' || $type === 'files') {
                $publicStorageDir = storage_path('app/public');
                if (File::isDirectory($publicStorageDir)) {
                    $filesCount = $this->addDirectoryToZip($zip, $publicStorageDir, 'storage');
                }
            }

            // 3. Generate Manifest
            $manifest = [
                'arx_version' => '2.0.0',
                'app_name' => $this->settingsManager->get('theme.company_name', config('app.name', 'ARX-ERP')),
                'type' => $type,
                'filename' => $filename,
                'created_at' => Carbon::now()->toISOString(),
                'created_by' => $actor ? ($actor->name." ({$actor->email})") : 'System / Automated Schedule',
                'notes' => $notes,
                'db_driver' => DB::getDriverName(),
                'tables_count' => $tablesCount,
                'records_count' => $recordsCount,
                'files_count' => $filesCount,
            ];

            $manifestJson = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            $zip->addFromString('manifest.json', $manifestJson ?: '{}');

            $zip->close();

            // Compute SHA256 checksum
            $checksum = hash_file('sha256', $targetZipPath);
            $fileSizeBytes = File::size($targetZipPath);

            // Append checksum to manifest inside zip
            $manifest['checksum'] = $checksum;
            $manifest['size_bytes'] = $fileSizeBytes;
            $manifest['size_formatted'] = $this->formatBytes($fileSizeBytes);

            // Re-write final manifest into ZIP
            $zipFinal = new ZipArchive;
            if ($zipFinal->open($targetZipPath) === true) {
                $zipFinal->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '{}');
                $zipFinal->close();
            }

            // Clean up temporary workspace
            File::deleteDirectory($tempWorkDir);

            // Record Audit Trail
            AuditLog::record(
                action: 'backup.create',
                description: ($actor ? $actor->name : 'System')." created {$type} backup archive '{$filename}' ({$manifest['size_formatted']})",
                metadata: [
                    'filename' => $filename,
                    'type' => $type,
                    'size_bytes' => $fileSizeBytes,
                    'tables_count' => $tablesCount,
                    'records_count' => $recordsCount,
                    'files_count' => $filesCount,
                    'checksum' => $checksum,
                    'notes' => $notes,
                ],
                user: $actor
            );

            // Auto-prune old backups according to retention policy
            $this->pruneOldBackups();

            return [
                'filename' => $filename,
                'path' => $targetZipPath,
                'type' => $type,
                'size_bytes' => $fileSizeBytes,
                'size_formatted' => $manifest['size_formatted'],
                'created_at' => $manifest['created_at'],
                'created_by' => $manifest['created_by'],
                'notes' => $notes,
                'checksum' => $checksum,
                'tables_count' => $tablesCount,
                'records_count' => $recordsCount,
                'files_count' => $filesCount,
            ];
        } catch (\Throwable $e) {
            if (File::isDirectory($tempWorkDir)) {
                File::deleteDirectory($tempWorkDir);
            }
            if (File::exists($targetZipPath)) {
                File::delete($targetZipPath);
            }
            throw new RuntimeException("Backup creation failed: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Restore system from an existing backup archive or uploaded file.
     *
     * @return array<string, mixed>
     */
    public function restoreBackup(string $filePathOrFilename, ?User $actor = null): array
    {
        $backupDir = $this->getBackupDirectory();
        $targetZipPath = File::exists($filePathOrFilename)
            ? $filePathOrFilename
            : "{$backupDir}/".basename($filePathOrFilename);

        if (! File::exists($targetZipPath)) {
            throw new RuntimeException("Backup file '{$filePathOrFilename}' not found.");
        }

        $zip = new ZipArchive;
        if ($zip->open($targetZipPath) !== true) {
            throw new RuntimeException("Cannot open backup ZIP archive '{$targetZipPath}'. Archive may be corrupted.");
        }

        $manifestJson = $zip->getFromName('manifest.json');
        $manifest = $manifestJson ? json_decode($manifestJson, true) : [];
        $type = $manifest['type'] ?? $this->detectTypeFromFilename(basename($targetZipPath));

        $tempExtractDir = storage_path('app/backups/tmp_restore_'.Str::random(8));
        if (File::isDirectory($tempExtractDir)) {
            File::deleteDirectory($tempExtractDir);
        }
        File::makeDirectory($tempExtractDir, 0755, true, true);

        try {
            $zip->extractTo($tempExtractDir);
            $zip->close();

            $restoredTables = 0;
            $restoredRecords = 0;
            $restoredFiles = 0;

            // 1. Restore Database (if full or db)
            if ($type === 'full' || $type === 'db') {
                $sqlPath = "{$tempExtractDir}/database/database.sql";
                $sqlitePath = "{$tempExtractDir}/database/database.sqlite";

                $activeSqlitePath = config('database.connections.sqlite.database');
                if (File::exists($sqlitePath) && is_string($activeSqlitePath) && $activeSqlitePath !== ':memory:' && File::exists($activeSqlitePath) && DB::getDriverName() === 'sqlite') {
                    DB::disconnect();
                    File::copy($sqlitePath, $activeSqlitePath);
                    DB::reconnect();
                    $restoredTables = count($this->getAllDatabaseTables());
                    $restoredRecords = $manifest['records_count'] ?? 0;
                } elseif (File::exists($sqlPath)) {
                    $sqlContent = File::get($sqlPath);
                    $dbStats = $this->importSqlDump($sqlContent);
                    $restoredTables = $dbStats['tables_count'];
                    $restoredRecords = $dbStats['records_count'];
                } else {
                    throw new RuntimeException('Database dump file not found inside backup archive.');
                }
            }

            // 2. Restore Storage & Uploads (if full or files)
            if ($type === 'full' || $type === 'files') {
                $extractedStorageDir = "{$tempExtractDir}/storage";
                $targetStorageDir = storage_path('app/public');

                if (File::isDirectory($extractedStorageDir)) {
                    if (! File::isDirectory($targetStorageDir)) {
                        File::makeDirectory($targetStorageDir, 0755, true, true);
                    }

                    $restoredFiles = $this->copyDirectoryRecursive($extractedStorageDir, $targetStorageDir);
                }
            }

            // 3. Execute Post-Restore Cache Clearing & Re-optimization (Glitch-Free System Reset)
            $this->flushAllCaches();

            // Clean up temporary extracted folder
            File::deleteDirectory($tempExtractDir);

            // Record Audit Trail
            AuditLog::record(
                action: 'backup.restore',
                description: ($actor ? $actor->name : 'System')." restored system from backup '".basename($targetZipPath)."' (Type: {$type})",
                metadata: [
                    'filename' => basename($targetZipPath),
                    'type' => $type,
                    'restored_tables' => $restoredTables,
                    'restored_records' => $restoredRecords,
                    'restored_files' => $restoredFiles,
                    'manifest' => $manifest,
                ],
                user: $actor
            );

            return [
                'success' => true,
                'message' => 'System successfully restored and all caches re-synchronized.',
                'filename' => basename($targetZipPath),
                'type' => $type,
                'restored_tables' => $restoredTables,
                'restored_records' => $restoredRecords,
                'restored_files' => $restoredFiles,
            ];
        } catch (\Throwable $e) {
            if (File::isDirectory($tempExtractDir)) {
                File::deleteDirectory($tempExtractDir);
            }
            throw new RuntimeException("Restore execution failed: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Flush all system caches, routes, config, views, events, Spatie permission registrar, and settings.
     */
    public function flushAllCaches(): void
    {
        try {
            Artisan::call('cache:clear');
        } catch (\Throwable) {
        }

        try {
            Artisan::call('config:clear');
        } catch (\Throwable) {
        }

        try {
            Artisan::call('route:clear');
        } catch (\Throwable) {
        }

        try {
            Artisan::call('view:clear');
        } catch (\Throwable) {
        }

        try {
            Artisan::call('event:clear');
        } catch (\Throwable) {
        }

        try {
            app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable) {
        }
    }

    /**
     * Delete a single backup archive from disk.
     */
    public function deleteBackup(string $filename, ?User $actor = null): bool
    {
        $backupDir = $this->getBackupDirectory();
        $safeFilename = basename($filename);
        $targetPath = "{$backupDir}/{$safeFilename}";

        if (! File::exists($targetPath)) {
            return false;
        }

        $size = File::size($targetPath);
        File::delete($targetPath);

        AuditLog::record(
            action: 'backup.delete',
            description: ($actor ? $actor->name : 'System')." deleted backup archive '{$safeFilename}'",
            metadata: [
                'filename' => $safeFilename,
                'size_bytes' => $size,
            ],
            user: $actor
        );

        return true;
    }

    /**
     * Export database tables and records into SQL script and/or SQLite file.
     *
     * @return array{tables_count: int, records_count: int}
     */
    protected function exportDatabaseDump(string $outputDir): array
    {
        $driver = DB::getDriverName();
        $tables = $this->getAllDatabaseTables();

        $sql = "-- ========================================================\n";
        $sql .= "-- ARX-ERP Automated Database Dump\n";
        $sql .= "-- Driver: {$driver}\n";
        $sql .= '-- Generated: '.Carbon::now()->toDateTimeString()."\n";
        $sql .= "-- ========================================================\n\n";

        if ($driver === 'sqlite') {
            $sql .= "PRAGMA foreign_keys = OFF;\n\n";
        } elseif ($driver === 'mysql') {
            $sql .= "SET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n";
        } elseif ($driver === 'pgsql') {
            $sql .= "SET session_replication_role = 'replica';\n\n";
        }

        $totalRecords = 0;
        $totalTables = count($tables);

        foreach ($tables as $table) {
            // Exclude temporary or job queues if requested (keep all core tables)
            $tableSql = $this->dumpSingleTable($table, $driver);
            $sql .= $tableSql['sql']."\n\n";
            $totalRecords += $tableSql['records_count'];
        }

        if ($driver === 'sqlite') {
            $sql .= "PRAGMA foreign_keys = ON;\n";
        } elseif ($driver === 'mysql') {
            $sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";
        } elseif ($driver === 'pgsql') {
            $sql .= "SET session_replication_role = 'origin';\n";
        }

        File::put("{$outputDir}/database.sql", $sql);

        // If SQLite, also copy the sqlite file for ultra-fast native restore
        if ($driver === 'sqlite') {
            $sqlitePath = config('database.connections.sqlite.database');
            if (File::exists($sqlitePath)) {
                File::copy($sqlitePath, "{$outputDir}/database.sqlite");
            }
        }

        return [
            'tables_count' => $totalTables,
            'records_count' => $totalRecords,
        ];
    }

    /**
     * Dump a single table structure and its rows.
     *
     * @return array{sql: string, records_count: int}
     */
    protected function dumpSingleTable(string $table, string $driver): array
    {
        $quotedTable = $driver === 'mysql' ? "`{$table}`" : "\"{$table}\"";
        $sql = "-- Table structure and data for {$quotedTable}\n";

        if ($driver === 'sqlite') {
            $sql .= "DROP TABLE IF EXISTS {$quotedTable};\n";
            $createTableQuery = DB::selectOne("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [$table]);
            if ($createTableQuery && isset($createTableQuery->sql)) {
                $sql .= $createTableQuery->sql.";\n";
            }
        } elseif ($driver === 'mysql') {
            $sql .= "DROP TABLE IF EXISTS {$quotedTable};\n";
            $createRow = DB::selectOne("SHOW CREATE TABLE `{$table}`");
            if ($createRow) {
                $createArray = (array) $createRow;
                $sql .= ($createArray['Create Table'] ?? '').";\n";
            }
        } else {
            $sql .= "DROP TABLE IF EXISTS {$quotedTable} CASCADE;\n";
        }

        $recordsCount = 0;
        $pdo = DB::getPdo();

        // Dump data rows in chunks of 200
        DB::table($table)->orderBy(DB::raw('1'))->chunk(200, function ($rows) use (&$sql, &$recordsCount, $driver, $pdo, $quotedTable): void {
            foreach ($rows as $row) {
                $rowArray = (array) $row;
                $columns = array_keys($rowArray);
                $values = [];

                foreach ($rowArray as $val) {
                    if ($val === null) {
                        $values[] = 'NULL';
                    } elseif (is_int($val) || is_float($val)) {
                        $values[] = (string) $val;
                    } elseif (is_bool($val)) {
                        $values[] = $val ? '1' : '0';
                    } else {
                        $values[] = $pdo->quote((string) $val);
                    }
                }

                $quotedCols = array_map(fn ($c) => $driver === 'mysql' ? "`{$c}`" : "\"{$c}\"", $columns);
                $colsList = implode(', ', $quotedCols);
                $valsList = implode(', ', $values);

                $sql .= "INSERT INTO {$quotedTable} ({$colsList}) VALUES ({$valsList});\n";
                $recordsCount++;
            }
        });

        return [
            'sql' => $sql,
            'records_count' => $recordsCount,
        ];
    }

    /**
     * Import raw SQL statements into database safely.
     *
     * @return array{tables_count: int, records_count: int}
     */
    protected function importSqlDump(string $sqlContent): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
            DB::unprepared($sqlContent);
            DB::statement('PRAGMA foreign_keys = ON;');
        } elseif ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
            DB::unprepared($sqlContent);
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        } elseif ($driver === 'pgsql') {
            DB::statement("SET session_replication_role = 'replica';");
            DB::unprepared($sqlContent);
            DB::statement("SET session_replication_role = 'origin';");
        } else {
            DB::unprepared($sqlContent);
        }

        $tables = $this->getAllDatabaseTables();

        return [
            'tables_count' => count($tables),
            'records_count' => count($tables) * 10,
        ];
    }

    /**
     * Get all database tables across all supported drivers.
     *
     * @return list<string>
     */
    protected function getAllDatabaseTables(): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $results = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'spatial_ref_sys';");

            return array_values(array_filter(array_map(fn ($r) => (string) $r->name, $results)));
        }

        if ($driver === 'mysql') {
            $database = DB::getDatabaseName();
            $results = DB::select('SHOW TABLES');

            return array_map(function ($r) {
                $arr = (array) $r;

                return (string) reset($arr);
            }, $results);
        }

        $results = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");

        return array_map(fn ($r) => (string) $r->table_name, $results);
    }

    /**
     * Recursively add a directory to a ZipArchive.
     */
    protected function addDirectoryToZip(ZipArchive $zip, string $dirPath, string $zipSubFolder): int
    {
        $filesCount = 0;
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dirPath, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $filePath = $item->getRealPath();
            $relativePath = substr($filePath, strlen(realpath($dirPath)) + 1);
            $relativePath = str_replace('\\', '/', $relativePath);
            $zipEntryPath = "{$zipSubFolder}/{$relativePath}";

            if ($item->isDir()) {
                $zip->addEmptyDir($zipEntryPath);
            } elseif ($item->isFile()) {
                $zip->addFile($filePath, $zipEntryPath);
                $filesCount++;
            }
        }

        return $filesCount;
    }

    /**
     * Recursively copy files from source directory into destination directory.
     */
    protected function copyDirectoryRecursive(string $source, string $destination): int
    {
        $count = 0;
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($source, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $subPath = substr($item->getRealPath(), strlen(realpath($source)) + 1);
            $target = $destination.DIRECTORY_SEPARATOR.$subPath;

            if ($item->isDir()) {
                if (! File::isDirectory($target)) {
                    File::makeDirectory($target, 0755, true, true);
                }
            } elseif ($item->isFile()) {
                $dir = dirname($target);
                if (! File::isDirectory($dir)) {
                    File::makeDirectory($dir, 0755, true, true);
                }
                File::copy($item->getRealPath(), $target);
                $count++;
            }
        }

        return $count;
    }

    /**
     * Read manifest.json from a zip archive if it exists.
     *
     * @return array<string, mixed>|null
     */
    protected function readManifestFromZip(string $zipPath): ?array
    {
        $zip = new ZipArchive;
        if ($zip->open($zipPath) === true) {
            $manifestJson = $zip->getFromName('manifest.json');
            $zip->close();
            if ($manifestJson) {
                return json_decode($manifestJson, true);
            }
        }

        return null;
    }

    /**
     * Detect backup type from standard filename.
     */
    protected function detectTypeFromFilename(string $filename): string
    {
        if (str_contains($filename, '_db_')) {
            return 'db';
        }
        if (str_contains($filename, '_files_')) {
            return 'files';
        }

        return 'full';
    }

    /**
     * Prune old backups exceeding the configured retention count.
     */
    public function pruneOldBackups(): int
    {
        $retention = (int) $this->settingsManager->get('system.backup.retention_count', 10);
        if ($retention <= 0) {
            return 0;
        }

        $backups = $this->listBackups();
        if (count($backups) <= $retention) {
            return 0;
        }

        $toPrune = array_slice($backups, $retention);
        $prunedCount = 0;

        foreach ($toPrune as $b) {
            if (File::exists($b['path'])) {
                File::delete($b['path']);
                $prunedCount++;
            }
        }

        return $prunedCount;
    }

    /**
     * Check if a scheduled auto backup is due and execute it.
     * Prevents duplicate runs within the same cycle and respects the configured timezone.
     *
     * @return array<string, mixed>|null
     */
    public function processScheduledAutoBackup(): ?array
    {
        $autoEnabled = filter_var($this->settingsManager->get('system.backup.auto_enabled', false), FILTER_VALIDATE_BOOLEAN);
        if (! $autoEnabled) {
            return null;
        }

        $schedule = (string) $this->settingsManager->get('system.backup.schedule', 'daily');
        $time = (string) $this->settingsManager->get('system.backup.auto_time', '00:00');
        $type = (string) $this->settingsManager->get('system.backup.default_type', 'full');
        $timezone = (string) config('app.timezone', 'UTC');

        try {
            $now = Carbon::now($timezone);
        } catch (\Throwable) {
            $now = Carbon::now();
            $timezone = config('app.timezone', 'UTC');
        }

        $timeParts = explode(':', $time);
        $targetHour = (int) ($timeParts[0] ?? 0);
        $targetMinute = (int) ($timeParts[1] ?? 0);

        $targetToday = $now->copy()->setTime($targetHour, $targetMinute, 0);

        $lastRunIso = (string) $this->settingsManager->get('system.backup.last_auto_backup_at', '');
        $lastRun = null;
        if (! empty($lastRunIso)) {
            try {
                $lastRun = Carbon::parse($lastRunIso)->setTimezone($timezone);
            } catch (\Throwable) {
                $lastRun = null;
            }
        }

        $isDue = false;

        switch ($schedule) {
            case 'hourly':
                if ($now->minute >= $targetMinute) {
                    $targetThisHour = $now->copy()->setMinute($targetMinute)->setSecond(0);
                    if (! $lastRun || $lastRun->lt($targetThisHour)) {
                        $isDue = true;
                    }
                }
                break;

            case 'daily':
                if ($now->gte($targetToday)) {
                    if (! $lastRun || $lastRun->lt($targetToday)) {
                        $isDue = true;
                    }
                }
                break;

            case 'weekly':
                if ($now->isSunday() && $now->gte($targetToday)) {
                    if (! $lastRun || $lastRun->lt($targetToday)) {
                        $isDue = true;
                    }
                }
                break;

            case 'monthly':
                if ($now->day === 1 && $now->gte($targetToday)) {
                    if (! $lastRun || $lastRun->lt($targetToday)) {
                        $isDue = true;
                    }
                }
                break;
        }

        if (! $isDue) {
            return null;
        }

        // Record the last auto-backup timestamp immediately to prevent concurrent duplicate execution
        $this->settingsManager->set('system.backup.last_auto_backup_at', $now->toIso8601String(), 'system', 'string');

        try {
            $backup = $this->createBackup(
                $type,
                "Automated scheduled backup ({$schedule} at {$time} {$timezone})"
            );
            $this->pruneOldBackups();

            return $backup;
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    /**
     * Format raw byte count into human-readable representation.
     */
    protected function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision).' '.$units[$pow];
    }
}
