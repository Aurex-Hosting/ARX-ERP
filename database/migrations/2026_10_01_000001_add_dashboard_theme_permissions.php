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

        $permissions = [
            'themes.dashboard.view',
            'themes.dashboard.manage',
        ];

        $superAdmin = Role::firstOrCreate(['name' => config('arx.roles.super_admin', 'super-admin')]);
        $aiAgent = Role::firstOrCreate(['name' => config('arx.roles.ai_agent', 'ai-agent')]);

        foreach ($permissions as $permissionName) {
            $perm = Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
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
        Permission::whereIn('name', [
            'themes.dashboard.view',
            'themes.dashboard.manage',
        ])->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
