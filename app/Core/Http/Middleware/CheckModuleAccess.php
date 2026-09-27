<?php

declare(strict_types=1);

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware ensuring user has permission to access the requested module.
 */
class CheckModuleAccess
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if (! $user->hasPermissionTo($permission, 'sanctum') && ! $user->hasPermissionTo($permission, 'web')) {
            return response()->json([
                'message' => "Forbidden: Missing permission '{$permission}'.",
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
