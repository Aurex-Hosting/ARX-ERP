<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Remove obsolete settings permissions
        Permission::whereIn('name', [
            'settings.view',
            'settings.manage',
            'updates.view',
            'updates.manage',
        ])->delete();

        // 2. Add granular System Updates permissions
        $updatePermissions = [
            'updates.check',
            'updates.apply',
            'updates.revoke',
            'updates.license_info',
        ];

        $superAdmin = Role::firstOrCreate(['name' => config('arx.roles.super_admin', 'super-admin')]);
        $aiAgent = Role::firstOrCreate(['name' => config('arx.roles.ai_agent', 'ai-agent')]);

        foreach ($updatePermissions as $permissionName) {
            $perm = Permission::firstOrCreate(['name' => $permissionName]);
            if ($superAdmin) {
                $superAdmin->permissions()->syncWithoutDetaching([$perm->id]);
            }
            if ($aiAgent) {
                $aiAgent->permissions()->syncWithoutDetaching([$perm->id]);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::whereIn('name', [
            'updates.check',
            'updates.apply',
            'updates.revoke',
            'updates.license_info',
        ])->delete();

        $settingsPermissions = [
            'settings.view',
            'settings.manage',
        ];

        $superAdmin = Role::firstOrCreate(['name' => config('arx.roles.super_admin', 'super-admin')]);
        $aiAgent = Role::firstOrCreate(['name' => config('arx.roles.ai_agent', 'ai-agent')]);

        foreach ($settingsPermissions as $permissionName) {
            $perm = Permission::firstOrCreate(['name' => $permissionName]);
            if ($superAdmin) {
                $superAdmin->permissions()->syncWithoutDetaching([$perm->id]);
            }
            if ($aiAgent) {
                $aiAgent->permissions()->syncWithoutDetaching([$perm->id]);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
