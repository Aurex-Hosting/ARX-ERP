<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CoreSeeder::class);

        $this->superAdmin = User::where('email', 'admin@arx-erp.local')->firstOrFail();
        $this->regularUser = User::factory()->create(['user_type' => 'user']);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/admin/system/overview');
        $response->assertStatus(401);
    }

    public function test_regular_user_cannot_access_system_endpoints(): void
    {
        Sanctum::actingAs($this->regularUser);

        $response = $this->getJson('/api/v1/admin/system/overview');
        $response->assertStatus(403);
    }

    public function test_super_admin_can_retrieve_system_overview(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/v1/admin/system/overview');
        $response->assertOk();
        $response->assertJsonStructure([
            'cpu' => ['usage_percent', 'cores', 'load_average', 'load_display', 'model'],
            'ram' => ['used_formatted', 'total_formatted', 'free_formatted', 'usage_percent', 'display'],
            'disk' => ['used_formatted', 'total_formatted', 'free_formatted', 'usage_percent', 'display'],
            'database' => ['engine', 'latency_ms', 'host', 'database', 'status', 'display'],
            'cache' => ['driver', 'status', 'display'],
            'queue' => ['driver', 'pending', 'failed', 'display'],
            'environment' => [
                'php_version',
                'laravel_version',
                'environment',
                'debug_mode',
                'maintenance',
                'timezone',
                'server_os',
                'cpu_model',
                'db_name',
            ],
            'storage_opcache' => [
                'storage_size',
                'storage_symlink',
                'php_memory_limit',
                'php_memory_now',
                'php_memory_peak',
                'opcache',
                'opcache_hit_rate',
                'cached_scripts',
                'opcache_memory_used',
            ],
            'timestamp',
        ]);
    }

    public function test_super_admin_can_retrieve_processes_state(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/v1/admin/system/processes');
        $response->assertOk();
        $response->assertJsonStructure([
            'octane' => ['running', 'status', 'server', 'listening_on', 'workers', 'max_requests', 'subtitle'],
            'queue_workers' => ['health', 'running_count', 'busy_count', 'idle_count', 'card_title', 'subtitle', 'workers_list', 'depth_by_queue'],
            'scheduler' => ['health', 'running', 'last_tick', 'ticks_recorded', 'failing_tasks', 'tasks'],
            'timestamp',
        ]);
    }

    public function test_super_admin_can_retrieve_and_clear_caches(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // 1. Get Cache Status
        $res = $this->getJson('/api/v1/admin/system/cache');
        $res->assertOk();
        $res->assertJsonStructure([
            'caches',
            'summary' => ['config_cached', 'routes_cached', 'events_cached', 'compiled_views_count'],
        ]);

        // 2. Clear All Caches
        $clearAll = $this->postJson('/api/v1/admin/system/cache/clear', [
            'type' => 'all',
        ]);
        $clearAll->assertOk();
        $clearAll->assertJsonPath('success', true);
        $clearAll->assertJsonPath('type', 'all');

        // 3. Clear Config Cache
        $clearConfig = $this->postJson('/api/v1/admin/system/cache/clear', [
            'type' => 'config',
        ]);
        $clearConfig->assertOk();
        $clearConfig->assertJsonPath('success', true);

        // 4. Clear Route Cache
        $clearRoute = $this->postJson('/api/v1/admin/system/cache/clear', [
            'type' => 'route',
        ]);
        $clearRoute->assertOk();
        $clearRoute->assertJsonPath('success', true);

        // 5. Clear Application Cache
        $clearApp = $this->postJson('/api/v1/admin/system/cache/clear', [
            'type' => 'application',
        ]);
        $clearApp->assertOk();
        $clearApp->assertJsonPath('success', true);
    }

    public function test_super_admin_can_trigger_process_reloads_and_restart(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $octaneRes = $this->postJson('/api/v1/admin/system/processes/reload-octane');
        $octaneRes->assertOk();

        $queueRes = $this->postJson('/api/v1/admin/system/processes/restart-workers');
        $queueRes->assertOk();
        $queueRes->assertJsonPath('success', true);

        $allRes = $this->postJson('/api/v1/admin/system/processes/restart-all');
        $allRes->assertOk();
        $allRes->assertJsonPath('success', true);
    }

    public function test_super_admin_can_add_queue_worker(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->postJson('/api/v1/admin/system/processes/add-worker', [
            'queues' => 'critical,default',
            'count' => 1,
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('queues', 'critical,default');
    }

    public function test_super_admin_can_inspect_extensions_and_maintenance(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $extRes = $this->getJson('/api/v1/admin/system/extensions');
        $extRes->assertOk();
        $extRes->assertJsonStructure(['total', 'extensions']);

        $maintRes = $this->getJson('/api/v1/admin/system/maintenance');
        $maintRes->assertOk();
        $maintRes->assertJsonStructure(['is_down']);
    }
}
