<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\Module;
use App\Models\User;

/**
 * Service to build permission-filtered navigation trees per application area.
 */
class NavigationBuilder
{
    public function __construct(
        protected HookManager $hookManager
    ) {}

    /**
     * Build navigation tree for a specific user and area.
     *
     * @return array<int, array<string, mixed>>
     */
    public function build(User $user, string $area = 'dashboard'): array
    {
        $modules = Module::where('is_installed', true)
            ->where('is_enabled', true)
            ->where(function ($query) use ($area): void {
                $query->where('area', $area)->orWhere('area', 'both');
            })
            ->get();

        $items = [];

        foreach ($modules as $module) {
            $manifest = $module->manifest;
            if (! isset($manifest['menu']) || ! is_array($manifest['menu'])) {
                continue;
            }

            $menu = $manifest['menu'];
            $requiredPermission = $menu['permission'] ?? "{$module->slug}.view";

            // If user is super-admin or has the required permission, include it
            if ($user->isSuperAdmin() || $user->hasPermissionTo($requiredPermission, 'web') || $user->hasPermissionTo($requiredPermission, 'sanctum')) {
                // Filter child items if present
                $children = [];
                if (! empty($menu['children']) && is_array($menu['children'])) {
                    foreach ($menu['children'] as $child) {
                        $childPermission = $child['permission'] ?? $requiredPermission;
                        if ($user->isSuperAdmin() || $user->hasPermissionTo($childPermission, 'web') || $user->hasPermissionTo($childPermission, 'sanctum')) {
                            $children[] = $child;
                        }
                    }
                }

                $items[] = [
                    'id' => $module->slug,
                    'label' => $menu['label'] ?? $module->name,
                    'icon' => $menu['icon'] ?? 'box',
                    'route' => $menu['route'] ?? "/{$module->slug}",
                    'position' => $menu['position'] ?? 50,
                    'module' => $module->slug,
                    'children' => $children,
                ];
            }
        }

        // Apply area navigation hooks
        $items = $this->hookManager->applyFilters("{$area}.navigation.menu", $items, $user);

        // Sort items by position
        usort($items, function (array $a, array $b): int {
            return ($a['position'] ?? 50) <=> ($b['position'] ?? 50);
        });

        return $items;
    }
}
