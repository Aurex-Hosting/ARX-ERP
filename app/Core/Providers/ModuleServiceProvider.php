<?php

declare(strict_types=1);

namespace App\Core\Providers;

use App\Core\Models\Module;
use App\Core\Services\Mcp\McpRegistry;
use App\Core\Services\ModuleManager;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

/**
 * Service Provider responsible for dynamically discovering and booting enabled modules.
 */
class ModuleServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap enabled modules.
     */
    public function boot(ModuleManager $moduleManager, McpRegistry $mcpRegistry): void
    {
        // Don't execute database queries if migrations table doesn't exist yet (e.g. during fresh install)
        try {
            if (! Schema::hasTable('modules')) {
                return;
            }
        } catch (\Throwable) {
            return;
        }

        $enabledModules = Module::where('is_installed', true)
            ->where('is_enabled', true)
            ->get();

        foreach ($enabledModules as $module) {
            $this->bootModule($module, $mcpRegistry);
        }
    }

    /**
     * Boot an individual enabled module.
     */
    protected function bootModule(Module $module, McpRegistry $mcpRegistry): void
    {
        $area = $module->area;
        $slug = $module->slug;
        $name = $module->name;
        $manifest = $module->manifest ?? [];

        $modulePath = $manifest['path'] ?? null;
        if (! $modulePath || ! File::isDirectory($modulePath)) {
            $candidates = [
                base_path("modules/{$area}/{$name}"),
                base_path("modules/{$area}/{$slug}"),
                base_path("modules/shared/{$name}"),
                base_path("modules/shared/{$slug}"),
            ];
            $modulePath = null;
            foreach ($candidates as $candidate) {
                if (File::isDirectory($candidate)) {
                    $modulePath = $candidate;
                    break;
                }
            }
            if (! $modulePath) {
                return;
            }
        }

        // 1. Register module routes
        $apiRoutesPath = $modulePath.DIRECTORY_SEPARATOR.'Routes'.DIRECTORY_SEPARATOR.'api.php';
        if (File::exists($apiRoutesPath)) {
            $prefix = $area === 'admin' ? 'api/v1/admin' : 'api/v1';

            Route::middleware(['api', 'auth:sanctum'])
                ->prefix($prefix)
                ->group($apiRoutesPath);
        }

        // 2. Register module migrations
        $migrationsPath = $modulePath.DIRECTORY_SEPARATOR.'Database'.DIRECTORY_SEPARATOR.'Migrations';
        if (File::isDirectory($migrationsPath)) {
            $this->loadMigrationsFrom($migrationsPath);
        }

        // 3. Register module ServiceProvider if present
        $manifest = $module->manifest ?? [];
        $namespace = $manifest['namespace'] ?? null;
        if ($namespace) {
            $providerClass = "{$namespace}\\Providers\\{$module->name}ServiceProvider";
            if (class_exists($providerClass)) {
                $this->app->register($providerClass);
            }
        }
    }
}
