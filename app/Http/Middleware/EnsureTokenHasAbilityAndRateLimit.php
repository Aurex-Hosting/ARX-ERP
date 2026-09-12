<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpFoundation\IpUtils;

class EnsureTokenHasAbilityAndRateLimit
{
    public function handle(Request $request, Closure $next, string $ability = null): Response
    {
        if (! $request->user() || ! $request->user()->currentAccessToken()) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $token = $request->user()->currentAccessToken();
        $ip = $request->ip();

        // 1. Check Blocked IPs
        if (!empty($token->blocked_ips) && IpUtils::checkIp($ip, $token->blocked_ips)) {
            abort(403, 'Your IP address is blocked from using this API token.');
        }

        // 2. Check Allowed IPs
        if (!empty($token->allowed_ips) && !IpUtils::checkIp($ip, $token->allowed_ips)) {
            abort(403, 'Your IP address is not allowed to use this API token.');
        }

        // 3. Check Ability
        if ($ability && !$token->can($ability)) {
            abort(403, 'Your API token does not have the required ability: ' . $ability);
        }

        // 4. Check Rate Limit if configured
        if ($token->rate_limit > 0) {
            $key = 'api_token_rate_limit:' . $token->id;

            if (RateLimiter::tooManyRequests($key, $token->rate_limit)) {
                abort(429, 'API Rate Limit Exceeded for this token.');
            }

            RateLimiter::hit($key, 60); // 1 minute decay
        }

        return $next($request);
    }
}
