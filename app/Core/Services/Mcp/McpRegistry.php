<?php

declare(strict_types=1);

namespace App\Core\Services\Mcp;

use App\Core\Contracts\McpToolInterface;

/**
 * Registry storing all active MCP tools, resources, and prompts registered by Core and Modules.
 */
class McpRegistry
{
    /**
     * Registered MCP tools keyed by name.
     *
     * @var array<string, McpToolInterface>
     */
    protected array $tools = [];

    /**
     * Registered MCP resources keyed by URI pattern.
     *
     * @var array<string, array<string, mixed>>
     */
    protected array $resources = [];

    /**
     * Registered MCP prompt templates keyed by name.
     *
     * @var array<string, array<string, mixed>>
     */
    protected array $prompts = [];

    /**
     * Register an MCP tool.
     */
    public function registerTool(McpToolInterface $tool): void
    {
        $this->tools[$tool->getName()] = $tool;
    }

    /**
     * Get tool instance by name.
     */
    public function getTool(string $name): ?McpToolInterface
    {
        return $this->tools[$name] ?? null;
    }

    /**
     * Get all registered tools.
     *
     * @return array<string, McpToolInterface>
     */
    public function getTools(): array
    {
        return $this->tools;
    }

    /**
     * Register an MCP resource.
     *
     * @param  array<string, mixed>  $definition
     */
    public function registerResource(string $uri, array $definition): void
    {
        $this->resources[$uri] = $definition;
    }

    /**
     * Get all registered resources.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getResources(): array
    {
        return $this->resources;
    }

    /**
     * Register a prompt template.
     *
     * @param  array<string, mixed>  $template
     */
    public function registerPrompt(string $name, array $template): void
    {
        $this->prompts[$name] = $template;
    }

    /**
     * Get all registered prompts.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getPrompts(): array
    {
        return $this->prompts;
    }
}
