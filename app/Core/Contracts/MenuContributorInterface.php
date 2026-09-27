<?php

declare(strict_types=1);

namespace App\Core\Contracts;

use App\Models\User;

/**
 * Interface for modules contributing navigation items.
 */
interface MenuContributorInterface
{
    /**
     * Get menu items for the navigation tree.
     *
     * @return array<int, array{
     *     label: string,
     *     icon: string,
     *     route: string,
     *     area: string,
     *     position?: int,
     *     permission?: string,
     *     children?: array<int, array<string, mixed>>
     * }>
     */
    public function getMenuItems(User $user): array;
}
