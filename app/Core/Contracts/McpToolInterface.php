<?php

declare(strict_types=1);

namespace App\Core\Contracts;

use App\Models\User;

/**
 * Interface for MCP (Model Context Protocol) tool providers.
 */
interface McpToolInterface
{
    /**
     * Get unique tool name (e.g. 'users.list' or 'inventory.stock.check').
     */
    public function getName(): string;

    /**
     * Get human/LLM-readable tool description.
     */
    public function getDescription(): string;

    /**
     * Get parameter schema definition (JSON Schema / associative array).
     *
     * @return array<string, mixed>
     */
    public function getParameters(): array;

    /**
     * Does this tool require explicit human-in-the-loop approval before executing?
     */
    public function requiresApproval(): bool;

    /**
     * Required permission to execute this tool.
     */
    public function getRequiredPermission(): ?string;

    /**
     * Execute the tool with given arguments on behalf of the actor (User or AI-Agent).
     *
     * @param  array<string, mixed>  $arguments
     * @return array<string, mixed>
     */
    public function execute(array $arguments, User $actor): array;
}
