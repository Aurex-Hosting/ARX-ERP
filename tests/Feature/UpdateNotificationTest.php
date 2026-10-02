<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\MailConfiguration;
use App\Core\Models\MailHookConfiguration;
use App\Core\Models\UserNotification;
use App\Core\Services\SettingsManager;
use App\Core\Services\UpdateManager;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class UpdateNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected UpdateManager $updateManager;

    protected SettingsManager $settingsManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CoreSeeder::class);

        $this->superAdmin = User::where('email', 'admin@arx-erp.local')->firstOrFail();
        $this->updateManager = app(UpdateManager::class);
        $this->settingsManager = app(SettingsManager::class);
    }

    public function test_update_detection_dispatches_in_app_notification_to_super_admins(): void
    {
        $updateResult = [
            'update_available' => true,
            'current_version' => '1.0.0',
            'latest_version' => '1.1.0',
            'name' => 'ARX-ERP 1.1.0 Release',
            'notes' => 'Critical security fixes and new modules.',
            'published_at' => now()->toIso8601String(),
            'zip_hash' => 'hash123456',
        ];

        $this->updateManager->notifyAdminsIfUpdateAvailable($updateResult);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->superAdmin->id,
            'title' => 'New System Update Available: v1.1.0',
            'category' => 'system',
            'type' => 'info',
        ]);

        $notification = UserNotification::where('user_id', $this->superAdmin->id)
            ->where('title', 'like', '%v1.1.0%')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString('ARX-ERP 1.1.0 Release', $notification->body);
        $this->assertSame('1.1.0', $this->settingsManager->get('system.updates.last_notified_version'));
    }

    public function test_update_detection_does_not_duplicate_notification_for_same_version(): void
    {
        $updateResult = [
            'update_available' => true,
            'current_version' => '1.0.0',
            'latest_version' => '1.2.0',
            'name' => 'ARX-ERP 1.2.0',
            'notes' => 'Initial notification.',
            'published_at' => now()->toIso8601String(),
            'zip_hash' => 'hash12.0',
        ];

        // First trigger
        $this->updateManager->notifyAdminsIfUpdateAvailable($updateResult);

        $initialCount = UserNotification::where('user_id', $this->superAdmin->id)
            ->where('title', 'like', '%v1.2.0%')
            ->count();
        $this->assertSame(1, $initialCount);

        // Second trigger with the same version
        $this->updateManager->notifyAdminsIfUpdateAvailable($updateResult);

        $afterCount = UserNotification::where('user_id', $this->superAdmin->id)
            ->where('title', 'like', '%v1.2.0%')
            ->count();
        $this->assertSame(1, $afterCount);
    }

    public function test_smtp_email_hook_toggle_dispatches_email_when_enabled(): void
    {
        Mail::fake();

        $mailConfig = MailConfiguration::instance();
        $mailConfig->update([
            'is_enabled' => true,
            'host' => '127.0.0.1',
            'port' => 2525,
            'from_address' => 'system@arx-erp.local',
            'from_name' => 'ARX-ERP Core',
        ]);

        $hooksConfig = MailHookConfiguration::instance();
        $hooksConfig->update([
            'hook_system_update_available' => true,
        ]);

        $updateResult = [
            'update_available' => true,
            'current_version' => '1.0.0',
            'latest_version' => '1.3.0',
            'name' => 'ARX-ERP 1.3.0',
            'notes' => 'Security enhancements.',
            'published_at' => now()->toIso8601String(),
            'zip_hash' => 'hash13.0',
        ];

        $this->updateManager->notifyAdminsIfUpdateAvailable($updateResult);

        // Mail should be dispatched to super admin
        Mail::assertSentCount(1);
    }

    public function test_smtp_email_hook_toggle_suppresses_email_when_disabled(): void
    {
        Mail::fake();

        $mailConfig = MailConfiguration::instance();
        $mailConfig->update([
            'is_enabled' => true,
            'host' => '127.0.0.1',
            'port' => 2525,
        ]);

        $hooksConfig = MailHookConfiguration::instance();
        $hooksConfig->update([
            'hook_system_update_available' => false,
        ]);

        $updateResult = [
            'update_available' => true,
            'current_version' => '1.0.0',
            'latest_version' => '1.4.0',
            'name' => 'ARX-ERP 1.4.0',
            'notes' => 'Quiet update.',
            'published_at' => now()->toIso8601String(),
            'zip_hash' => 'hash14.0',
        ];

        $this->updateManager->notifyAdminsIfUpdateAvailable($updateResult);

        // Mail should NOT be sent because hook is disabled
        Mail::assertNothingSent();

        // But in-app bell notification is still delivered
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->superAdmin->id,
            'title' => 'New System Update Available: v1.4.0',
        ]);
    }

    public function test_mail_setup_api_can_get_and_update_system_update_hook(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/mail/hooks');

        $response->assertOk()
            ->assertJsonPath('hooks.hook_system_update_available', true);

        $updateResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/v1/admin/mail/hooks', [
                'hook_user_pwd_change' => true,
                'hook_forgot_password' => true,
                'hook_verify_email_on_created' => true,
                'hook_account_status_change' => true,
                'hook_notify_broadcast' => true,
                'hook_system_update_available' => false,
                'custom_placeholders' => [],
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('hooks.hook_system_update_available', false);

        $this->assertDatabaseHas('mail_hooks_configuration', [
            'hook_system_update_available' => false,
        ]);
    }
}
