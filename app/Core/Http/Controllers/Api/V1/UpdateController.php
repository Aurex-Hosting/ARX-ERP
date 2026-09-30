<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\AuditLog;
use App\Core\Services\LicenseManager;
use App\Core\Services\SettingsManager;
use App\Core\Services\UpdateManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class UpdateController extends Controller
{
    public function __construct(
        protected UpdateManager $updateManager,
        protected LicenseManager $licenseManager,
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
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Get system version, licensing, backup eligibility, and update status.
     */
    public function status(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'updates.check') && ! $this->checkPermission($request, 'updates.license_info')) {
            return response()->json([
                'message' => 'You do not have permission to view system update and licensing status.',
            ], 403);
        }

        $currentVersion = $this->updateManager->getCurrentVersion();
        $installationId = $this->licenseManager->getInstallationId();
        $licenseStatus = $this->licenseManager->getLicenseStatus();
        $backupEligibility = $this->updateManager->checkBackupEligibility();
        $rollbackInfo = $this->updateManager->getRollbackInfo();

        $cachedUpdateJson = $this->settingsManager->get('system.updates.latest_info');
        $cachedUpdate = null;
        if ($cachedUpdateJson) {
            try {
                $cachedUpdate = json_decode((string) $cachedUpdateJson, true);
            } catch (Throwable) {
                $cachedUpdate = null;
            }
        }

        $lastCheckedAt = $this->settingsManager->get('system.updates.last_checked_at');

        return response()->json([
            'current_version' => $currentVersion,
            'installation_id' => $installationId,
            'license' => $licenseStatus,
            'cached_update' => $cachedUpdate,
            'last_checked_at' => $lastCheckedAt,
            'backup_status' => $backupEligibility,
            'rollback_info' => $rollbackInfo,
        ]);
    }

    /**
     * Trigger on-demand update check against central license server.
     */
    public function check(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'updates.check')) {
            return response()->json([
                'message' => 'You do not have permission to check for system updates.',
            ], 403);
        }

        $result = $this->updateManager->checkForUpdates();
        $backupEligibility = $this->updateManager->checkBackupEligibility();

        $actor = $request->user()?->name ?? 'System';
        $hasUpdate = ! empty($result['update_available']);
        AuditLog::record(
            action: 'update_checked',
            description: "{$actor} checked for system updates: ".($hasUpdate ? "v{$result['latest_version']} available" : 'System is up to date'),
            metadata: [
                'current_version' => $result['current_version'] ?? null,
                'latest_version' => $result['latest_version'] ?? null,
                'update_available' => $hasUpdate,
                'release_name' => $result['name'] ?? null,
            ],
            user: $request->user()
        );

        return response()->json([
            'success' => true,
            'data' => $result,
            'backup_status' => $backupEligibility,
        ]);
    }

    /**
     * Download and apply system update with instant rollback protection.
     */
    public function apply(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'updates.apply')) {
            return response()->json([
                'message' => 'You do not have permission to download and apply system updates.',
            ], 403);
        }

        // 1. Safety Gatekeeper: Ensure backup was created in the last 1 hour
        $backupEligibility = $this->updateManager->checkBackupEligibility();
        if (! $backupEligibility['eligible']) {
            return response()->json([
                'success' => false,
                'backup_required' => true,
                'message' => $backupEligibility['message'],
            ], 422);
        }

        // 2. Resolve update package details
        $releaseName = $request->input('release_name');
        $expectedHash = $request->input('zip_hash');
        $targetVersion = $request->input('version');
        $releaseNotes = $request->input('notes');

        if (empty($releaseName) || empty($targetVersion)) {
            $cachedUpdateJson = $this->settingsManager->get('system.updates.latest_info');
            if ($cachedUpdateJson) {
                try {
                    $cached = json_decode((string) $cachedUpdateJson, true);
                    $releaseName = $releaseName ?: ($cached['name'] ?? null);
                    $expectedHash = $expectedHash ?: ($cached['zip_hash'] ?? null);
                    $targetVersion = $targetVersion ?: ($cached['latest_version'] ?? null);
                    $releaseNotes = $releaseNotes ?: ($cached['notes'] ?? null);
                } catch (Throwable) {
                    // ignore
                }
            }
        }

        if (empty($releaseName) || empty($targetVersion)) {
            return response()->json([
                'success' => false,
                'message' => 'No pending update package details found. Please check for updates first.',
            ], 422);
        }

        $actor = $request->user()?->name ?? 'System';

        try {
            // Download & verify SHA256 integrity (server expects version identifier as Relesename)
            $downloadIdentifier = (string) ($targetVersion ?: $releaseName);
            $zipPath = $this->updateManager->downloadAndVerifyUpdate($downloadIdentifier, (string) ($expectedHash ?? ''));

            // Apply update with rollback snapshot
            $result = $this->updateManager->applyUpdate($zipPath, (string) $targetVersion, $releaseNotes);

            // Audit Trail
            AuditLog::record(
                action: 'update_applied',
                description: "{$actor} updated system to v{$targetVersion}",
                metadata: [
                    'previous_version' => $result['previous_version'] ?? null,
                    'target_version' => $targetVersion,
                    'release_name' => $releaseName,
                    'checksum' => $expectedHash,
                ],
                user: $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'installed_version' => $result['installed_version'],
                'previous_version' => $result['previous_version'],
            ]);
        } catch (Throwable $e) {
            AuditLog::record(
                action: 'update_failed',
                description: "{$actor} attempted update to v{$targetVersion} but failed: {$e->getMessage()}",
                metadata: [
                    'target_version' => $targetVersion,
                    'release_name' => $releaseName,
                    'error' => $e->getMessage(),
                ],
                user: $request->user()
            );

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore system code to previous rollback snapshot.
     */
    public function rollback(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'updates.revoke')) {
            return response()->json([
                'message' => 'You do not have permission to revoke system updates.',
            ], 403);
        }

        $actor = $request->user()?->name ?? 'System';

        try {
            $result = $this->updateManager->executeRollback();

            AuditLog::record(
                action: 'update_rollback',
                description: "{$actor} rolled back system to v{$result['restored_version']}",
                metadata: $result,
                user: $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'restored_version' => $result['restored_version'],
            ]);
        } catch (Throwable $e) {
            AuditLog::record(
                action: 'update_rollback_failed',
                description: "{$actor} attempted rollback but failed: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()],
                user: $request->user()
            );

            return response()->json([
                'success' => false,
                'message' => "Rollback failed: {$e->getMessage()}",
            ], 500);
        }
    }
}
