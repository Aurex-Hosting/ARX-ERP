<?php

declare(strict_types=1);

namespace App\Core\Providers;

use App\Core\Console\ModuleMakeCommand;
use App\Core\Services\HookManager;
use App\Core\Services\Mcp\McpRegistry;
use App\Core\Services\Mcp\ToolGateway;
use App\Core\Services\ModuleManager;
use App\Core\Services\NavigationBuilder;
use App\Core\Services\SettingsManager;
use App\Core\Services\ThemeManager;
use Illuminate\Support\ServiceProvider;

/**
 * Core Service Provider registering singletons and fundamental architecture bindings.
 */
class CoreServiceProvider extends ServiceProvider
{
    /**
     * Register services in the container.
     */
    public function register(): void
    {
        $this->app->singleton(HookManager::class, fn (): HookManager => new HookManager);

        $this->app->singleton(SettingsManager::class, fn (): SettingsManager => new SettingsManager);

        $this->app->singleton(ThemeManager::class, function ($app): ThemeManager {
            return new ThemeManager(
                $app->make(SettingsManager::class),
                $app->make(HookManager::class)
            );
        });

        $this->app->singleton(ModuleManager::class, function ($app): ModuleManager {
            return new ModuleManager(
                $app->make(HookManager::class)
            );
        });

        $this->app->singleton(NavigationBuilder::class, function ($app): NavigationBuilder {
            return new NavigationBuilder(
                $app->make(HookManager::class)
            );
        });

        $this->app->singleton(McpRegistry::class, fn (): McpRegistry => new McpRegistry);

        $this->app->singleton(ToolGateway::class, function ($app): ToolGateway {
            return new ToolGateway(
                $app->make(McpRegistry::class),
                $app->make(HookManager::class)
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                ModuleMakeCommand::class,
            ]);
        }
    }
}
