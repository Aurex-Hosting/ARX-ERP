<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\LoginHistory;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->admin = User::where('email', 'admin@arx-erp.local')->first();
    }

    public function test_login_records_successful_history_and_session_token(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'password123',
            'device_name' => 'Chrome on Windows 11',
        ], [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Device-Fingerprint' => 'test-fingerprint-abc-123',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('login_histories', [
            'user_id' => $this->admin->id,
            'email' => 'admin@arx-erp.local',
            'status' => 'success',
            'browser' => 'Google Chrome',
            'platform' => 'Windows 10/11',
            'device_fingerprint' => 'test-fingerprint-abc-123',
            'is_revoked' => false,
        ]);

        $history = LoginHistory::where('email', 'admin@arx-erp.local')->latest()->first();
        $this->assertNotNull($history->personal_access_token_id);
        $this->assertTrue($history->isSessionActive());
    }

    public function test_login_records_failed_attempt(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'wrong-password',
        ], [
            'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseHas('login_histories', [
            'user_id' => $this->admin->id,
            'email' => 'admin@arx-erp.local',
            'status' => 'failed',
            'platform' => 'iOS (iPhone)',
            'device_type' => 'mobile',
            'is_revoked' => false,
        ]);
    }

    public function test_admin_can_view_login_history_and_statistics(): void
    {
        // Generate test history
        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'password123',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/login-history');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
                'stats' => ['total_count', 'active_count', 'failed_count', 'revoked_count', 'older_than_14_days_count'],
            ]);
    }

    public function test_admin_can_revoke_specific_session(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'password123',
        ]);

        $history = LoginHistory::where('email', 'admin@arx-erp.local')->latest()->first();
        $this->assertTrue($history->isSessionActive());

        $revokeRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/login-history/{$history->id}/revoke");

        $revokeRes->assertStatus(200);

        $history->refresh();
        $this->assertTrue($history->is_revoked);
        $this->assertNotNull($history->revoked_at);
        $this->assertFalse($history->isSessionActive());
    }

    public function test_admin_can_revoke_all_sessions(): void
    {
        // Create 2 sessions
        $this->postJson('/api/v1/auth/login', ['email' => 'admin@arx-erp.local', 'password' => 'password123']);
        $this->postJson('/api/v1/auth/login', ['email' => 'admin@arx-erp.local', 'password' => 'password123']);

        $revokeAllRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/login-history/revoke-all', [
                'include_self' => true,
            ]);

        $revokeAllRes->assertStatus(200)
            ->assertJsonPath('self_revoked', true);

        $this->assertEquals(0, LoginHistory::activeSessions()->count());
    }

    public function test_clear_older_history_strictly_preserves_last_14_days(): void
    {
        // 1. Record created 20 days ago (older than 14 days)
        $oldHistory = LoginHistory::create([
            'email' => 'old@arx-erp.local',
            'status' => 'success',
            'ip_address' => '10.0.0.1',
            'login_at' => now()->subDays(20),
        ]);

        // 2. Record created 5 days ago (within 14 days)
        $recentHistory = LoginHistory::create([
            'email' => 'recent@arx-erp.local',
            'status' => 'success',
            'ip_address' => '10.0.0.2',
            'login_at' => now()->subDays(5),
        ]);

        $clearRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/login-history/clear-older');

        $clearRes->assertStatus(200)
            ->assertJsonPath('cleared_count', 1);

        // Verify old record was purged
        $this->assertDatabaseMissing('login_histories', ['id' => $oldHistory->id]);

        // Verify recent record (<14 days) was preserved
        $this->assertDatabaseHas('login_histories', ['id' => $recentHistory->id]);
    }
}
