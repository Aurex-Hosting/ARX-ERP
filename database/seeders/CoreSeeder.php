<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Core\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Seeder creating initial core roles, permissions, default Super-Admin, and settings.
 */
class CoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create Core Roles
        $superAdmin = Role::firstOrCreate(['name' => config('arx.roles.super_admin', 'super-admin')]);
        $user = Role::firstOrCreate(['name' => config('arx.roles.user', 'user')]);
        $aiAgent = Role::firstOrCreate(['name' => config('arx.roles.ai_agent', 'ai-agent')]);

        // 2. Create Core Permissions
        $corePermissions = [
            'users.view',
            'users.create',
            'users.edit',
            'users.change_password',
            'users.toggle_status',
            'users.delete',
            'users.trash.view',
            'users.restore',
            'users.force_delete',
            'roles.view',
            'roles.manage',
            'modules.view',
            'modules.manage',
            'themes.view',
            'themes.manage',
            'themes.general.view',
            'themes.general.manage',
            'themes.quick_links.view',
            'themes.quick_links.manage',
            'backups.view',
            'backups.create',
            'backups.download',
            'backups.restore',
            'backups.delete',
            'settings.view',
            'settings.manage',
            'audit_logs.view',
            'audit_logs.delete',
            'audit_logs.clear',
            'audit_logs.export',
            'login_history.view',
            'login_history.clear',
            'login_history.revoke',
            'notifications.view',
            'notifications.create',
            'notifications.analytics',
            'notifications.edit',
            'notifications.delete',
            'notifications.resend',
            'mail.view',
            'mail.manage',
            'mail.test',
            'mail.templates',
            'api.view',
            'api.create',
            'api.edit',
            'api.delete',
            'ai_agents.view',
            'ai_agents.manage',
            'mcp.execute',
        ];

        foreach ($corePermissions as $permissionName) {
            $perm = Permission::firstOrCreate(['name' => $permissionName]);
            $superAdmin->givePermissionTo($perm);
            $aiAgent->givePermissionTo($perm);
        }

        // 3. Create Default Super-Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@arx-erp.local'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('password123'),
                'user_type' => 'user',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles([$superAdmin]);

        // 4. Create Default AI-Agent Identity
        $agent = User::firstOrCreate(
            ['email' => 'agent@arx-erp.local'],
            [
                'name' => 'System AI Agent',
                'password' => Hash::make(bin2hex(random_bytes(16))),
                'user_type' => 'ai_agent',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $agent->syncRoles([$aiAgent]);

        // 5. Create Default Settings
        Setting::firstOrCreate(
            ['key' => 'system.app_name'],
            [
                'value' => 'ARX-ERP',
                'group' => 'system',
                'type' => 'string',
                'scope' => 'system',
            ]
        );

        Setting::firstOrCreate(
            ['key' => 'theme.dashboard.active'],
            [
                'value' => 'default',
                'group' => 'themes',
                'type' => 'string',
                'scope' => 'system',
            ]
        );

        Setting::firstOrCreate(
            ['key' => 'theme.admin.active'],
            [
                'value' => 'default',
                'group' => 'themes',
                'type' => 'string',
                'scope' => 'system',
            ]
        );

        // 6. Initialize Mail & SMTP Defaults
        $this->call(MailSetupSeeder::class);
    }
}
