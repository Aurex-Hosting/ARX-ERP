<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\LoginHistory;
use App\Core\Services\LoginHistoryService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller managing login history monitoring, device fingerprint audit logs,
 * active session tracking, and revocation controls.
 */
class LoginHistoryController extends Controller
{
    public function __construct(
        protected LoginHistoryService $loginHistoryService
    ) {}

    /**
     * List login history records and session status with filtering and statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LoginHistory::with([
            'user:id,name,first_name,last_name,email,avatar_url,identifier,user_type',
            'revokedByUser:id,name',
            'token:id,name,last_used_at,created_at',
        ])->latest('login_at');

        // Filter: Status / Session Type
        $status = $request->query('status', 'all');
        if ($status === 'active') {
            $query->activeSessions();
        } elseif ($status === 'failed') {
            $query->failed();
        } elseif ($status === 'success') {
            $query->successful();
        } elseif ($status === 'revoked') {
            $query->where('is_revoked', true);
        } elseif ($status === 'expired') {
            $query->where('status', 'success')
                ->where('is_revoked', false)
                ->where(function ($q): void {
                    $q->whereNull('personal_access_token_id')
                        ->orWhereDoesntHave('token');
                });
        }

        // Filter: Specific User
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        // Filter: Search keyword
        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search): void {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('browser', 'like', "%{$search}%")
                    ->orWhere('platform', 'like', "%{$search}%")
                    ->orWhere('device_fingerprint', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search): void {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Filter: Date Range
        if ($request->filled('date_from')) {
            $query->where('login_at', '>=', $request->query('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->where('login_at', '<=', $request->query('date_to'));
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(5, min(100, $perPage));
        $paginated = $query->paginate($perPage);

        // Compute high-level session statistics
        $stats = [
            'total_count' => LoginHistory::count(),
            'active_count' => LoginHistory::activeSessions()->count(),
            'failed_count' => LoginHistory::failed()->count(),
            'revoked_count' => LoginHistory::where('is_revoked', true)->count(),
            'older_than_14_days_count' => LoginHistory::olderThanDays(14)->count(),
        ];

        // Format items with computed active flag
        $transformed = $paginated->getCollection()->map(function (LoginHistory $history): array {
            $isActive = $history->isSessionActive();

            return [
                'id' => $history->id,
                'user_id' => $history->user_id,
                'email' => $history->email,
                'status' => $history->status,
                'failure_reason' => $history->failure_reason,
                'ip_address' => $history->ip_address,
                'user_agent' => $history->user_agent,
                'device_type' => $history->device_type,
                'device_fingerprint' => $history->device_fingerprint,
                'browser' => $history->browser,
                'browser_version' => $history->browser_version,
                'platform' => $history->platform,
                'location' => $history->location,
                'is_active_session' => $isActive,
                'is_revoked' => $history->is_revoked,
                'revoked_at' => $history->revoked_at?->toIso8601String(),
                'revoked_by' => $history->revokedByUser?->name,
                'last_active_at' => $history->last_active_at?->toIso8601String(),
                'login_at' => $history->login_at->toIso8601String(),
                'user' => $history->user ? [
                    'id' => $history->user->id,
                    'identifier' => $history->user->identifier,
                    'name' => $history->user->name,
                    'email' => $history->user->email,
                    'user_type' => $history->user->user_type,
                    'avatar_url' => $history->user->avatar_url,
                ] : null,
            ];
        });

        return response()->json([
            'data' => $transformed,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Clear login history records older than 14 days.
     * Enforces strict safety policy (records <= 14 days old cannot be cleared).
     */
    public function clearOlder(Request $request): JsonResponse
    {
        $clearedCount = $this->loginHistoryService->clearOlderThan14Days();

        return response()->json([
            'message' => "Successfully purged {$clearedCount} login history records older than 14 days.",
            'cleared_count' => $clearedCount,
        ]);
    }

