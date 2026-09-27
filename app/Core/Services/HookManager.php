<?php

declare(strict_types=1);

namespace App\Core\Services;

/**
 * Central event hook manager providing Action and Filter extensibility without core modification.
 */
class HookManager
{
    /**
     * Registered action callbacks grouped by hook name and priority.
     *
     * @var array<string, array<int, array<int, callable>>>
     */
    protected array $actions = [];

    /**
     * Registered filter callbacks grouped by hook name and priority.
     *
     * @var array<string, array<int, array<int, callable>>>
     */
    protected array $filters = [];

    /**
     * Register an action hook.
     */
    public function registerAction(string $hook, callable $callback, int $priority = 10): void
    {
        $this->actions[$hook][$priority][] = $callback;
    }

    /**
     * Register a filter hook.
     */
    public function registerFilter(string $hook, callable $callback, int $priority = 10): void
    {
        $this->filters[$hook][$priority][] = $callback;
    }

    /**
     * Execute all callbacks registered to an action hook in order of priority.
     */
    public function doAction(string $hook, mixed ...$args): void
    {
        if (! isset($this->actions[$hook])) {
            return;
        }

        $priorities = $this->actions[$hook];
        ksort($priorities);

        foreach ($priorities as $callbacks) {
            foreach ($callbacks as $callback) {
                $callback(...$args);
            }
        }
    }

    /**
     * Apply filter chain to a value and return the transformed output.
     */
    public function applyFilters(string $hook, mixed $value, mixed ...$args): mixed
    {
        if (! isset($this->filters[$hook])) {
            return $value;
        }

        $priorities = $this->filters[$hook];
        ksort($priorities);

        foreach ($priorities as $callbacks) {
            foreach ($callbacks as $callback) {
                $value = $callback($value, ...$args);
            }
        }

        return $value;
    }

    /**
     * Check if an action has registered listeners.
     */
    public function hasAction(string $hook): bool
    {
        return ! empty($this->actions[$hook]);
    }

    /**
     * Check if a filter has registered listeners.
     */
    public function hasFilter(string $hook): bool
    {
        return ! empty($this->filters[$hook]);
    }

    /**
     * Get list of all registered hooks for debugging and developer introspection.
     *
     * @return array{
     *     actions: array<string, int>,
     *     filters: array<string, int>
     * }
     */
    public function getRegisteredHooks(): array
    {
        $actionCounts = [];
        foreach ($this->actions as $hook => $priorities) {
            $count = 0;
            foreach ($priorities as $callbacks) {
                $count += count($callbacks);
            }
            $actionCounts[$hook] = $count;
        }

        $filterCounts = [];
        foreach ($this->filters as $hook => $priorities) {
            $count = 0;
            foreach ($priorities as $callbacks) {
                $count += count($callbacks);
            }
            $filterCounts[$hook] = $count;
        }

        return [
            'actions' => $actionCounts,
            'filters' => $filterCounts,
        ];
    }
}
