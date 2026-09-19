<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboardingIsComplete
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ($user->force_password_change || $user->force_profile_update)) {
            // Allow them to visit the onboarding page or logout
            if (! $request->routeIs('filament.dashboard.pages.onboarding') && 
                ! $request->routeIs('filament.dashboard.auth.logout') &&
                ! $request->routeIs('livewire.update') // Allow livewire calls to process on the onboarding page
            ) {
                return redirect()->route('filament.dashboard.pages.onboarding');
            }
        }

        return $next($request);
    }
}
