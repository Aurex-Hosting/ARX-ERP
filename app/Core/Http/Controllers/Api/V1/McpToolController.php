<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\PendingApproval;
use App\Core\Services\Mcp\McpRegistry;
use App\Core\Services\Mcp\ToolGateway;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller exposing MCP discovery, tool execution gateway, and HITL approval management.
 */
class McpToolController extends Controller
{
    public function __construct(
        protected McpRegistry $registry,
        protected ToolGateway $gateway
    ) {}

    /**
     * List all registered MCP tools and their schemas.
     */
    public function tools(): JsonResponse
    {
        $tools = [];

        foreach ($this->registry->getTools() as $name => $tool) {
            $tools[] = [
                'name' => $name,
                'description' => $tool->getDescription(),
                'parameters' => $tool->getParameters(),
                'requires_approval' => $tool->requiresApproval(),
                'required_permission' => $tool->getRequiredPermission(),
            ];
        }

        return response()->json([
            'tools' => $tools,
        ]);
    }

    /**
     * List all registered MCP resources.
     */
    public function resources(): JsonResponse
    {
        return response()->json([
            'resources' => $this->registry->getResources(),
        ]);
    }

    /**
     * List all registered MCP prompt templates.
     */
    public function prompts(): JsonResponse
    {
        return response()->json([
            'prompts' => $this->registry->getPrompts(),
        ]);
    }

    /**
     * Execute an MCP tool via the ToolGateway.
     */
    public function execute(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tool' => ['required', 'string'],
            'arguments' => ['nullable', 'array'],
        ]);

        $actor = $request->user();
        $toolName = $validated['tool'];
        $arguments = $validated['arguments'] ?? [];

        $response = $this->gateway->handle($toolName, $arguments, $actor);

        return response()->json($response);
    }

    /**
     * List pending approvals for human review (Admin only).
     */
    public function approvals(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');
        $approvals = PendingApproval::with('agent:id,name,email')
            ->where('status', $status)
            ->latest('id')
            ->paginate(20);

        return response()->json($approvals);
    }

    /**
     * Approve a pending AI action (Admin only).
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $approval = PendingApproval::findOrFail($id);

        if ($approval->status !== 'pending') {
            return response()->json([
                'message' => "Approval #{$id} is already {$approval->status}.",
            ], 400);
        }

        $tool = $this->registry->getTool($approval->tool_name);
        if (! $tool) {
            return response()->json([
                'message' => "Tool {$approval->tool_name} is no longer registered.",
            ], 404);
        }

        $result = $tool->execute($approval->parameters, $approval->agent);

        $approval->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $request->input('notes'),
            'execution_result' => $result,
        ]);

        return response()->json([
            'message' => "Action #{$id} approved and executed.",
            'result' => $result,
        ]);
    }

    /**
     * Reject a pending AI action (Admin only).
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $approval = PendingApproval::findOrFail($id);

        if ($approval->status !== 'pending') {
            return response()->json([
                'message' => "Approval #{$id} is already {$approval->status}.",
            ], 400);
        }

        $approval->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $request->input('notes'),
        ]);

        return response()->json([
            'message' => "Action #{$id} rejected.",
        ]);
    }
}
