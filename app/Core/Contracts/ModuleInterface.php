<?php

declare(strict_types=1);

namespace App\Core\Contracts;

/**
 * Interface that all ARX-ERP modules must implement.
 */
interface ModuleInterface
{
    /**
     * Get the human-readable name of the module.
     */
    public function getName(): string;

    /**
     * Get the unique slug identifier of the module (e.g. 'contacts-crm').
     */
    public function getSlug(): string;

    /**
     * Get the target application area: 'dashboard' | 'admin' | 'both'.
     */
    public function getArea(): string;

    /**
     * Get the semantic version string of the module (e.g. '1.0.0').
     */
    public function getVersion(): string;

    /**
     * Get array of module slugs this module depends on.
     *
     * @return array<int, string>
     */
    public function getDependencies(): array;

    /**
     * Get list of permissions registered by this module.
     *
     * @return array<int, string>
     */
    public function getPermissions(): array;

    /**
     * Get navigation menu contributions.
     *
     * @return array<string, mixed>
     */
    public function getMenuItems(): array;

    /**
     * Get default settings registered by this module.
     *
     * @return array<string, mixed>
     */
    public function getSettings(): array;

    /**
     * Get MCP tool definitions provided by this module.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getMcpTools(): array;
}
