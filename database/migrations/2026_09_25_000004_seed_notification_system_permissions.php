<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
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
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'notifications.view',
            'notifications.create',
            'notifications.analytics',
            'notifications.edit',
            'notifications.delete',
            'notifications.resend',
        ];

        $superAdmin = Role::firstOrCreate(['name' => config('arx.roles.super_admin', 'super-admin')]);
        $aiAgent = Role::firstOrCreate(['name' => config('arx.roles.ai_agent', 'ai-agent')]);

        foreach ($permissions as $permissionName) {
            $perm = Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);

            $existsSuper = DB::table('role_has_permissions')
                ->where('permission_id', $perm->id)
                ->where('role_id', $superAdmin->id)
                ->exists();

            if (! $existsSuper) {
                DB::table('role_has_permissions')->insert([
                    'permission_id' => $perm->id,
                    'role_id' => $superAdmin->id,
                ]);
            }

            $existsAgent = DB::table('role_has_permissions')
                ->where('permission_id', $perm->id)
                ->where('role_id', $aiAgent->id)
                ->exists();

            if (! $existsAgent) {
                DB::table('role_has_permissions')->insert([
                    'permission_id' => $perm->id,
                    'role_id' => $aiAgent->id,
                ]);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = [
            'notifications.view',
            'notifications.create',
            'notifications.analytics',
            'notifications.edit',
            'notifications.delete',
            'notifications.resend',
        ];

        Permission::whereIn('name', $permissions)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
