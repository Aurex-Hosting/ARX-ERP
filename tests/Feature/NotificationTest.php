<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\UserNotification;
use App\Core\Services\NotificationService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $regularUser;

    protected Role $adminRole;

    protected Role $userRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminRole = Role::firstOrCreate(['name' => 'super-admin']);
        $this->userRole = Role::firstOrCreate(['name' => 'user']);

        $this->superAdmin = User::factory()->create([
            'email' => 'admin@arx-erp.local',
            'user_type' => 'super_admin',
            'is_active' => true,
        ]);
        $this->superAdmin->assignRole($this->adminRole);

        $this->regularUser = User::factory()->create([
            'email' => 'user@arx-erp.local',
            'user_type' => 'user',
            'is_active' => true,
        ]);
        $this->regularUser->assignRole($this->userRole);
    }

    public function test_user_can_fetch_notifications_and_unread_count(): void
    {
        $service = app(NotificationService::class);
        $service->sendToUser(
            user: $this->regularUser,
            title: 'Welcome Notification',
            body: 'Welcome to the system!',
            type: 'info',
            category: 'system'
        );

        $service->sendToUser(
            user: $this->regularUser,
            title: 'Security Alert',
            body: 'Your account was created.',
            type: 'security',
            category: 'security_alert'
        );

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/v1/notifications');

        $response->assertStatus(200)
            ->assertJsonPath('total', 2)
            ->assertJsonPath('unread_count', 2);

        $unreadCountResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/v1/notifications/unread-count');

        $unreadCountResponse->assertStatus(200)
            ->assertJson(['unread_count' => 2]);
    }

    public function test_user_can_mark_notification_as_read_and_mark_all_read(): void
    {
        $service = app(NotificationService::class);
        $notif1 = $service->sendToUser($this->regularUser, 'Notice 1', 'Body 1');
        $notif2 = $service->sendToUser($this->regularUser, 'Notice 2', 'Body 2');

        $readResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson("/api/v1/notifications/{$notif1->id}/read");

        $readResponse->assertStatus(200)
            ->assertJson(['unread_count' => 1]);

        $this->assertNotNull($notif1->fresh()->read_at);
        $this->assertNull($notif2->fresh()->read_at);

        $markAllResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/notifications/mark-all-read');

        $markAllResponse->assertStatus(200)
            ->assertJson(['unread_count' => 0]);

        $this->assertNotNull($notif2->fresh()->read_at);
    }

    public function test_user_can_react_to_notification_and_toggle_off(): void
    {
        $service = app(NotificationService::class);
        $notif = $service->sendToUser(
            user: $this->regularUser,
            title: 'Announcement',
            body: 'New feature released!',
            type: 'announcement',
            category: 'announcement',
            actionButtons: null,
            enableReactions: true
        );

        // React with Fire 🔥
        $reactResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson("/api/v1/notifications/{$notif->id}/react", [
                'reaction' => 'fire',
            ]);

        $reactResponse->assertStatus(200)
            ->assertJsonPath('user_reaction', 'fire')
            ->assertJsonPath('reactions_summary.fire.count', 1);

        // Toggle off reaction by sending fire again
        $toggleResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson("/api/v1/notifications/{$notif->id}/react", [
                'reaction' => 'fire',
            ]);

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('user_reaction', null)
            ->assertJsonPath('reactions_summary.fire.count', 0);
    }

    public function test_admin_can_dispatch_broadcast_notification_with_targeting(): void
    {
        $extraUser = User::factory()->create([
            'email' => 'other@arx-erp.local',
            'user_type' => 'user',
            'is_active' => true,
        ]);
        $extraUser->assignRole($this->userRole);

        // Target 'all'
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/notifications', [
                'title' => 'System Maintenance Tonight',
                'body' => 'Scheduled maintenance starting at 11 PM UTC.',
                'type' => 'warning',
                'action_buttons' => [
                    [
                        'label' => 'View Status',
                        'url' => 'https://status.example.com',
                        'style' => 'primary',
                        'external' => true,
                    ],
                ],
                'enable_reactions' => true,
                'target_type' => 'all',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('broadcast.title', 'System Maintenance Tonight')
            ->assertJsonPath('broadcast.recipients_count', 3); // superAdmin, regularUser, extraUser

        // Check each user received inbox notification
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->regularUser->id,
            'title' => 'System Maintenance Tonight',
            'type' => 'warning',
            'enable_reactions' => true,
        ]);
    }

    public function test_admin_target_preview_endpoint(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/notifications/target-preview?target_type=roles&target_role_ids[]='.$this->userRole->id);

        $response->assertStatus(200)
            ->assertJsonPath('target_type', 'roles')
            ->assertJsonPath('total_recipients', 1);
    }

    public function test_admin_can_view_broadcast_stats_and_delete(): void
    {
        $service = app(NotificationService::class);
        $broadcast = $service->createAndDispatchBroadcast([
            'title' => 'Company Announcement',
            'body' => 'Great news!',
            'type' => 'announcement',
            'enable_reactions' => true,
            'target_type' => 'all',
        ], $this->superAdmin);

        // Regular user reads and reacts
        $userNotif = UserNotification::where('broadcast_notification_id', $broadcast->id)
            ->where('user_id', $this->regularUser->id)
            ->first();

        $this->assertNotNull($userNotif);
        $userNotif->markAsRead();
        $service->toggleReaction($this->regularUser, $userNotif, 'thumbs_up');

        // Admin checks stats
        $statsResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/v1/admin/notifications/{$broadcast->id}");

        $statsResponse->assertStatus(200)
            ->assertJsonPath('read_count', 1)
            ->assertJsonPath('total_reactions', 1)
            ->assertJsonPath('reactions_summary.thumbs_up.count', 1);

        // Verify recipient inbox has the notification before deletion
        $this->assertDatabaseHas('user_notifications', [
            'broadcast_notification_id' => $broadcast->id,
            'user_id' => $this->regularUser->id,
        ]);

        // Admin deletes broadcast (default: purge recipient inboxes)
        $deleteResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/notifications/{$broadcast->id}?delete_recipients_inbox=1");

        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('broadcast_notifications', ['id' => $broadcast->id]);
        $this->assertDatabaseMissing('user_notifications', [
            'broadcast_notification_id' => $broadcast->id,
        ]);
    }

    public function test_admin_can_delete_broadcast_keeping_recipients_inbox(): void
    {
        $service = app(NotificationService::class);
        $broadcast = $service->createAndDispatchBroadcast([
            'title' => 'Keep In Inbox Test',
            'body' => 'Testing retain in inbox option',
            'type' => 'info',
            'target_type' => 'all',
            'enable_reactions' => true,
        ], $this->superAdmin);

        $this->assertDatabaseHas('user_notifications', [
            'broadcast_notification_id' => $broadcast->id,
            'user_id' => $this->regularUser->id,
        ]);

        // Admin deletes broadcast without deleting from recipient inboxes
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/notifications/{$broadcast->id}?delete_recipients_inbox=0");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('broadcast_notifications', ['id' => $broadcast->id]);
        $this->assertDatabaseHas('user_notifications', [
            'title' => 'Keep In Inbox Test',
            'user_id' => $this->regularUser->id,
        ]);
    }

    public function test_system_registers_notification_and_broadcast_permissions(): void
    {
        $expected = [
            'notifications.view',
            'notifications.create',
            'notifications.analytics',
            'notifications.edit',
            'notifications.delete',
            'notifications.resend',
        ];

        foreach ($expected as $permName) {
            $this->assertDatabaseHas('permissions', [
                'name' => $permName,
            ]);
        }

        $res = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/permissions');

        $res->assertStatus(200);
        $json = $res->json();
        $groupKeys = collect($json['groups'])->pluck('key')->all();
        $this->assertContains('notifications', $groupKeys);
    }

    public function test_scheduled_broadcast_is_dispatched_when_due(): void
    {
        $service = app(NotificationService::class);

        // Create broadcast scheduled for the future
        $scheduledBroadcast = $service->createAndDispatchBroadcast([
            'title' => 'Scheduled Maintenance',
            'body' => 'Maintenance will start shortly.',
            'type' => 'warning',
            'enable_reactions' => true,
            'target_type' => 'all',
            'scheduled_at' => now()->addMinutes(10)->toIso8601String(),
        ], $this->superAdmin);

        $this->assertEquals('scheduled', $scheduledBroadcast->status);
        $this->assertNull($scheduledBroadcast->sent_at);
        $this->assertEquals(0, UserNotification::where('broadcast_notification_id', $scheduledBroadcast->id)->count());

        // Fast forward: update scheduled_at to past
        $scheduledBroadcast->update(['scheduled_at' => now()->subMinute()]);

        // Process scheduled broadcasts via service (or artisan command)
        $processed = $service->processScheduledBroadcasts();
        $this->assertEquals(1, $processed);

        $scheduledBroadcast->refresh();
        $this->assertEquals('sent', $scheduledBroadcast->status);
        $this->assertNotNull($scheduledBroadcast->sent_at);
        $this->assertGreaterThan(0, $scheduledBroadcast->recipients_count);
        $this->assertDatabaseHas('user_notifications', [
            'broadcast_notification_id' => $scheduledBroadcast->id,
            'user_id' => $this->regularUser->id,
        ]);
    }
}
