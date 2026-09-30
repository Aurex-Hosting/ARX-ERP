<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\AuditLog;
use App\Core\Services\BackupManager;
use App\Core\Services\SettingsManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Controller handling system backups, file downloads, atomic restores, and auto-backup policies.
 */
class BackupController extends Controller
{
    public function __construct(
        protected BackupManager $backupManager,
        protected SettingsManager $settingsManager
    ) {}

    /**
     * Check if actor has permission or super-admin access.
     */
    protected function checkPermission(Request $request, string $permission): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return true;
        }

        try {
            return $user->hasPermissionTo($permission);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * List all system backup archives.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.view')) {
            return response()->json([
                'message' => 'You do not have permission to view backup archives.',
            ], 403);
        }

        // Self-heal and trigger due auto backups on page load
        $this->backupManager->processScheduledAutoBackup();

        $backups = $this->backupManager->listBackups();
        $totalBytes = array_sum(array_column($backups, 'size_bytes'));

        return response()->json([
            'backups' => $backups,
            'total_count' => count($backups),
            'total_size_bytes' => $totalBytes,
            'total_size_formatted' => $this->formatBytes($totalBytes),
            'backup_dir' => $this->backupManager->getBackupDirectory(),
        ]);
    }

    /**
     * Create a new backup archive (full, db, or files).
     */
    public function store(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.create')) {
            return response()->json([
                'message' => 'You do not have permission to create backup archives.',
            ], 403);
        }

        $validated = $request->validate([
            'type' => ['nullable', 'string', 'in:full,db,files'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $type = $validated['type'] ?? 'full';
        $notes = $validated['notes'] ?? null;
        $user = $request->user();

        try {
            $backup = $this->backupManager->createBackup($type, $notes, $user);

            return response()->json([
                'message' => "Backup archive '{$backup['filename']}' created successfully.",
                'backup' => $backup,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => "Backup creation failed: {$e->getMessage()}",
            ], 500);
        }
    }

    /**
     * Download a specific backup archive.
     */
    public function download(Request $request, string $filename): BinaryFileResponse|JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.download')) {
            return response()->json([
                'message' => 'You do not have permission to download backup archives.',
            ], 403);
        }

        $safeFilename = basename($filename);
        $backupDir = $this->backupManager->getBackupDirectory();
        $filePath = "{$backupDir}/{$safeFilename}";

        if (! File::exists($filePath)) {
            return response()->json([
                'message' => "Backup archive '{$safeFilename}' not found on disk.",
            ], 404);
        }

        // Record Audit Trail for Download
        AuditLog::record(
            action: 'backup.download',
            description: ($request->user()?->name ?? 'User')." downloaded backup archive '{$safeFilename}'",
            metadata: [
                'filename' => $safeFilename,
                'size_bytes' => File::size($filePath),
            ],
            user: $request->user()
        );

        return response()->download($filePath, $safeFilename, [
            'Content-Type' => 'application/zip',
        ]);
    }

    /**
     * Restore system from an existing backup archive.
     */
    public function restore(Request $request, string $filename): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.restore')) {
            return response()->json([
                'message' => 'You do not have permission to perform system restore operations.',
            ], 403);
        }

        $safeFilename = basename($filename);
        $backupDir = $this->backupManager->getBackupDirectory();
        $filePath = "{$backupDir}/{$safeFilename}";

        if (! File::exists($filePath)) {
            return response()->json([
                'message' => "Backup archive '{$safeFilename}' not found on disk.",
            ], 404);
        }

        $user = $request->user();

        try {
            $result = $this->backupManager->restoreBackup($filePath, $user);

            return response()->json([
                'message' => 'System successfully restored from backup. All caches and registrars have been refreshed.',
                'result' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => "System restore failed: {$e->getMessage()}",
            ], 500);
        }
    }

    /**
     * Upload an external backup ZIP archive and restore immediately.
     */
    public function uploadAndRestore(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.restore')) {
            return response()->json([
                'message' => 'You do not have permission to perform system restore operations.',
            ], 403);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:zip', 'max:524288'], // max 512MB
        ]);

        $uploadedFile = $request->file('file');
        if (! $uploadedFile) {
            return response()->json([
                'message' => 'No backup file was uploaded.',
            ], 422);
        }

        $backupDir = $this->backupManager->getBackupDirectory();
        $originalName = $uploadedFile->getClientOriginalName();
        $targetFilename = 'uploaded_'.time().'_'.basename($originalName);
        $storedPath = $uploadedFile->move($backupDir, $targetFilename);

        $user = $request->user();

        try {
            $result = $this->backupManager->restoreBackup($storedPath->getRealPath(), $user);

            return response()->json([
                'message' => 'Uploaded backup archive successfully applied. All caches and routes have been re-synchronized.',
                'result' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => "Uploaded restore failed: {$e->getMessage()}",
            ], 500);
        }
    }

    /**
     * Delete a single backup archive from disk.
     */
    public function destroy(Request $request, string $filename): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.delete')) {
            return response()->json([
                'message' => 'You do not have permission to delete backup archives.',
            ], 403);
        }

        $safeFilename = basename($filename);
        $deleted = $this->backupManager->deleteBackup($safeFilename, $request->user());

        if (! $deleted) {
            return response()->json([
                'message' => "Backup archive '{$safeFilename}' not found on disk.",
            ], 404);
        }

        return response()->json([
            'message' => "Backup archive '{$safeFilename}' deleted successfully.",
        ]);
    }

    /**
     * Batch delete multiple backup archives.
     */
    public function batchDestroy(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.delete')) {
            return response()->json([
                'message' => 'You do not have permission to delete backup archives.',
            ], 403);
        }

        $validated = $request->validate([
            'filenames' => ['required', 'array', 'min:1'],
            'filenames.*' => ['string'],
        ]);

        $deletedCount = 0;
        foreach ($validated['filenames'] as $fn) {
            if ($this->backupManager->deleteBackup(basename($fn), $request->user())) {
                $deletedCount++;
            }
        }

        return response()->json([
            'message' => "Deleted {$deletedCount} backup archives.",
            'deleted_count' => $deletedCount,
        ]);
    }

    /**
     * Get automated backup settings and configuration.
     */
    public function getConfig(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.view')) {
            return response()->json([
                'message' => 'You do not have permission to view backup settings.',
            ], 403);
        }

        // Self-heal and trigger due auto backups
        $this->backupManager->processScheduledAutoBackup();

        $config = [
            'auto_backup_enabled' => (bool) $this->settingsManager->get('system.backup.auto_enabled', false),
            'schedule' => $this->settingsManager->get('system.backup.schedule', 'daily'),
            'time' => (string) $this->settingsManager->get('system.backup.auto_time', '00:00'),
            'timezone' => (string) config('app.timezone', 'UTC'),
            'last_auto_backup_at' => $this->settingsManager->get('system.backup.last_auto_backup_at'),
            'backup_type' => $this->settingsManager->get('system.backup.default_type', 'full'),
            'retention_count' => (int) $this->settingsManager->get('system.backup.retention_count', 10),
            'storage_driver' => 'local_disk',
            'backup_dir' => $this->backupManager->getBackupDirectory(),
        ];

        return response()->json([
            'config' => $config,
        ]);
    }

    /**
     * Update automated backup settings.
     */
    public function updateConfig(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'backups.create')) {
            return response()->json([
                'message' => 'You do not have permission to modify backup configuration.',
            ], 403);
        }

        $validated = $request->validate([
            'auto_backup_enabled' => ['required', 'boolean'],
            'schedule' => ['required', 'string', 'in:hourly,daily,weekly,monthly'],
            'time' => ['nullable', 'string', 'regex:/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/'],
            'timezone' => ['nullable', 'string', 'max:100'],
            'backup_type' => ['required', 'string', 'in:full,db,files'],
            'retention_count' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $this->settingsManager->set('system.backup.auto_enabled', $validated['auto_backup_enabled'] ? '1' : '0', 'system', 'boolean');
        $this->settingsManager->set('system.backup.schedule', $validated['schedule'], 'system', 'string');
        $this->settingsManager->set('system.backup.auto_time', $validated['time'] ?? '00:00', 'system', 'string');
        if (! empty($validated['timezone'])) {
            $this->settingsManager->set('system.backup.timezone', $validated['timezone'], 'system', 'string');
        }
        $this->settingsManager->set('system.backup.default_type', $validated['backup_type'], 'system', 'string');
        $this->settingsManager->set('system.backup.retention_count', (string) $validated['retention_count'], 'system', 'integer');

        // Immediately check if the newly configured schedule is due
        $this->backupManager->processScheduledAutoBackup();

        AuditLog::record(
            action: 'backup.config_update',
            description: ($request->user()?->name ?? 'User').' updated automated backup policies and retention settings',
            metadata: $validated,
            user: $request->user()
        );

        return response()->json([
            'message' => 'Backup settings updated successfully.',
            'config' => $validated,
        ]);
    }

    /**
     * Format bytes into human readable string.
     */
    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, 2).' '.$units[$pow];
    }
}
