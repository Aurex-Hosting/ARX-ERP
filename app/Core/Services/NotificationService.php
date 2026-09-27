<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\BroadcastNotification;
use App\Core\Models\LoginHistory;
use App\Core\Models\UserNotification;
use App\Core\Models\UserNotificationReaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Service orchestrating system notifications, login alerts, security broadcasts,
 * emoji reactions, and targeted delivery pipelines.
 */
class NotificationService
{
    public function __construct(
        protected ?MailService $mailService = null
    ) {
        $this->mailService = $mailService ?? app(MailService::class);
    }

    /**
     * Send a direct notification to an individual user.
     */
    public function sendToUser(
        User|int $user,
        string $title,
        string $body,
        string $type = 'info',
        string $category = 'system',
        ?array $actionButtons = null,
        bool $enableReactions = false,
        ?array $metadata = null,
        ?int $broadcastId = null
    ): UserNotification {
        $userId = $user instanceof User ? $user->id : $user;

        return UserNotification::create([
            'user_id' => $userId,
            'broadcast_notification_id' => $broadcastId,
            'title' => $title,
            'body' => $body,
            'type' => $type,
            'category' => $category,
            'action_buttons' => $actionButtons,
            'enable_reactions' => $enableReactions,
            'metadata' => $metadata,
            'read_at' => null,
            'dismissed_at' => null,
        ]);
    }

    /**
     * Send a real-time login activity alert to the authenticated user.
     */
    public function sendLoginAlert(User $user, LoginHistory $history, bool $isNewDeviceOrIp = false): ?UserNotification
    {
        $device = $history->browser ?: 'Unknown Browser';
        $platform = $history->platform ?: 'Unknown OS';
        $location = $history->location ?: 'Local Network';
        $ip = $history->ip_address ?: '127.0.0.1';
        $timeStr = Carbon::parse($history->login_at)->format('M d, Y H:i:s');

        $title = $isNewDeviceOrIp
            ? 'Security Alert: New Sign-in Detected'
            : 'New Sign-in Session Detected';

        $body = "A new login was recorded on {$device} on {$platform} from IP {$ip} ({$location}) at {$timeStr}.";

        $actionButtons = [
            [
                'label' => 'View Login History',
                'url' => '/login-history',
                'action_tab' => 'login-history',
                'action_subtab' => 'history',
                'style' => 'primary',
                'external' => false,
            ],
        ];

        return $this->sendToUser(
            user: $user,
            title: $title,
            body: $body,
            type: $isNewDeviceOrIp ? 'warning' : 'info',
            category: 'login_alert',
            actionButtons: $actionButtons,
            enableReactions: false,
            metadata: [
                'login_history_id' => $history->id,
                'ip_address' => $ip,
                'browser' => $device,
                'platform' => $platform,
                'location' => $location,
                'device_fingerprint' => $history->device_fingerprint,
            ]
        );
    }

    /**
     * Send a security alert (e.g. password changed, 2FA enabled/disabled, sessions revoked).
     */
    public function sendSecurityAlert(
        User $user,
        string $title,
        string $body,
        ?array $actionButtons = null,
        ?array $metadata = null
    ): UserNotification {
        return $this->sendToUser(
            user: $user,
            title: $title,
            body: $body,
            type: 'security',
            category: 'security_alert',
            actionButtons: $actionButtons ?? [
                [
                    'label' => 'Account Security',
                    'url' => '/profile#security',
                    'action_tab' => 'profile',
                    'action_subtab' => 'security',
                    'style' => 'primary',
                    'external' => false,
                ],
            ],
            enableReactions: false,
            metadata: $metadata
        );
    }

