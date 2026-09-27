<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 1. Implicitly grant Super-Admins all current and upcoming abilities via Gate
        Gate::before(function ($user, $ability): ?bool {
            if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
                return true;
            }

            return null;
        });

        // 2. Automatically sync any newly created permission directly to the super-admin role
        Permission::created(function (Permission $permission): void {
            $superAdminRoleName = config('arx.roles.super_admin', 'super-admin');
            $superAdminRole = Role::where('name', $superAdminRoleName)
                ->where('guard_name', $permission->guard_name)
                ->first();

            if ($superAdminRole && ! $superAdminRole->hasPermissionTo($permission, $permission->guard_name)) {
                $superAdminRole->givePermissionTo($permission);
            }
        });
    }
}
