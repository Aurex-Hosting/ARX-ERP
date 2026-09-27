<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Services\TwoFactorAuthService;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TwoFactorAndSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected TwoFactorAuthService $totpService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->admin = User::where('email', 'admin@arx-erp.local')->first();
        $this->totpService = app(TwoFactorAuthService::class);
    }

    public function test_authenticated_user_can_update_password(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'password123',
                'password' => 'NewSecurePassword!2026',
                'password_confirmation' => 'NewSecurePassword!2026',
            ]);

        $response->assertStatus(200);

        $this->admin->refresh();
        $this->assertTrue(Hash::check('NewSecurePassword!2026', $this->admin->password));
    }

    public function test_user_can_setup_and_enable_2fa(): void
    {
        // 1. Setup request
        $setupRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/auth/2fa/setup');

        $setupRes->assertStatus(200)
            ->assertJsonPath('is_enabled', false)
            ->assertJsonStructure(['secret', 'qr_uri']);

        $secret = $setupRes->json('secret');

        // 2. Generate valid TOTP code
        $timeSlice = (int) floor(time() / 30);
        $validCode = $this->totpService->calculateCode($secret, $timeSlice);

        // 3. Confirm 2FA
        $confirmRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/auth/2fa/confirm', [
                'secret' => $secret,
                'code' => $validCode,
            ]);

        $confirmRes->assertStatus(200)
            ->assertJsonCount(8, 'recovery_codes')
            ->assertJsonPath('status.is_enabled', true)
            ->assertJsonPath('status.used', 0)
            ->assertJsonPath('status.remaining', 8);

        $this->admin->refresh();
        $this->assertNotNull($this->admin->two_factor_secret);
        $this->assertNotNull($this->admin->two_factor_confirmed_at);
    }

    public function test_login_flow_with_2fa_challenge_and_totp_verification(): void
    {
        // Enable 2FA on admin
        $secret = $this->totpService->generateSecretKey();
        $this->admin->two_factor_secret = $secret;
        $this->admin->two_factor_confirmed_at = now();
        $recoveryCodes = $this->totpService->generateRecoveryCodes(8);
        $this->totpService->storeRecoveryCodes($this->admin, $recoveryCodes);
        $this->admin->save();

        // 1. Initial login returns 2FA challenge
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'password123',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonPath('two_factor_required', true)
            ->assertJsonStructure(['two_factor_token']);

        $twoFactorToken = $loginRes->json('two_factor_token');

        // 2. Verify with valid TOTP code
        $timeSlice = (int) floor(time() / 30);
        $validCode = $this->totpService->calculateCode($secret, $timeSlice);

        $verifyRes = $this->postJson('/api/v1/auth/2fa/verify', [
            'two_factor_token' => $twoFactorToken,
            'code' => $validCode,
        ]);

        $verifyRes->assertStatus(200)
            ->assertJsonPath('auth_method', '2fa_totp')
            ->assertJsonStructure(['token', 'user']);

        $this->assertDatabaseHas('login_histories', [
            'user_id' => $this->admin->id,
            'status' => 'success',
        ]);
    }

    public function test_login_with_single_use_backup_recovery_code(): void
    {
        // Enable 2FA on admin
        $secret = $this->totpService->generateSecretKey();
        $this->admin->two_factor_secret = $secret;
        $this->admin->two_factor_confirmed_at = now();
        $recoveryCodes = $this->totpService->generateRecoveryCodes(8);
        $this->totpService->storeRecoveryCodes($this->admin, $recoveryCodes);
        $this->admin->save();

        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'password123',
        ]);

        $twoFactorToken = $loginRes->json('two_factor_token');
        $backupCodeToUse = $recoveryCodes[0];

        // Verify with backup recovery code
        $verifyRes = $this->postJson('/api/v1/auth/2fa/verify', [
            'two_factor_token' => $twoFactorToken,
            'backup_code' => $backupCodeToUse,
        ]);

        $verifyRes->assertStatus(200)
            ->assertJsonPath('auth_method', '2fa_backup_code');

        // Verify recovery code is consumed
        $this->admin->refresh();
        $status = $this->totpService->getRecoveryCodesStatus($this->admin);
        $this->assertEquals(1, $status['used']);
        $this->assertEquals(7, $status['remaining']);

        // Attempting to reuse same backup code must fail
        $secondLoginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'password123',
        ]);

        $secondVerifyRes = $this->postJson('/api/v1/auth/2fa/verify', [
            'two_factor_token' => $secondLoginRes->json('two_factor_token'),
            'backup_code' => $backupCodeToUse,
        ]);

        $secondVerifyRes->assertStatus(422);
    }

    public function test_three_failed_password_attempts_locks_account_for_10_minutes(): void
    {
        // 3 failed password attempts
        $this->postJson('/api/v1/auth/login', ['email' => 'admin@arx-erp.local', 'password' => 'wrong-1']);
        $this->postJson('/api/v1/auth/login', ['email' => 'admin@arx-erp.local', 'password' => 'wrong-2']);
        $thirdRes = $this->postJson('/api/v1/auth/login', ['email' => 'admin@arx-erp.local', 'password' => 'wrong-3']);

        $thirdRes->assertStatus(422);

        $this->admin->refresh();
        $this->assertEquals(1, $this->admin->lockout_level);
        $this->assertNotNull($this->admin->locked_until);
        $this->assertTrue(now()->diffInMinutes($this->admin->locked_until) >= 9);

        // Subsequent attempt returns 423 Locked
        $lockedRes = $this->postJson('/api/v1/auth/login', ['email' => 'admin@arx-erp.local', 'password' => 'password123']);
        $lockedRes->assertStatus(423)
            ->assertJsonPath('is_locked', true);
    }

    public function test_admin_can_disable_2fa_for_user(): void
    {
        $secret = $this->totpService->generateSecretKey();
        $this->admin->two_factor_secret = $secret;
        $this->admin->two_factor_confirmed_at = now();
        $this->admin->save();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/users/{$this->admin->identifier}/disable-2fa");

        $response->assertStatus(200);

        $this->admin->refresh();
        $this->assertNull($this->admin->two_factor_secret);
        $this->assertNull($this->admin->two_factor_confirmed_at);
        $this->assertNull($this->admin->two_factor_recovery_codes);
    }
}
