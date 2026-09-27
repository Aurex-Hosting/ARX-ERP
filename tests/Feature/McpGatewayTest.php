<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Contracts\McpToolInterface;
use App\Core\Services\Mcp\McpRegistry;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MockReadOnlyTool implements McpToolInterface
{
    public function getName(): string
    {
        return 'test.stock.read';
    }

    public function getDescription(): string
    {
        return 'Read stock level';
    }

    public function getParameters(): array
    {
        return ['sku' => ['type' => 'string']];
    }

    public function requiresApproval(): bool
    {
        return false;
    }

    public function getRequiredPermission(): ?string
    {
        return null;
    }

    public function execute(array $arguments, User $actor): array
    {
        return ['sku' => $arguments['sku'] ?? 'ITEM-1', 'quantity' => 42];
    }
}

class MockProtectedWriteTool implements McpToolInterface
{
    public function getName(): string
    {
        return 'test.stock.delete';
    }

    public function getDescription(): string
    {
        return 'Delete product inventory';
    }

    public function getParameters(): array
    {
        return ['sku' => ['type' => 'string']];
    }

    public function requiresApproval(): bool
    {
        return true;
    }

    public function getRequiredPermission(): ?string
    {
        return null;
    }

    public function execute(array $arguments, User $actor): array
    {
        return ['deleted' => true];
    }
}

class McpGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);

        $registry = app(McpRegistry::class);
        $registry->registerTool(new MockReadOnlyTool);
        $registry->registerTool(new MockProtectedWriteTool);
    }

    public function test_can_introspect_registered_mcp_tools(): void
    {
        $agent = User::where('email', 'agent@arx-erp.local')->first();

        $response = $this->actingAs($agent, 'sanctum')
            ->getJson('/api/v1/mcp/tools');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'test.stock.read'])
            ->assertJsonFragment(['name' => 'test.stock.delete']);
    }

    public function test_ai_agent_can_execute_safe_tool_without_approval(): void
    {
        $agent = User::where('email', 'agent@arx-erp.local')->first();

        $response = $this->actingAs($agent, 'sanctum')
            ->postJson('/api/v1/mcp/execute', [
                'tool' => 'test.stock.read',
                'arguments' => ['sku' => 'LAPTOP-PRO'],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('result.quantity', 42);

        // Verify audit log recorded the AI execution
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $agent->id,
            'user_type' => 'ai_agent',
            'action' => 'mcp_tool_execute',
        ]);
    }

    public function test_destructive_tool_requires_hitl_approval(): void
    {
        $agent = User::where('email', 'agent@arx-erp.local')->first();
        $admin = User::where('email', 'admin@arx-erp.local')->first();

        // 1. Agent requests destructive action
        $execResponse = $this->actingAs($agent, 'sanctum')
            ->postJson('/api/v1/mcp/execute', [
                'tool' => 'test.stock.delete',
                'arguments' => ['sku' => 'LAPTOP-PRO'],
            ]);

        $execResponse->assertStatus(200)
            ->assertJsonPath('status', 'pending_approval');

        $approvalId = $execResponse->json('approval_id');
        $this->assertNotNull($approvalId);

        // 2. Admin reviews and approves the request
        $approveResponse = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/approvals/{$approvalId}/approve", [
                'notes' => 'Authorized by inventory manager',
            ]);

        $approveResponse->assertStatus(200)
            ->assertJsonPath('result.deleted', true);

        $this->assertDatabaseHas('pending_approvals', [
            'id' => $approvalId,
            'status' => 'approved',
            'reviewed_by' => $admin->id,
        ]);
    }
}
