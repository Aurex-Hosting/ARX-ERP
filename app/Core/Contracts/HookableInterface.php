<?php

declare(strict_types=1);

namespace App\Core\Contracts;

/**
 * Interface for services or modules that register lifecycle hooks.
 */
interface HookableInterface
{
    /**
     * Register action and filter hooks with the HookManager.
     */
    public function registerHooks(): void;
}
