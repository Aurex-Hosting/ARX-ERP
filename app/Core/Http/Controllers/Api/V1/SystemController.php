<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Services\SystemManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Controller providing comprehensive System Overview metrics, Process Supervisor, and Cache Management endpoints.
 */
class SystemController extends Controller
{
    public function __construct(
        protected SystemManager $systemManager
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
            return $user->hasPermissionTo($permission) || $user->hasPermissionTo('system.manage');
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Get host hardware metrics, database latency, runtime environment, and OPcache status.
     */
    public function overview(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.view')) {
            return response()->json(['message' => 'Unauthorized access to system overview.'], 403);
        }

        $data = $this->systemManager->getOverviewData();

        return response()->json($data);
    }

    /**
     * Get process supervisor state for Octane, Queue Workers, and Cron Scheduler.
     */
    public function processes(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.view')) {
            return response()->json(['message' => 'Unauthorized access to process supervisor.'], 403);
        }

        $data = $this->systemManager->getProcessesData();

        return response()->json($data);
    }

    /**
     * Trigger graceful reload of Octane HTTP workers.
     */
    public function reloadOctane(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.manage')) {
            return response()->json(['message' => 'Unauthorized to reload Octane workers.'], 403);
        }

        $result = $this->systemManager->reloadOctane($request->user());

        return response()->json($result);
    }

    /**
     * Restart all queue workers by broadcasting queue:restart signal.
     */
    public function restartWorkers(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.manage')) {
            return response()->json(['message' => 'Unauthorized to restart queue workers.'], 403);
        }

        $result = $this->systemManager->restartQueueWorkers($request->user());

        return response()->json($result);
    }

    /**
     * Restart both Octane server and queue workers.
     */
    public function restartAll(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.manage')) {
            return response()->json(['message' => 'Unauthorized to restart system services.'], 403);
        }

        $result = $this->systemManager->restartAll($request->user());

        return response()->json($result);
    }

    /**
     * Spawn detached queue worker process loops.
     */
    public function addWorker(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.manage')) {
            return response()->json(['message' => 'Unauthorized to start queue workers.'], 403);
        }

        $validated = $request->validate([
            'queues' => ['nullable', 'string', 'max:255'],
            'count' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        $queues = $validated['queues'] ?? 'critical,high,medium,default,low';
        $count = (int) ($validated['count'] ?? 1);

        $result = $this->systemManager->addQueueWorkers($queues, $count, $request->user());

        return response()->json($result);
    }

    /**
     * Get inspection status for all system cache stores and compiled layers.
     */
    public function cacheStatus(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.view')) {
            return response()->json(['message' => 'Unauthorized access to cache status.'], 403);
        }

        $data = $this->systemManager->getCacheData();

        return response()->json($data);
    }

    /**
     * Clear or rebuild a specific cache layer.
     */
    public function clearCache(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.manage')) {
            return response()->json(['message' => 'Unauthorized to clear system caches.'], 403);
        }

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:all,application,config,route,view,event,opcache'],
            'rebuild' => ['nullable', 'boolean'],
        ]);

        $type = $validated['type'];
        $rebuild = (bool) ($validated['rebuild'] ?? false);

        $result = $this->systemManager->clearCacheLayer($type, $rebuild, $request->user());

        return response()->json($result, $result['success'] ? 200 : 500);
    }

    /**
     * Get maintenance mode status.
     */
    public function maintenanceStatus(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.view')) {
            return response()->json(['message' => 'Unauthorized access to maintenance status.'], 403);
        }

        $data = $this->systemManager->getMaintenanceStatus();

        return response()->json($data);
    }

    /**
     * Toggle maintenance mode on or off.
     */
    public function toggleMaintenance(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.manage')) {
            return response()->json(['message' => 'Unauthorized to toggle maintenance mode.'], 403);
        }

        $validated = $request->validate([
            'enable' => ['required', 'boolean'],
            'secret' => ['nullable', 'string', 'max:100'],
        ]);

        $result = $this->systemManager->toggleMaintenance(
            (bool) $validated['enable'],
            $validated['secret'] ?? null,
            $request->user()
        );

        return response()->json($result);
    }

    /**
     * List loaded PHP extensions and versions.
     */
    public function extensions(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'system.view')) {
            return response()->json(['message' => 'Unauthorized access to extensions list.'], 403);
        }

        $data = $this->systemManager->getExtensions();

        return response()->json($data);
    }
}
