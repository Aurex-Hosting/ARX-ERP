<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\AuditLog;
use App\Core\Models\LoginHistory;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Service managing login history tracking, device fingerprinting, session lifecycle,
 * and security cleanup policies.
 */
class LoginHistoryService
{
    public function __construct(
        protected ?NotificationService $notificationService = null
    ) {
        $this->notificationService = $notificationService ?? app(NotificationService::class);
    }

    /**
     * Record a login attempt (successful or failed).
     */
    public function recordLogin(
        Request $request,
        string $email,
        bool $success,
        ?User $user = null,
        ?string $failureReason = null,
        ?PersonalAccessToken $token = null
    ): LoginHistory {
        $userAgent = $request->userAgent() ?? '';
        $ip = $request->ip();

        $clientInfo = $this->parseUserAgent($userAgent);
        $fingerprint = $this->resolveDeviceFingerprint($request);
        $location = $this->resolveLocation($request, $ip);

        $history = LoginHistory::create([
            'user_id' => $user?->id,
            'personal_access_token_id' => $token?->id,
            'email' => $email,
            'status' => $success ? 'success' : 'failed',
            'failure_reason' => $failureReason,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'device_type' => $clientInfo['device_type'],
            'device_fingerprint' => $fingerprint,
            'browser' => $clientInfo['browser'],
            'browser_version' => $clientInfo['browser_version'],
            'platform' => $clientInfo['platform'],
            'location' => $location,
            'is_revoked' => false,
            'last_active_at' => $success ? now() : null,
            'login_at' => now(),
        ]);

        if ($success && $user) {
            // Check if this IP or fingerprint has been seen before for this user
            $previousLoginsCount = LoginHistory::where('user_id', $user->id)
                ->where('id', '!=', $history->id)
                ->where('status', 'success')
                ->where(function ($q) use ($ip, $fingerprint) {
                    $q->where('ip_address', $ip)
                        ->orWhere('device_fingerprint', $fingerprint);
                })
                ->count();

            $isNew = $previousLoginsCount === 0;
            $this->notificationService?->sendLoginAlert($user, $history, $isNew);
        }

        return $history;
    }

    /**
     * Update the last active timestamp for an active session token.
     */
    public function updateLastActive(int|PersonalAccessToken $token): void
    {
        $tokenId = $token instanceof PersonalAccessToken ? $token->id : $token;

        LoginHistory::where('personal_access_token_id', $tokenId)
            ->where('is_revoked', false)
            ->update(['last_active_at' => now()]);
    }

    /**
     * Revoke a specific active session.
     */
    public function revokeSession(int $historyId, ?User $revokedBy = null): bool
    {
        $history = LoginHistory::find($historyId);

        if (! $history) {
            return false;
        }

        // Delete associated Sanctum token if present
        if ($history->personal_access_token_id) {
            PersonalAccessToken::where('id', $history->personal_access_token_id)->delete();
        }

        $history->update([
            'is_revoked' => true,
            'revoked_at' => now(),
            'revoked_by' => $revokedBy?->id,
        ]);

        $actor = $revokedBy?->name ?? 'System';
        $targetEmail = $history->email;
        AuditLog::record(
            action: 'session_revoked',
            description: "{$actor} revoked login session #{$history->id} ({$targetEmail}, {$history->browser} on {$history->platform}, IP {$history->ip_address})",
            model: $history,
            metadata: [
                'session_id' => $history->id,
                'target_user_id' => $history->user_id,
                'email' => $targetEmail,
                'ip_address' => $history->ip_address,
                'browser' => $history->browser,
                'platform' => $history->platform,
            ],
            user: $revokedBy
        );

        return true;
    }

    /**
     * Revoke all active sessions.
     *
     * @param  int|null  $userId  Specific user or null for all users
     * @param  bool  $includeSelf  Whether to revoke current active token as well
     * @param  int|null  $currentTokenId  Current token ID to exclude if includeSelf is false
     * @param  User|null  $revokedBy  Admin performing the revocation
     * @return int Number of revoked sessions
     */
    public function revokeAllSessions(
        ?int $userId = null,
        bool $includeSelf = true,
        ?int $currentTokenId = null,
        ?User $revokedBy = null
    ): int {
        $tokenQuery = PersonalAccessToken::query();
        $historyQuery = LoginHistory::where('status', 'success')->where('is_revoked', false);

        if ($userId) {
            $tokenQuery->where('tokenable_id', $userId)->where('tokenable_type', User::class);
            $historyQuery->where('user_id', $userId);
        }

        if (! $includeSelf && $currentTokenId) {
            $tokenQuery->where('id', '!=', $currentTokenId);
            $historyQuery->where('personal_access_token_id', '!=', $currentTokenId);
        }

        $tokenQuery->delete();

        $revokedCount = $historyQuery->update([
            'is_revoked' => true,
            'revoked_at' => now(),
            'revoked_by' => $revokedBy?->id,
        ]);

        $actor = $revokedBy?->name ?? 'System';
        $targetScope = $userId ? "for user ID #{$userId}" : 'across all users';
        AuditLog::record(
            action: 'sessions_revoked_all',
            description: "{$actor} revoked {$revokedCount} active login session(s) {$targetScope}",
            metadata: [
                'revoked_count' => $revokedCount,
                'target_user_id' => $userId,
                'include_self' => $includeSelf,
            ],
            user: $revokedBy
        );

        return $revokedCount;
    }