    /**
     * Create and dispatch (or schedule) an admin broadcast notification.
     *
     * @param  array<string, mixed>  $data
     */
    public function createAndDispatchBroadcast(array $data, ?User $creator = null): BroadcastNotification
    {
        $scheduledAt = ! empty($data['scheduled_at']) ? Carbon::parse($data['scheduled_at']) : null;
        $isScheduled = $scheduledAt && $scheduledAt->isFuture();

        $targetUserIds = $this->resolveTargetUserIds(
            targetType: $data['target_type'] ?? 'all',
            targetUserIds: $data['target_user_ids'] ?? [],
            targetRoleIds: $data['target_role_ids'] ?? [],
            excludedUserIds: $data['excluded_user_ids'] ?? [],
            excludedRoleIds: $data['excluded_role_ids'] ?? []
        );

        $broadcast = BroadcastNotification::create([
            'title' => $data['title'],
            'body' => $data['body'],
            'type' => $data['type'] ?? 'info',
            'action_buttons' => $data['action_buttons'] ?? [],
            'enable_reactions' => $data['enable_reactions'] ?? true,
            'send_email' => (bool) ($data['send_email'] ?? false),
            'email_subject' => $data['email_subject'] ?? null,
            'target_type' => $data['target_type'] ?? 'all',
            'target_user_ids' => $data['target_user_ids'] ?? [],
            'target_role_ids' => $data['target_role_ids'] ?? [],
            'excluded_user_ids' => $data['excluded_user_ids'] ?? [],
            'excluded_role_ids' => $data['excluded_role_ids'] ?? [],
            'scheduled_at' => $scheduledAt,
            'repeat_interval' => $data['repeat_interval'] ?? null,
            'status' => $isScheduled ? 'scheduled' : 'sent',
            'created_by' => $creator?->id ?? auth()->id(),
            'recipients_count' => count($targetUserIds),
            'sent_at' => $isScheduled ? null : now(),
        ]);

        if (! $isScheduled) {
            $this->dispatchBroadcastNotification($broadcast);
        }

        return $broadcast;
    }

    /**
     * Resolve the target user IDs based on audience selection rules.
     *
     * @param  array<int>  $targetUserIds
     * @param  array<int|string>  $targetRoleIds
     * @param  array<int>  $excludedUserIds
     * @param  array<int|string>  $excludedRoleIds
     * @return array<int>
     */
    public function resolveTargetUserIds(
        string $targetType,
        array $targetUserIds = [],
        array $targetRoleIds = [],
        array $excludedUserIds = [],
        array $excludedRoleIds = []
    ): array {
        $query = User::query()->select('id');

        switch ($targetType) {
            case 'users':
                $query->whereIn('id', $targetUserIds);
                break;

            case 'roles':
                $query->whereHas('roles', function (Builder $q) use ($targetRoleIds) {
                    $q->whereIn('roles.id', $targetRoleIds)
                        ->orWhereIn('roles.name', $targetRoleIds);
                });
                break;

            case 'all_except_users':
                if (! empty($excludedUserIds)) {
                    $query->whereNotIn('id', $excludedUserIds);
                }
                break;

            case 'all_except_roles':
                if (! empty($excludedRoleIds)) {
                    $query->whereDoesntHave('roles', function (Builder $q) use ($excludedRoleIds) {
                        $q->whereIn('roles.id', $excludedRoleIds)
                            ->orWhereIn('roles.name', $excludedRoleIds);
                    });
                }
                break;

            case 'all':
            default:
                // All active users
                break;
        }

        return $query->pluck('id')->all();
    }

    /**
     * Preview target audience stats given criteria.
     *
     * @param  array<string, mixed>  $criteria
     * @return array<string, mixed>
     */
    public function previewTargetAudience(array $criteria): array
    {
        $targetType = $criteria['target_type'] ?? 'all';
        $targetUserIds = $criteria['target_user_ids'] ?? [];
        $targetRoleIds = $criteria['target_role_ids'] ?? [];
        $excludedUserIds = $criteria['excluded_user_ids'] ?? [];
        $excludedRoleIds = $criteria['excluded_role_ids'] ?? [];

        $userIds = $this->resolveTargetUserIds(
            $targetType,
            $targetUserIds,
            $targetRoleIds,
            $excludedUserIds,
            $excludedRoleIds
        );

        $matchingUsers = User::whereIn('id', array_slice($userIds, 0, 10))
            ->select('id', 'name', 'email', 'avatar_url', 'user_type')
            ->get();

        return [
            'target_type' => $targetType,
            'total_recipients' => count($userIds),
            'sample_recipients' => $matchingUsers,
        ];
    }

