<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\AuditLog;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);

        $this->admin = User::factory()->create([
            'user_type' => 'user',
        ]);
        $this->admin->assignRole('super-admin');

        Sanctum::actingAs($this->admin);
    }

    public function test_can_list_audit_logs_with_enriched_details(): void
    {
        AuditLog::create([
            'request_id' => 'req-12345',
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'user_identifier' => $this->admin->identifier,
            'action' => 'create',
            'description' => 'Super Administrator created User',
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->getJson('/api/v1/admin/audit-logs');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'request_id',
                        'user_id',
                        'user_type',
                        'user_identifier',
                        'action',
                        'description',
                        'created_at',
                    ],
                ],
            ]);
    }

    public function test_auditable_trait_captures_soft_delete_restore_and_force_delete(): void
    {
        // 1. Create a user (triggers create audit)
        $targetUser = User::factory()->create([
            'name' => 'Alice Test',
            'first_name' => 'Alice',
            'last_name' => 'Test',
        ]);

        $createLog = AuditLog::where('model_type', User::class)
            ->where('model_id', $targetUser->id)
            ->where('action', 'create')
            ->first();

        $this->assertNotNull($createLog);
        $this->assertStringContainsString('created User', (string) $createLog->description);
        $this->assertEquals($targetUser->identifier, $createLog->model_identifier);

        // 2. Soft delete user (triggers soft_delete audit)
        $targetUser->delete();

        $softDeleteLog = AuditLog::where('model_type', User::class)
            ->where('model_id', $targetUser->id)
            ->where('action', 'soft_delete')
            ->first();

        $this->assertNotNull($softDeleteLog);
        $this->assertStringContainsString('Recycle Bin', (string) $softDeleteLog->description);

        // 3. Restore user (triggers restore audit)
        $targetUser->restore();

        $restoreLog = AuditLog::where('model_type', User::class)
            ->where('model_id', $targetUser->id)
            ->where('action', 'restore')
            ->first();

        $this->assertNotNull($restoreLog);
        $this->assertStringContainsString('restored User', (string) $restoreLog->description);

        // 4. Force delete user (triggers force_delete audit)
        $targetUser->forceDelete();

        $forceDeleteLog = AuditLog::where('model_type', User::class)
            ->where('model_id', $targetUser->id)
            ->where('action', 'force_delete')
            ->first();

        $this->assertNotNull($forceDeleteLog);
        $this->assertStringContainsString('permanently deleted User', (string) $forceDeleteLog->description);
    }

    public function test_can_search_audit_logs(): void
    {
        AuditLog::create([
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'user_identifier' => 'ADM-XYZ',
            'action' => 'update',
            'description' => 'Administrator updated Module settings',
            'ip_address' => '192.168.1.100',
        ]);

        $response = $this->getJson('/api/v1/admin/audit-logs?search=settings');
        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));

        $emptyResponse = $this->getJson('/api/v1/admin/audit-logs?search=nonexistent_token_999999');
        $emptyResponse->assertOk();
        $this->assertCount(0, $emptyResponse->json('data'));
    }

    public function test_can_export_audit_logs_as_zip(): void
    {
        AuditLog::create([
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'action' => 'module.install',
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->post('/api/v1/admin/audit-logs/export', [
            'all' => true,
        ]);

        $response->assertOk();
        $this->assertEquals('application/zip', $response->headers->get('content-type'));
    }

    public function test_can_delete_single_audit_log(): void
    {
        $log = AuditLog::create([
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'action' => 'test_action',
            'description' => 'Test log to delete',
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->deleteJson("/api/v1/admin/audit-logs/{$log->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('audit_logs', ['id' => $log->id]);
    }

    public function test_can_batch_delete_audit_logs(): void
    {
        $log1 = AuditLog::create([
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'action' => 'batch_1',
            'ip_address' => '127.0.0.1',
        ]);
        $log2 = AuditLog::create([
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'action' => 'batch_2',
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->postJson('/api/v1/admin/audit-logs/batch-delete', [
            'ids' => [$log1->id, $log2->id],
        ]);

        $response->assertOk()
            ->assertJson(['deleted_count' => 2]);

        $this->assertDatabaseMissing('audit_logs', ['id' => $log1->id]);
        $this->assertDatabaseMissing('audit_logs', ['id' => $log2->id]);
    }

    public function test_can_delete_audit_logs_by_date_range_and_all(): void
    {
        AuditLog::query()->delete();

        AuditLog::create([
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'action' => 'module.enable',
            'ip_address' => '127.0.0.1',
            'created_at' => now()->subDays(10),
        ]);

        AuditLog::create([
            'user_id' => $this->admin->id,
            'user_type' => 'user',
            'action' => 'module.disable',
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        $this->assertDatabaseCount('audit_logs', 2);

        // Delete date range
        $response = $this->deleteJson('/api/v1/admin/audit-logs', [
            'from_date' => now()->subDays(15)->toDateString(),
            'to_date' => now()->subDays(5)->toDateString(),
        ]);

        $response->assertOk()
            ->assertJson(['deleted_count' => 1]);

        $this->assertDatabaseCount('audit_logs', 1);

        // Delete all
        $responseAll = $this->deleteJson('/api/v1/admin/audit-logs', [
            'all' => true,
        ]);

        $responseAll->assertOk();
        $this->assertDatabaseCount('audit_logs', 0);
    }
}
