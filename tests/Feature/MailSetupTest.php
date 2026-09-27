<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\MailConfiguration;
use App\Core\Models\SecureActionToken;
use App\Core\Services\SecurityTokenService;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MailSetupTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected User $standardUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CoreSeeder::class);

        $superAdminRole = Role::where('name', 'super-admin')->first();

        $this->adminUser = User::factory()->create([
            'email' => 'admin.test@arx-erp.local',
            'is_active' => true,
        ]);
        $this->adminUser->syncRoles([$superAdminRole]);

        $this->standardUser = User::factory()->create([
            'name' => 'Alexander Vance',
            'email' => 'vance@example.com',
            'password' => Hash::make('oldpassword123'),
            'is_active' => false,
            'email_verified_at' => null,
        ]);
    }

    public function test_super_admin_can_retrieve_and_update_mail_configuration(): void
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/mail/config');

        $response->assertOk()
            ->assertJsonStructure([
                'config' => [
                    'id',
                    'is_enabled',
                    'host',
                    'port',
                    'username',
                    'encryption',
                    'from_address',
                    'from_name',
                    'has_password',
                ],
            ]);

        $updateResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson('/api/v1/admin/mail/config', [
                'is_enabled' => true,
                'host' => 'smtp.mailtrap.io',
                'port' => 2525,
                'username' => 'testuser123',
                'password' => 'secrettoken456',
                'encryption' => 'tls',
                'from_address' => 'system@enterprise.corp',
                'from_name' => 'Enterprise System',
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('config.is_enabled', true)
            ->assertJsonPath('config.host', 'smtp.mailtrap.io')
            ->assertJsonPath('config.port', 2525)
            ->assertJsonPath('config.from_address', 'system@enterprise.corp');

        $this->assertDatabaseHas('mail_configurations', [
            'is_enabled' => true,
            'host' => 'smtp.mailtrap.io',
            'port' => 2525,
            'from_address' => 'system@enterprise.corp',
        ]);
    }

    public function test_super_admin_can_retrieve_and_update_mail_hooks_and_placeholders(): void
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/mail/hooks');

        $response->assertOk()
            ->assertJsonStructure([
                'hooks' => [
                    'id',
                    'hook_user_pwd_change',
                    'hook_forgot_password',
                    'hook_verify_email_on_created',
                    'hook_account_status_change',
                    'hook_notify_broadcast',
                    'custom_placeholders',
                ],
            ]);

        $updateResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson('/api/v1/admin/mail/hooks', [
                'hook_user_pwd_change' => true,
                'hook_forgot_password' => true,
                'hook_verify_email_on_created' => true,
                'hook_account_status_change' => false,
                'hook_notify_broadcast' => true,
                'custom_placeholders' => [
                    [
                        'key' => 'helpdesk_phone',
                        'value' => '+1-800-444-9999',
                        'description' => '24/7 Support Hotline',
                    ],
                ],
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('hooks.hook_account_status_change', false);

        $this->assertDatabaseHas('mail_hooks_configuration', [
            'hook_account_status_change' => false,
        ]);
    }

    public function test_super_admin_can_retrieve_preview_and_update_email_templates(): void
    {
        $listResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/mail/templates');

        $listResponse->assertOk()
            ->assertJsonStructure(['templates']);

        $previewResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/mail/templates/password_reset/preview');

        $previewResponse->assertOk()
            ->assertJsonStructure([
                'preview' => [
                    'subject',
                    'html',
                    'plain',
                ],
            ]);

        $updateResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson('/api/v1/admin/mail/templates/password_reset', [
                'subject' => 'Custom Reset: {app_name}',
                'body_html' => '<p>Hello {full_name}, click <a href="{password_reset_link}">here</a> to reset.</p>',
                'body_plain' => 'Hello {full_name}, use {password_reset_link}',
                'action_button_label' => 'Reset Now',
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('template.subject', 'Custom Reset: {app_name}');
    }

    public function test_security_token_generation_validation_and_immediate_consumption_lifecycle(): void
    {
        $tokenService = app(SecurityTokenService::class);

        // Generate token
        $plaintextToken = $tokenService->generateToken($this->standardUser, 'password_reset', ['test' => true], 10);
        $this->assertNotEmpty($plaintextToken);
        $this->assertSame(64, strlen($plaintextToken));

        // Validate token
        $record = $tokenService->validateToken($plaintextToken, 'password_reset');
        $this->assertNotNull($record);
        $this->assertSame($this->standardUser->id, $record->user_id);

        // Public API validation
        $apiCheck = $this->postJson('/api/v1/auth/validate-token', [
            'token' => $plaintextToken,
            'type' => 'password_reset',
        ]);
        $apiCheck->assertOk()->assertJsonPath('valid', true);

        // Consume token
        $tokenService->consumeToken($record);

        // Re-validating consumed token must fail
        $recheck = $tokenService->validateToken($plaintextToken, 'password_reset');
        $this->assertNull($recheck);

        $apiRecheck = $this->postJson('/api/v1/auth/validate-token', [
            'token' => $plaintextToken,
            'type' => 'password_reset',
        ]);
        $apiRecheck->assertStatus(422)->assertJsonPath('valid', false);
    }

    public function test_security_token_expires_after_10_minutes(): void
    {
        $tokenService = app(SecurityTokenService::class);

        $plaintextToken = $tokenService->generateToken($this->standardUser, 'password_reset', [], 10);

        // Fast-forward time past 10 minutes (11 minutes)
        $this->travel(11)->minutes();

        $record = $tokenService->validateToken($plaintextToken, 'password_reset');
        $this->assertNull($record);

        $apiCheck = $this->postJson('/api/v1/auth/validate-token', [
            'token' => $plaintextToken,
            'type' => 'password_reset',
        ]);
        $apiCheck->assertStatus(422);
    }

    public function test_email_verification_endpoint_activates_user_and_revokes_token(): void
    {
        $tokenService = app(SecurityTokenService::class);
        $plaintextToken = $tokenService->generateToken($this->standardUser, 'email_verification', [], 10);

        $this->assertNull($this->standardUser->email_verified_at);
        $this->assertFalse((bool) $this->standardUser->is_active);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'token' => $plaintextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Your email address has been verified and your account is now activated.');

        $this->standardUser->refresh();
        $this->assertNotNull($this->standardUser->email_verified_at);
        $this->assertTrue((bool) $this->standardUser->is_active);

        // Ensure token is revoked and cannot be reused
        $secondAttempt = $this->postJson('/api/v1/auth/verify-email', [
            'token' => $plaintextToken,
        ]);
        $secondAttempt->assertStatus(422);
    }

    public function test_password_reset_endpoint_updates_password_and_revokes_token(): void
    {
        $tokenService = app(SecurityTokenService::class);
        $plaintextToken = $tokenService->generateToken($this->standardUser, 'password_reset', [], 10);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $plaintextToken,
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Password reset successfully. You may now log in with your new credentials.');

        $this->standardUser->refresh();
        $this->assertTrue(Hash::check('NewSecurePassword123!', $this->standardUser->password));

        // Reusing the token must fail immediately
        $secondAttempt = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $plaintextToken,
            'password' => 'AnotherPassword999!',
            'password_confirmation' => 'AnotherPassword999!',
        ]);
        $secondAttempt->assertStatus(422);
    }

    public function test_forgot_password_endpoint_dispatches_reset_link(): void
    {
        $config = MailConfiguration::instance();
        $config->update(['is_enabled' => true]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $this->standardUser->email,
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message']);

        // Check that a 10-minute secure token was created in DB for user
        $tokenRecord = SecureActionToken::where('user_id', $this->standardUser->id)
            ->where('token_type', 'password_reset')
            ->latest('id')
            ->first();

        $this->assertNotNull($tokenRecord);
        $this->assertNull($tokenRecord->used_at);
        $this->assertTrue($tokenRecord->expires_at->isFuture());
    }

    public function test_user_management_send_reset_link_and_resend_activation_endpoints(): void
    {
        $config = MailConfiguration::instance();
        $config->update(['is_enabled' => true]);

        // 1. Send reset link
        $resetRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/users/{$this->standardUser->id}/send-reset-link");

        $resetRes->assertOk()
            ->assertJsonStructure(['message']);

        // 2. Resend activation link
        $actRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/users/{$this->standardUser->id}/resend-activation");

        $actRes->assertOk()
            ->assertJsonStructure(['message']);

        // Ensure tokens were created
        $this->assertDatabaseHas('secure_action_tokens', [
            'user_id' => $this->standardUser->id,
            'token_type' => 'password_reset',
        ]);
        $this->assertDatabaseHas('secure_action_tokens', [
            'user_id' => $this->standardUser->id,
            'token_type' => 'email_verification',
        ]);
    }
}