    /**
     * Revoke a specific active login session.
     */
    public function revoke(int $id, Request $request): JsonResponse
    {
        $revoked = $this->loginHistoryService->revokeSession($id, $request->user());

        if (! $revoked) {
            return response()->json([
                'message' => 'Login history record not found.',
            ], 404);
        }

        return response()->json([
            'message' => 'Session successfully revoked and invalidated.',
        ]);
    }

    /**
     * Revoke all active sessions (with option to include or exclude current caller session).
     */
    public function revokeAll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'include_self' => ['nullable', 'boolean'],
        ]);

        $targetUserId = isset($validated['user_id']) ? (int) $validated['user_id'] : null;
        $includeSelf = (bool) ($validated['include_self'] ?? false);
        $currentTokenId = $request->user()?->currentAccessToken()?->id;

        $revokedCount = $this->loginHistoryService->revokeAllSessions(
            userId: $targetUserId,
            includeSelf: $includeSelf,
            currentTokenId: $currentTokenId,
            revokedBy: $request->user()
        );

        return response()->json([
            'message' => "Successfully revoked {$revokedCount} active login session(s).",
            'revoked_count' => $revokedCount,
            'self_revoked' => $includeSelf,
        ]);
    }

    /**
     * Get login history for the currently authenticated user.
     */
    public function userHistory(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = LoginHistory::with([
            'token:id,name,last_used_at,created_at',
        ])
            ->where('user_id', $user->id)
            ->latest('login_at');

        $status = $request->query('status', 'all');
        if ($status === 'active') {
            $query->activeSessions();
        } elseif ($status === 'failed') {
            $query->failed();
        } elseif ($status === 'success') {
            $query->successful();
        } elseif ($status === 'revoked') {
            $query->where('is_revoked', true);
        }

        $perPage = (int) $request->query('per_page', 20);
        $paginated = $query->paginate($perPage);

        $stats = [
            'total_count' => LoginHistory::where('user_id', $user->id)->count(),
            'active_count' => LoginHistory::where('user_id', $user->id)->activeSessions()->count(),
            'failed_count' => LoginHistory::where('user_id', $user->id)->failed()->count(),
            'revoked_count' => LoginHistory::where('user_id', $user->id)->where('is_revoked', true)->count(),
        ];

        $transformed = $paginated->getCollection()->map(function (LoginHistory $history): array {
            $isActive = $history->isSessionActive();

            return [
                'id' => $history->id,
                'email' => $history->email,
                'ip_address' => $history->ip_address,
                'user_agent' => $history->user_agent,
                'device_type' => $history->device_type,
                'device_fingerprint' => $history->device_fingerprint,
                'browser' => $history->browser,
                'platform' => $history->platform,
                'location' => $history->location,
                'city' => $history->city,
                'country' => $history->country,
                'status' => $history->status,
                'failure_reason' => $history->failure_reason,
                'is_revoked' => (bool) $history->is_revoked,
                'revoked_at' => $history->revoked_at?->toIso8601String(),
                'is_active' => $isActive,
                'login_at' => $history->login_at->toIso8601String(),
                'last_activity_at' => $history->token?->last_used_at?->toIso8601String() ?? $history->login_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $transformed,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Revoke a single session owned by the authenticated user.
     */
    public function userRevoke(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        $history = LoginHistory::where('id', $id)->where('user_id', $user->id)->first();

        if (! $history) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        $this->loginHistoryService->revokeSession($id, $user);

        return response()->json(['message' => 'Session successfully revoked.']);
    }

    /**
     * Revoke all other sessions for the authenticated user.
     */
    public function userRevokeOther(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentTokenId = $user->currentAccessToken()?->id;

        $revokedCount = $this->loginHistoryService->revokeAllSessions(
            userId: $user->id,
            includeSelf: false,
            currentTokenId: $currentTokenId,
            revokedBy: $user
        );

        return response()->json([
            'message' => "Successfully revoked {$revokedCount} other active session(s).",
            'revoked_count' => $revokedCount,
        ]);
    }
}
