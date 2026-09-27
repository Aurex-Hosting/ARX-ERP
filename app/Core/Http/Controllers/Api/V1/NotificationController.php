<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\UserNotification;
use App\Core\Services\NotificationService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller managing personal user notifications, unread counts, status updates,
 * and emoji reactions.
 */
class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * Get paginated notifications for current user with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = $this->notificationService->getUserNotifications($user, [
            'status' => $request->query('status'),
            'category' => $request->query('category'),
            'type' => $request->query('type'),
            'search' => $request->query('search'),
            'per_page' => $request->query('per_page', 20),
        ]);

        $unreadCount = $this->notificationService->getUnreadCount($user);

        return response()->json([
            'notifications' => $notifications->items(),
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
            'per_page' => $notifications->perPage(),
            'total' => $notifications->total(),
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Get unread notifications badge count for topbar.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $unreadCount = $this->notificationService->getUnreadCount($request->user());

        return response()->json([
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $updated = $this->notificationService->markAsRead($user, $id);

        return response()->json([
            'message' => $updated > 0 ? 'Notification marked as read.' : 'Notification already read or not found.',
            'unread_count' => $this->notificationService->getUnreadCount($user),
        ]);
    }

    /**
     * Mark all notifications as read for current user.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = $this->notificationService->markAllAsRead($user);

        return response()->json([
            'message' => "All {$count} notification(s) marked as read.",
            'unread_count' => 0,
        ]);
    }

    /**
     * React to a notification with an emoji or toggle reaction off.
     */
    public function react(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reaction' => ['required', 'string', 'in:fire,thumbs_up,smile,laugh,handshake,cry,angry'],
        ]);

        $user = $request->user();
        $notification = UserNotification::where('user_id', $user->id)->findOrFail($id);

        try {
            $result = $this->notificationService->toggleReaction($user, $notification, $validated['reaction']);

            return response()->json([
                'message' => 'Reaction updated.',
                'user_reaction' => $result['user_reaction'],
                'reactions_summary' => $result['reactions_breakdown'],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Dismiss / delete a single notification.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $deleted = $this->notificationService->deleteUserNotification($request->user(), $id);

        if (! $deleted) {
            return response()->json([
                'message' => 'Notification not found.',
            ], 404);
        }

        return response()->json([
            'message' => 'Notification deleted successfully.',
            'unread_count' => $this->notificationService->getUnreadCount($request->user()),
        ]);
    }

    /**
     * Clear all read notifications for current user.
     */
    public function clearAll(Request $request): JsonResponse
    {
        $count = $this->notificationService->clearAllRead($request->user());

        return response()->json([
            'message' => "{$count} read notification(s) cleared.",
            'unread_count' => $this->notificationService->getUnreadCount($request->user()),
        ]);
    }
}
