<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\BroadcastNotification;
use App\Core\Services\NotificationService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller handling administrative manual notification dispatching,
 * targeting rules, scheduled broadcasts, analytics, and history management.
 */
class AdminNotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * List broadcast notifications history with analytics.
     */
    public function index(Request $request): JsonResponse
    {
        $history = $this->notificationService->getBroadcastHistory([
            'status' => $request->query('status'),
            'type' => $request->query('type'),
            'search' => $request->query('search'),
            'per_page' => $request->query('per_page', 15),
        ]);

        return response()->json([
            'data' => $history->items(),
            'current_page' => $history->currentPage(),
            'last_page' => $history->lastPage(),
            'per_page' => $history->perPage(),
            'total' => $history->total(),
        ]);
    }

    /**
     * Preview target audience count and sample recipients.
     */
    public function targetPreview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_type' => ['required', 'string', 'in:all,users,roles,all_except_users,all_except_roles'],
            'target_user_ids' => ['nullable', 'array'],
            'target_user_ids.*' => ['integer', 'exists:users,id'],
            'target_role_ids' => ['nullable', 'array'],
            'excluded_user_ids' => ['nullable', 'array'],
            'excluded_user_ids.*' => ['integer', 'exists:users,id'],
            'excluded_role_ids' => ['nullable', 'array'],
        ]);

        $preview = $this->notificationService->previewTargetAudience($validated);

        return response()->json($preview);
    }

    /**
     * Create and dispatch (or schedule) a new notification.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'type' => ['required', 'string', 'in:info,success,warning,danger,announcement,security,system'],
            'action_buttons' => ['nullable', 'array'],
            'action_buttons.*.label' => ['required', 'string', 'max:100'],
            'action_buttons.*.url' => ['required', 'string', 'max:500'],
            'action_buttons.*.style' => ['nullable', 'string', 'in:primary,secondary,danger,outline,link'],
            'action_buttons.*.external' => ['nullable', 'boolean'],
            'enable_reactions' => ['required', 'boolean'],
            'send_email' => ['nullable', 'boolean'],
            'email_subject' => ['nullable', 'string', 'max:255'],
            'target_type' => ['required', 'string', 'in:all,users,roles,all_except_users,all_except_roles'],
            'target_user_ids' => ['nullable', 'array'],
            'target_user_ids.*' => ['integer', 'exists:users,id'],
            'target_role_ids' => ['nullable', 'array'],
            'excluded_user_ids' => ['nullable', 'array'],
            'excluded_user_ids.*' => ['integer', 'exists:users,id'],
            'excluded_role_ids' => ['nullable', 'array'],
            'scheduled_at' => ['nullable', 'date'],
            'repeat_interval' => ['nullable', 'string', 'in:none,daily,weekly,monthly'],
        ]);

        $broadcast = $this->notificationService->createAndDispatchBroadcast($validated, $request->user());

        return response()->json([
            'message' => $broadcast->status === 'scheduled'
                ? 'Notification successfully scheduled.'
                : "Notification sent successfully to {$broadcast->recipients_count} recipient(s).",
            'broadcast' => $broadcast,
        ], 201);
    }

    /**
     * View detailed broadcast analytics and reaction breakdowns.
     */
    public function show(int $id): JsonResponse
    {
        $stats = $this->notificationService->getBroadcastStats($id);

        return response()->json($stats);
    }

    /**
     * Update a scheduled or draft notification.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $broadcast = BroadcastNotification::findOrFail($id);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'type' => ['required', 'string', 'in:info,success,warning,danger,announcement,security,system'],
            'action_buttons' => ['nullable', 'array'],
            'enable_reactions' => ['required', 'boolean'],
            'target_type' => ['required', 'string', 'in:all,users,roles,all_except_users,all_except_roles'],
            'target_user_ids' => ['nullable', 'array'],
            'target_role_ids' => ['nullable', 'array'],
            'excluded_user_ids' => ['nullable', 'array'],
            'excluded_role_ids' => ['nullable', 'array'],
            'scheduled_at' => ['nullable', 'date'],
            'repeat_interval' => ['nullable', 'string', 'in:none,daily,weekly,monthly'],
        ]);

        $broadcast->update($validated);

        return response()->json([
            'message' => 'Notification updated successfully.',
            'broadcast' => $broadcast,
        ]);
    }

    /**
     * Edit and resend an existing notification to its target audience.
     */
    public function resend(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string', 'in:info,success,warning,danger,announcement,security,system'],
            'action_buttons' => ['nullable', 'array'],
            'enable_reactions' => ['nullable', 'boolean'],
            'target_type' => ['nullable', 'string', 'in:all,users,roles,all_except_users,all_except_roles'],
            'target_user_ids' => ['nullable', 'array'],
            'target_role_ids' => ['nullable', 'array'],
            'excluded_user_ids' => ['nullable', 'array'],
            'excluded_role_ids' => ['nullable', 'array'],
        ]);

        $newBroadcast = $this->notificationService->resendBroadcastNotification(
            id: $id,
            overrideData: array_filter($validated, fn ($val) => $val !== null),
            creator: $request->user()
        );

        return response()->json([
            'message' => "Notification resent successfully to {$newBroadcast->recipients_count} recipient(s).",
            'broadcast' => $newBroadcast,
        ]);
    }

    /**
     * Delete a notification from history.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $deleteRecipientsInbox = $request->boolean('delete_recipients_inbox', true);

        $deleted = $this->notificationService->deleteBroadcastNotification($id, $deleteRecipientsInbox);

        if (! $deleted) {
            return response()->json([
                'message' => 'Notification not found.',
            ], 404);
        }

        return response()->json([
            'message' => $deleteRecipientsInbox
                ? 'Notification deleted from history and removed from all recipient inboxes.'
                : 'Notification deleted from history.',
        ]);
    }
}
