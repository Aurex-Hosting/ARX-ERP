<?php

declare(strict_types=1);

namespace App\Core\Services\Mcp;

use App\Core\Models\AuditLog;
use App\Core\Models\PendingApproval;
use App\Core\Services\HookManager;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

/**
 * Security gateway mediating AI Agent tool executions with RBAC, audit logging, and HITL approval.
 */
class ToolGateway
{
    public function __construct(
        protected McpRegistry $registry,
        protected HookManager $hookManager
    ) {}

    /**
     * Execute tool or submit to approval queue if required.
     *
     * @param  array<string, mixed>  $arguments
     * @return array<string, mixed>
     *
     * @throws AuthorizationException|\InvalidArgumentException
     */
    public function handle(string $toolName, array $arguments, User $actor): array
    {
        $tool = $this->registry->getTool($toolName);

        if (! $tool) {
            throw new \InvalidArgumentException("MCP Tool '{$toolName}' is not registered");
        }

        // 1. Authorization check
        $requiredPermission = $tool->getRequiredPermission();
        if ($requiredPermission && ! $actor->isSuperAdmin() && ! $actor->hasPermissionTo($requiredPermission, 'sanctum') && ! $actor->hasPermissionTo($requiredPermission, 'web')) {
            throw new AuthorizationException("Forbidden: Missing permission '{$requiredPermission}' to execute {$toolName}");
        }

        // 2. Human-in-the-Loop check
        if ($tool->requiresApproval() && ! $actor->isSuperAdmin()) {
            $approval = PendingApproval::create([
                'agent_id' => $actor->id,
                'tool_name' => $toolName,
                'parameters' => $arguments,
                'status' => 'pending',
            ]);

            $this->hookManager->doAction('ai.approval_requested', $approval, $actor);

            return [
                'status' => 'pending_approval',
                'approval_id' => $approval->id,
                'message' => "Action requires human approval. Request #{$approval->id} has been queued.",
            ];
        }

        // 3. Execute tool
        $startTime = microtime(true);
        $result = $tool->execute($arguments, $actor);
        $executionTimeMs = (microtime(true) - $startTime) * 1000;

        // 4. Audit Log
        AuditLog::create([
            'user_id' => $actor->id,
            'user_type' => $actor->user_type ?? 'ai_agent',
            'action' => 'mcp_tool_execute',
            'model_type' => get_class($tool),
            'model_id' => null,
            'old_values' => null,
            'new_values' => [
                'tool' => $toolName,
                'arguments' => $arguments,
                'result' => $result,
                'execution_time_ms' => round($executionTimeMs, 2),
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent() ?? 'MCP-Client',
            'metadata' => [
                'mcp' => true,
                'tool' => $toolName,
            ],
        ]);

        $this->hookManager->doAction('ai.tool_executed', $toolName, $arguments, $result, $actor);

        return [
            'status' => 'success',
            'result' => $result,
        ];
    }
}
