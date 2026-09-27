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
            'audit_logs.delete',
            'audit_logs.clear',
            'audit_logs.export',
        ];

        $superAdmin = Role::firstOrCreate(['name' => config('arx.roles.super_admin', 'super-admin')]);
        $aiAgent = Role::firstOrCreate(['name' => config('arx.roles.ai_agent', 'ai-agent')]);

        foreach ($permissions as $permissionName) {
            $perm = Permission::firstOrCreate(['name' => $permissionName]);
            if ($superAdmin) {
                $superAdmin->permissions()->syncWithoutDetaching([$perm->id]);
            }
            if ($aiAgent) {
                $aiAgent->permissions()->syncWithoutDetaching([$perm->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::whereIn('name', [
            'audit_logs.delete',
            'audit_logs.clear',
            'audit_logs.export',
        ])->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
