<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\ApiKey;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiKeyTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->superAdmin = User::where('email', 'admin@arx-erp.local')->first();
    }

    public function test_super_admin_can_list_api_keys_and_view_stats(): void
    {
        ApiKey::create([
            'user_id' => $this->superAdmin->id,
            'name' => 'Test Mobile App',
            'key_id' => 'arx_key_test1',
            'key_hash' => hash('sha256', 'arx_live_test1'),
            'secret_preview' => 'arx_live_•••••••test1',
            'permissions' => ['users.view'],
            'rate_limit' => 120,
            'ip_restriction_type' => 'whitelist',
            'ip_addresses' => ['192.168.1.1'],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/api-keys');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'api_keys' => [
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'key_id',
                            'secret_preview',
                            'permissions',
                            'rate_limit',
                            'ip_restriction_type',
                            'ip_addresses',
                            'is_active',
                            'status',
                        ],
                    ],
                ],
                'stats' => [
                    'total_keys',
                    'active_keys',
                    'expired_keys',
                    'total_requests',
                ],
            ]);
    }

    public function test_super_admin_can_create_api_key_with_full_rules(): void
    {
        $payload = [
            'name' => 'CRM Payment Sync',
            'permissions' => ['users.view', 'modules.view', 'api.view'],
            'allowed_endpoints' => ['/api/v1/users*', '/api/v1/modules*'],
            'rate_limit' => 300,
            'ip_restriction_type' => 'whitelist',
            'ip_addresses' => ['127.0.0.1', '10.0.0.1'],
            'expires_at' => now()->addDays(90)->toIso8601String(),
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/api-keys', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('message', "Application API Key 'CRM Payment Sync' created successfully.")
            ->assertJsonStructure([
                'message',
                'api_key' => [
                    'id',
                    'name',
                    'key_id',
                    'secret_preview',
                    'permissions',
                    'rate_limit',
                    'ip_restriction_type',
                    'ip_addresses',
                ],
                'plain_secret',
            ]);

        $this->assertStringStartsWith('arx_live_', $response->json('plain_secret'));

        $this->assertDatabaseHas('api_keys', [
            'name' => 'CRM Payment Sync',
            'rate_limit' => 300,
            'ip_restriction_type' => 'whitelist',
            'is_active' => true,
        ]);
    }

    public function test_super_admin_can_update_and_toggle_api_key(): void
    {
        $apiKey = ApiKey::create([
            'user_id' => $this->superAdmin->id,
            'name' => 'Initial Name',
            'key_id' => 'arx_key_test2',
            'key_hash' => hash('sha256', 'arx_live_test2'),
            'secret_preview' => 'arx_live_•••••••test2',
            'permissions' => ['*'],
            'rate_limit' => 60,
            'is_active' => true,
        ]);

        // Update
        $updateResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/api-keys/{$apiKey->id}", [
                'name' => 'Updated Name',
                'rate_limit' => 500,
                'ip_restriction_type' => 'blacklist',
                'ip_addresses' => ['1.2.3.4'],
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('api_key.name', 'Updated Name')
            ->assertJsonPath('api_key.rate_limit', 500);

        // Toggle Status
        $toggleResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson("/api/v1/admin/api-keys/{$apiKey->id}/toggle-status");

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('api_key.is_active', false);

        // Regenerate Secret
        $regenResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/admin/api-keys/{$apiKey->id}/regenerate");

        $regenResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'api_key', 'plain_secret']);
        $this->assertStringStartsWith('arx_live_', $regenResponse->json('plain_secret'));

        // Delete
        $deleteResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/api-keys/{$apiKey->id}");

        $deleteResponse->assertStatus(200);
        $this->assertSoftDeleted('api_keys', ['id' => $apiKey->id]);
    }

    public function test_super_admin_can_fetch_permission_meta(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/api-keys/meta');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'permission_groups',
                'all_permissions',
                'endpoint_presets',
            ]);
    }
}
