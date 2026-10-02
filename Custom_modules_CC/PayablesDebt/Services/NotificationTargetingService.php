<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Modules\Dashboard\PayablesDebt\Models\PayableNotificationConfig;

/**
 * Resolves targeted notification recipients based on configured audience rules.
 */
class NotificationTargetingService
{
    /**
     * Resolve the list of users who should receive notifications.
     *
     * @return Collection<int, User>
     */
    public function resolveRecipients(?PayableNotificationConfig $config = null): Collection
    {
        $config ??= PayableNotificationConfig::instance();

        return match ($config->audience_type) {
            'all_users' => $this->allActiveUsers(),
            'specific_roles' => $this->usersWithRoles($config->selected_role_ids ?? []),
            'all_except_roles' => $this->allExceptRoles($config->excluded_role_ids ?? []),
            'all_except_users' => $this->allExceptUsers($config->excluded_user_ids ?? []),
            'selected_users_and_roles' => $this->selectedUsersAndRoles(
                $config->selected_user_ids ?? [],
                $config->selected_role_ids ?? []
            ),
            'selected_roles_except_users' => $this->selectedRolesExceptUsers(
                $config->selected_role_ids ?? [],
                $config->excluded_user_ids ?? []
            ),
            default => collect(),
        };
    }

    /**
     * All active users in the system.
     *
     * @return Collection<int, User>
     */
    protected function allActiveUsers(): Collection
    {
        return User::where('is_active', true)->get();
    }

    /**
     * Users who hold any of the specified roles.
     *
     * @param  array<int>  $roleIds
     * @return Collection<int, User>
     */
    protected function usersWithRoles(array $roleIds): Collection
    {
        if (empty($roleIds)) {
            return collect();
        }

        return User::where('is_active', true)
            ->whereHas('roles', function ($query) use ($roleIds): void {
                $query->whereIn('id', $roleIds);
            })
            ->get();
    }

    /**
     * All active users except those holding any of the excluded roles.
     *
     * @param  array<int>  $excludedRoleIds
     * @return Collection<int, User>
     */
    protected function allExceptRoles(array $excludedRoleIds): Collection
    {
        if (empty($excludedRoleIds)) {
            return $this->allActiveUsers();
        }

        return User::where('is_active', true)
            ->whereDoesntHave('roles', function ($query) use ($excludedRoleIds): void {
                $query->whereIn('id', $excludedRoleIds);
            })
            ->get();
    }

    /**
     * All active users except the specified user IDs.
     *
     * @param  array<int>  $excludedUserIds
     * @return Collection<int, User>
     */
    protected function allExceptUsers(array $excludedUserIds): Collection
    {
        if (empty($excludedUserIds)) {
            return $this->allActiveUsers();
        }

        return User::where('is_active', true)
            ->whereNotIn('id', $excludedUserIds)
            ->get();
    }

    /**
     * Union of individually selected users and users who hold any of the specified roles.
     *
     * @param  array<int>  $userIds
     * @param  array<int>  $roleIds
     * @return Collection<int, User>
     */
    protected function selectedUsersAndRoles(array $userIds, array $roleIds): Collection
    {
        $directUsers = User::where('is_active', true)
            ->whereIn('id', $userIds)
            ->get();

        $roleUsers = $this->usersWithRoles($roleIds);

        return $directUsers->merge($roleUsers)->unique('id')->values();
    }

    /**
     * Users holding specified roles, minus blacklisted individual user IDs.
     *
     * @param  array<int>  $roleIds
     * @param  array<int>  $excludedUserIds
     * @return Collection<int, User>
     */
    protected function selectedRolesExceptUsers(array $roleIds, array $excludedUserIds): Collection
    {
        $roleUsers = $this->usersWithRoles($roleIds);

        if (empty($excludedUserIds)) {
            return $roleUsers;
        }

        return $roleUsers->reject(function (User $user) use ($excludedUserIds): bool {
            return in_array($user->id, $excludedUserIds, true);
        })->values();
    }
}
