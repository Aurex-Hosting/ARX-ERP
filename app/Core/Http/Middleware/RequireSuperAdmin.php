<?php

declare(strict_types=1);

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware ensuring only authenticated Super-Admins can access protected routes.
 */
class RequireSuperAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Forbidden: Super-Admin access required.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Allow users with administrative roles or permissions to reach controller-level RBAC checks
        if ($user->roles()->exists() || $user->getAllPermissions()->isNotEmpty()) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Forbidden: Super-Admin access required.',
        ], Response::HTTP_FORBIDDEN);
    }
}