    /**
     * Deliver a broadcast notification to all resolved target users.
     */
    public function dispatchBroadcastNotification(BroadcastNotification $broadcast): int
    {
        $userIds = $this->resolveTargetUserIds(
            $broadcast->target_type,
            $broadcast->target_user_ids ?? [],
            $broadcast->target_role_ids ?? [],
            $broadcast->excluded_user_ids ?? [],
            $broadcast->excluded_role_ids ?? []
        );

        if (empty($userIds)) {
            $broadcast->update([
                'status' => 'sent',
                'sent_at' => now(),
                'recipients_count' => 0,
            ]);

            return 0;
        }

        $now = now();
        $actionButtonsJson = ! empty($broadcast->action_buttons) ? json_encode($broadcast->action_buttons) : null;

        $insertData = [];
        foreach ($userIds as $userId) {
            $insertData[] = [
                'user_id' => $userId,
                'broadcast_notification_id' => $broadcast->id,
                'title' => $broadcast->title,
                'body' => $broadcast->body,
                'type' => $broadcast->type,
                'category' => 'announcement',
                'action_buttons' => $actionButtonsJson,
                'enable_reactions' => $broadcast->enable_reactions,
                'metadata' => json_encode(['broadcast_id' => $broadcast->id]),
                'read_at' => null,
                'dismissed_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Chunk bulk insert for performance
        foreach (array_chunk($insertData, 250) as $chunk) {
            UserNotification::insert($chunk);
        }

        // If 'send_email' is enabled on this broadcast, dispatch email notifications
        if ($broadcast->send_email && $this->mailService) {
            $recipients = User::whereIn('id', $userIds)->whereNotNull('email')->get();
            $firstButton = ! empty($broadcast->action_buttons) ? $broadcast->action_buttons[0] : null;
            $btnUrl = $firstButton['url'] ?? null;
            $btnLabel = $firstButton['label'] ?? null;
            $emailTitle = $broadcast->email_subject ?: $broadcast->title;

            foreach ($recipients as $recipientUser) {
                try {
                    $this->mailService->sendBroadcastNoticeMail(
                        user: $recipientUser,
                        title: $emailTitle,
                        content: $broadcast->body,
                        actionUrl: $btnUrl,
                        actionLabel: $btnLabel
                    );
                } catch (\Throwable) {
                    // Suppress individual email dispatch failures to keep broadcast flowing
                }
            }
        }

        $broadcast->update([
            'status' => 'sent',
            'sent_at' => $now,
            'recipients_count' => count($userIds),
        ]);

        return count($userIds);
    }

    /**
     * Process and dispatch all pending scheduled broadcasts whose scheduled time has arrived.
     */
    public function processScheduledBroadcasts(): int
    {
        $now = now();
        $dueBroadcasts = BroadcastNotification::where('status', 'scheduled')
            ->where('scheduled_at', '<=', $now)
            ->get();

        $dispatchedCount = 0;
        foreach ($dueBroadcasts as $broadcast) {
            $this->dispatchBroadcastNotification($broadcast);
            $dispatchedCount++;

            // Handle recurrence if repeat_interval is configured
            if (! empty($broadcast->repeat_interval) && $broadcast->repeat_interval !== 'none') {
                $baseTime = $broadcast->scheduled_at ? Carbon::parse($broadcast->scheduled_at) : $now;
                $nextScheduled = match ($broadcast->repeat_interval) {
                    'daily' => $baseTime->copy()->addDay(),
                    'weekly' => $baseTime->copy()->addWeek(),
                    'monthly' => $baseTime->copy()->addMonth(),
                    default => null,
                };

                if ($nextScheduled) {
                    BroadcastNotification::create([
                        'title' => $broadcast->title,
                        'body' => $broadcast->body,
                        'type' => $broadcast->type,
                        'action_buttons' => $broadcast->action_buttons,
                        'enable_reactions' => $broadcast->enable_reactions,
                        'target_type' => $broadcast->target_type,
                        'target_user_ids' => $broadcast->target_user_ids,
                        'target_role_ids' => $broadcast->target_role_ids,
                        'excluded_user_ids' => $broadcast->excluded_user_ids,
                        'excluded_role_ids' => $broadcast->excluded_role_ids,
                        'scheduled_at' => $nextScheduled,
                        'repeat_interval' => $broadcast->repeat_interval,
                        'status' => 'scheduled',
                        'created_by' => $broadcast->created_by,
                        'recipients_count' => 0,
                        'sent_at' => null,
                    ]);
                }
            }
        }

        return $dispatchedCount;
    }

    /**
     * Toggle or set an emoji reaction on a user notification.
     *
     * @return array<string, mixed>
     */
    public function toggleReaction(User $user, UserNotification $userNotification, string $reaction): array
    {
        if (! $userNotification->enable_reactions) {
            throw new \InvalidArgumentException('Reactions are not enabled for this notification.');
        }

        $supported = array_keys(UserNotificationReaction::SUPPORTED_REACTIONS);
        if (! in_array($reaction, $supported, true)) {
            throw new \InvalidArgumentException('Unsupported reaction emoji type.');
        }

        $existing = UserNotificationReaction::where('user_notification_id', $userNotification->id)
            ->where('user_id', $user->id)
            ->first();

        $userReaction = null;

        if ($existing) {
            if ($existing->reaction === $reaction) {
                // Remove reaction (toggle off)
                $existing->delete();
            } else {
                // Update to new reaction
                $existing->update(['reaction' => $reaction]);
                $userReaction = $reaction;
            }
        } else {
            // Create new reaction
            UserNotificationReaction::create([
                'user_notification_id' => $userNotification->id,
                'broadcast_notification_id' => $userNotification->broadcast_notification_id,
                'user_id' => $user->id,
                'reaction' => $reaction,
            ]);
            $userReaction = $reaction;
        }

        return [
            'user_reaction' => $userReaction,
            'reactions_breakdown' => $this->getNotificationReactionsSummary($userNotification->id),
        ];
    }

    /**
     * Compute aggregated reaction counts for a user notification or broadcast.
     *
     * @return array<string, int>
     */
    public function getNotificationReactionsSummary(int $userNotificationId): array
    {
        $rawCounts = UserNotificationReaction::where('user_notification_id', $userNotificationId)
            ->select('reaction', DB::raw('count(*) as count'))
            ->groupBy('reaction')
            ->pluck('count', 'reaction')
            ->all();

        $breakdown = [];
        foreach (UserNotificationReaction::SUPPORTED_REACTIONS as $key => $emoji) {
            $breakdown[$key] = [
                'key' => $key,
                'emoji' => $emoji,
                'count' => (int) ($rawCounts[$key] ?? 0),
            ];
        }

        return $breakdown;
    }

    /**
     * Get paginated notifications for the current authenticated user.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getUserNotifications(User $user, array $filters = []): LengthAwarePaginator
    {
        $this->processScheduledBroadcasts();

        $query = UserNotification::where('user_id', $user->id)
            ->whereNull('dismissed_at')
            ->with(['reactions', 'broadcast'])
            ->latest('id');

        if (! empty($filters['status'])) {
            if ($filters['status'] === 'unread') {
                $query->whereNull('read_at');
            } elseif ($filters['status'] === 'read') {
                $query->whereNotNull('read_at');
            }
        }

        if (! empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('category', $filters['category']);
        }

        if (! empty($filters['type']) && $filters['type'] !== 'all') {
            $query->where('type', $filters['type']);
        }

        if (! empty($filters['search'])) {
            $search = '%'.trim($filters['search']).'%';
            $query->where(function (Builder $q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhere('body', 'like', $search);
            });
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        $paginator = $query->paginate($perPage);

        // Format each item with reaction breakdown & user_reaction
        $paginator->getCollection()->transform(function (UserNotification $notification) use ($user) {
            $userReaction = $notification->reactions->firstWhere('user_id', $user->id)?->reaction;

            $reactionsCount = [];
            foreach (UserNotificationReaction::SUPPORTED_REACTIONS as $key => $emoji) {
                $count = $notification->reactions->where('reaction', $key)->count();
                $reactionsCount[$key] = [
                    'key' => $key,
                    'emoji' => $emoji,
                    'count' => $count,
                    'user_reacted' => $userReaction === $key,
                ];
            }

            $item = $notification->toArray();
            $item['user_reaction'] = $userReaction;
            $item['reactions_summary'] = $reactionsCount;
            $item['is_read'] = $notification->read_at !== null;

            return $item;
        });

        return $paginator;
    }

    /**
     * Get unread notification count for user.
     */
    public function getUnreadCount(User $user): int
    {
        $this->processScheduledBroadcasts();

        return UserNotification::where('user_id', $user->id)
            ->whereNull('dismissed_at')
            ->whereNull('read_at')
            ->count();
    }

    /**
     * Mark a single or set of notifications as read for a user.
     *
     * @param  int|array<int>  $ids
     */
    public function markAsRead(User $user, int|array $ids): int
    {
        $idArray = is_array($ids) ? $ids : [$ids];

        return UserNotification::where('user_id', $user->id)
            ->whereIn('id', $idArray)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /**
     * Mark all notifications as read for a user.
     */
    public function markAllAsRead(User $user): int
    {
        return UserNotification::where('user_id', $user->id)
            ->whereNull('dismissed_at')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /**
     * Dismiss / delete a single notification from a user's inbox.
     */
    public function deleteUserNotification(User $user, int $id): bool
    {
        $notification = UserNotification::where('user_id', $user->id)->where('id', $id)->first();

        if (! $notification) {
            return false;
        }

        $notification->delete();

        return true;
    }

    /**
     * Clear all read notifications for a user.
     */
    public function clearAllRead(User $user): int
    {
        return UserNotification::where('user_id', $user->id)
            ->whereNotNull('read_at')
            ->delete();
    }

    /**
     * Get broadcast notifications history for admin management.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getBroadcastHistory(array $filters = []): LengthAwarePaginator
    {
        $this->processScheduledBroadcasts();

        $query = BroadcastNotification::with(['creator', 'userNotifications', 'reactions'])
            ->latest('id');

        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['type']) && $filters['type'] !== 'all') {
            $query->where('type', $filters['type']);
        }

        if (! empty($filters['search'])) {
            $search = '%'.trim($filters['search']).'%';
            $query->where(function (Builder $q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhere('body', 'like', $search);
            });
        }

        $perPage = (int) ($filters['per_page'] ?? 15);
        $paginator = $query->paginate($perPage);

        $paginator->getCollection()->transform(function (BroadcastNotification $broadcast) {
            $totalRecipients = $broadcast->recipients_count;
            $readCount = $broadcast->userNotifications->whereNotNull('read_at')->count();
            $readRate = $totalRecipients > 0 ? round(($readCount / $totalRecipients) * 100, 1) : 0;

            // Reaction counts
            $reactionsSummary = [];
            $totalReactions = $broadcast->reactions->count();

            foreach (UserNotificationReaction::SUPPORTED_REACTIONS as $key => $emoji) {
                $count = $broadcast->reactions->where('reaction', $key)->count();
                $reactionsSummary[$key] = [
                    'key' => $key,
                    'emoji' => $emoji,
                    'count' => $count,
                ];
            }

            $data = $broadcast->toArray();
            $data['read_count'] = $readCount;
            $data['read_rate'] = $readRate;
            $data['total_reactions'] = $totalReactions;
            $data['reactions_summary'] = $reactionsSummary;

            return $data;
        });

        return $paginator;
    }

    /**
     * Get detailed analytics for a specific broadcast notification.
     *
     * @return array<string, mixed>
     */
    public function getBroadcastStats(int $broadcastId): array
    {
        $broadcast = BroadcastNotification::with(['creator', 'userNotifications.user', 'reactions.user'])
            ->findOrFail($broadcastId);

        $totalRecipients = $broadcast->recipients_count;
        $readCount = $broadcast->userNotifications->whereNotNull('read_at')->count();
        $unreadCount = max(0, $totalRecipients - $readCount);
        $readRate = $totalRecipients > 0 ? round(($readCount / $totalRecipients) * 100, 1) : 0;

        $reactionsSummary = [];
        foreach (UserNotificationReaction::SUPPORTED_REACTIONS as $key => $emoji) {
            $count = $broadcast->reactions->where('reaction', $key)->count();
            $reactionsSummary[$key] = [
                'key' => $key,
                'emoji' => $emoji,
                'count' => $count,
            ];
        }

        // Recent readers sample
        $recentReaders = $broadcast->userNotifications
            ->whereNotNull('read_at')
            ->sortByDesc('read_at')
            ->take(15)
            ->map(fn (UserNotification $un) => [
                'user_id' => $un->user_id,
                'name' => $un->user?->name ?? 'Unknown User',
                'email' => $un->user?->email ?? '',
                'avatar_url' => $un->user?->avatar_url,
                'read_at' => $un->read_at?->toISOString(),
            ])
            ->values();

        // Recent reactions sample
        $recentReactions = $broadcast->reactions
            ->sortByDesc('created_at')
            ->take(20)
            ->map(fn (UserNotificationReaction $r) => [
                'user_id' => $r->user_id,
                'name' => $r->user?->name ?? 'Unknown User',
                'email' => $r->user?->email ?? '',
                'avatar_url' => $r->user?->avatar_url,
                'reaction' => $r->reaction,
                'emoji' => UserNotificationReaction::SUPPORTED_REACTIONS[$r->reaction] ?? '👍',
                'created_at' => $r->created_at?->toISOString(),
            ])
            ->values();

        return [
            'broadcast' => $broadcast,
            'total_recipients' => $totalRecipients,
            'read_count' => $readCount,
            'unread_count' => $unreadCount,
            'read_rate' => $readRate,
            'reactions_summary' => $reactionsSummary,
            'total_reactions' => $broadcast->reactions->count(),
            'recent_readers' => $recentReaders,
            'recent_reactions' => $recentReactions,
        ];
    }

    /**
     * Resend an existing broadcast notification (or create new clone and dispatch).
     *
     * @param  array<string, mixed>  $overrideData
     */
    public function resendBroadcastNotification(int $id, array $overrideData = [], ?User $creator = null): BroadcastNotification
    {
        $existing = BroadcastNotification::findOrFail($id);

        $mergedData = array_merge([
            'title' => $existing->title,
            'body' => $existing->body,
            'type' => $existing->type,
            'action_buttons' => $existing->action_buttons,
            'enable_reactions' => $existing->enable_reactions,
            'target_type' => $existing->target_type,
            'target_user_ids' => $existing->target_user_ids,
            'target_role_ids' => $existing->target_role_ids,
            'excluded_user_ids' => $existing->excluded_user_ids,
            'excluded_role_ids' => $existing->excluded_role_ids,
            'scheduled_at' => null,
            'repeat_interval' => $existing->repeat_interval,
        ], $overrideData);

        return $this->createAndDispatchBroadcast($mergedData, $creator);
    }

    /**
     * Delete a broadcast notification from history.
     */
    public function deleteBroadcastNotification(int $id, bool $deleteRecipientsInbox = true): bool
    {
        $broadcast = BroadcastNotification::find($id);

        if (! $broadcast) {
            return false;
        }

        if ($deleteRecipientsInbox) {
            UserNotification::where('broadcast_notification_id', $id)->delete();
        }

        $broadcast->delete();

        return true;
    }
}
