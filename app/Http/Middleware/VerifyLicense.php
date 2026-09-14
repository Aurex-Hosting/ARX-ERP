<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\LicenseManager;
use Carbon\Carbon;

class VerifyLicense
{
    public function handle(Request $request, Closure $next): Response
    {
        // Exclude the error route to prevent redirect loops
        if ($request->is("license-error")) {
            return $next($request);
        }

        $licenseManager = app(LicenseManager::class);
        $status = $licenseManager->getLicenseStatus();

        // 1. Basic validation (Success flag + not frozen)
        if (!$status || empty($status["success"]) || $status["success"] !== true || !empty($status["isFrozen"])) {
            return redirect()->route("license.error");
        }

        // 2. Expiration validation
        if (!empty($status["expiresAt"])) {
            $expires = Carbon::parse($status["expiresAt"]);
            if (now()->isAfter($expires)) {
                return redirect()->route("license.error");
            }
        }

        return $next($request);
    }
}