    /**
     * Clear login history records older than 14 days.
     * Strictly enforces the retention window (records <= 14 days old cannot be deleted).
     */
    public function clearOlderThan14Days(): int
    {
        $cutoffDate = now()->subDays(14);

        $clearedCount = LoginHistory::where('login_at', '<', $cutoffDate)->delete();

        AuditLog::record(
            action: 'login_history_purged',
            description: "Purged {$clearedCount} login history record(s) older than 14 days (prior to {$cutoffDate->toDateTimeString()})",
            metadata: [
                'purged_count' => $clearedCount,
                'cutoff_date' => $cutoffDate->toIso8601String(),
            ]
        );

        return $clearedCount;
    }

    /**
     * Parse User-Agent into platform, browser, version, and device type.
     *
     * @return array{platform: string, browser: string, browser_version: string, device_type: string}
     */
    public function parseUserAgent(string $ua): array
    {
        $platform = 'Unknown OS';
        $browser = 'Unknown Browser';
        $version = '';
        $deviceType = 'desktop';

        if (empty($ua)) {
            return [
                'platform' => $platform,
                'browser' => $browser,
                'browser_version' => $version,
                'device_type' => $deviceType,
            ];
        }

        // Platform detection (check mobile/tablets first before generic macOS/Linux strings)
        if (preg_match('/iphone/i', $ua)) {
            $platform = 'iOS (iPhone)';
            $deviceType = 'mobile';
        } elseif (preg_match('/ipad/i', $ua)) {
            $platform = 'iPadOS (iPad)';
            $deviceType = 'tablet';
        } elseif (preg_match('/android/i', $ua)) {
            $platform = 'Android';
            $deviceType = preg_match('/mobile/i', $ua) ? 'mobile' : 'tablet';
        } elseif (preg_match('/windows nt 10\.0/i', $ua)) {
            $platform = 'Windows 10/11';
        } elseif (preg_match('/windows nt 6\.3/i', $ua)) {
            $platform = 'Windows 8.1';
        } elseif (preg_match('/windows nt 6\.1/i', $ua)) {
            $platform = 'Windows 7';
        } elseif (preg_match('/windows nt/i', $ua)) {
            $platform = 'Windows';
        } elseif (preg_match('/macintosh|mac os x/i', $ua)) {
            $platform = 'macOS';
        } elseif (preg_match('/cros/i', $ua)) {
            $platform = 'Chrome OS';
        } elseif (preg_match('/linux/i', $ua)) {
            $platform = 'Linux';
        }

        // Browser detection
        if (preg_match('/edg(?:e)?\/([0-9\.]+)/i', $ua, $matches)) {
            $browser = 'Microsoft Edge';
            $version = $matches[1];
        } elseif (preg_match('/opr\/([0-9\.]+)/i', $ua, $matches)) {
            $browser = 'Opera';
            $version = $matches[1];
        } elseif (preg_match('/brave\/([0-9\.]+)/i', $ua, $matches)) {
            $browser = 'Brave';
            $version = $matches[1];
        } elseif (preg_match('/chrome\/([0-9\.]+)/i', $ua, $matches)) {
            $browser = 'Google Chrome';
            $version = $matches[1];
        } elseif (preg_match('/firefox\/([0-9\.]+)/i', $ua, $matches)) {
            $browser = 'Mozilla Firefox';
            $version = $matches[1];
        } elseif (preg_match('/version\/([0-9\.]+).*safari/i', $ua, $matches)) {
            $browser = 'Safari';
            $version = $matches[1];
        } elseif (preg_match('/postmanruntime\/([0-9\.]+)/i', $ua, $matches)) {
            $browser = 'Postman';
            $version = $matches[1];
            $deviceType = 'bot';
        } elseif (preg_match('/curl\/([0-9\.]+)/i', $ua, $matches)) {
            $browser = 'cURL';
            $version = $matches[1];
            $deviceType = 'bot';
        }

        return [
            'platform' => $platform,
            'browser' => $browser,
            'browser_version' => $version,
            'device_type' => $deviceType,
        ];
    }

    /**
     * Resolve device fingerprint from request header or generate client fingerprint hash.
     */
    public function resolveDeviceFingerprint(Request $request): string
    {
        // 1. Explicit Client Fingerprint Header
        $customFingerprint = $request->header('X-Device-Fingerprint') ?: $request->input('device_fingerprint');
        if (is_string($customFingerprint) && ! empty($customFingerprint)) {
            return substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', $customFingerprint), 0, 64);
        }

        // 2. Synthesize Deterministic Fingerprint from Request Headers
        $ua = $request->userAgent() ?? 'none';
        $ip = $request->ip() ?? '127.0.0.1';
        $lang = $request->header('Accept-Language') ?? 'en';
        $encoding = $request->header('Accept-Encoding') ?? 'gzip';

        return hash('sha256', "{$ip}|{$ua}|{$lang}|{$encoding}");
    }

    /**
     * Resolve user readable location from IP / headers.
     */
    public function resolveLocation(Request $request, ?string $ip): string
    {
        // Check Cloudflare or Reverse Proxy country headers
        $country = $request->header('CF-IPCountry')
            ?: $request->header('X-Country-Code')
            ?: $request->header('X-Geo-Country');

        if ($country) {
            return strtoupper((string) $country);
        }

        if (! $ip || $ip === '127.0.0.1' || $ip === '::1' || str_starts_with($ip, '192.168.') || str_starts_with($ip, '10.')) {
            return 'Localhost / Internal';
        }

        return 'Public Network';
    }
}
