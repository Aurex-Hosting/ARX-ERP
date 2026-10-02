<?php

declare(strict_types=1);

use App\Core\Http\Middleware\CheckModuleAccess;
use App\Core\Http\Middleware\ForceJsonResponse;
use App\Core\Http\Middleware\RequireSuperAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;

// Polyfill POSIX signal constants on Windows CLI for Octane server support
if (! defined('SIGINT')) {
    define('SIGINT', 2);
}
if (! defined('SIGTERM')) {
    define('SIGTERM', 15);
}
if (! defined('SIGHUP')) {
    define('SIGHUP', 1);
}

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            ForceJsonResponse::class,
        ]);

        $middleware->alias([
            'super_admin' => RequireSuperAdmin::class,
            'module.access' => CheckModuleAccess::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
