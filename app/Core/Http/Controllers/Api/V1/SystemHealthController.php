<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\Module;
use App\Core\Services\UpdateManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Controller providing system health checks for database, cache, and platform metrics.
 */
class SystemHealthController extends Controller
{
    /**
     * Check system health status.
     */
    public function index(): JsonResponse
    {
        $dbStatus = 'ok';
        try {
            DB::connection()->getPdo();
        } catch (\Throwable $e) {
            $dbStatus = 'error: '.$e->getMessage();
        }

        $cacheStatus = 'ok';
        try {
            Cache::put('arx:health_check', true, 10);
            $cacheStatus = Cache::get('arx:health_check') ? 'ok' : 'failed';
        } catch (\Throwable $e) {
            $cacheStatus = 'error: '.$e->getMessage();
        }

        $activeModulesCount = 0;
        try {
            $activeModulesCount = Module::where('is_installed', true)->where('is_enabled', true)->count();
        } catch (\Throwable) {
            // Migrations not run yet
        }

        $isHealthy = $dbStatus === 'ok' && $cacheStatus === 'ok';

        $version = config('arx.version', '1.0.0');
        try {
            $version = app(UpdateManager::class)->getCurrentVersion()['version'] ?? $version;
        } catch (\Throwable) {
            // fallback
        }

        return response()->json([
            'status' => $isHealthy ? 'healthy' : 'degraded',
            'version' => $version,
            'app_name' => config('arx.name', 'ARX-ERP'),
            'checks' => [
                'database' => $dbStatus,
                'cache' => $cacheStatus,
            ],
            'modules_enabled' => $activeModulesCount,
            'timestamp' => now()->toIso8601String(),
        ], $isHealthy ? 200 : 503);
    }
}
