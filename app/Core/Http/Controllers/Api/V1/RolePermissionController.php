<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\AuditLog;
use App\Core\Models\Module;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Controller providing visual, grouped access to Roles, Permissions,
 * and capability matrix management.
 */
class RolePermissionController extends Controller
{
    /**
     * Core system roles that cannot be deleted or renamed.
     *
     * @var list<string>
     */
    private const CORE_ROLES = ['super-admin', 'user', 'ai-agent'];

    /**
     * List all roles with attached permissions and user counts.
     */
    public function roles(): JsonResponse
    {
        $defaultDescriptions = [
            'super-admin' => 'Unrestricted root access across all core modules and administrative controls.',
            'user' => 'Standard workspace access to assigned application modules.',
            'ai-agent' => 'Autonomous AI Agent identity with authorized tool invocation scope.',
        ];

        $defaultColors = [
            'super-admin' => '#ef4444',
            'user' => '#06b6d4',
            'ai-agent' => '#eab308',
        ];

        $roles = Role::with('permissions:id,name')
            ->withCount('users')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name ?? Str::title(str_replace(['-', '_'], ' ', $role->name)),
                'description' => $role->description ?: ($defaultDescriptions[$role->name] ?? 'Custom role with tailored permissions.'),
                'color' => $role->color ?: ($defaultColors[$role->name] ?? '#8b5cf6'),
                'is_system' => in_array($role->name, self::CORE_ROLES, true),
                'users_count' => $role->users_count,
                'permissions' => $role->permissions->pluck('name'),
                'created_at' => $role->created_at,
            ]);

        return response()->json([
            'roles' => $roles,
        ]);
    }

    /**
     * Show a specific role with permissions and assigned users.
     */
    public function showRole(int $id): JsonResponse
    {
        $defaultColors = [
            'super-admin' => '#ef4444',
            'user' => '#06b6d4',
            'ai-agent' => '#eab308',
        ];

        $role = Role::with(['permissions:id,name', 'users:id,name,email,user_type'])->findOrFail($id);

        return response()->json([
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name ?? Str::title(str_replace(['-', '_'], ' ', $role->name)),
                'description' => $role->description ?? '',
                'color' => $role->color ?: ($defaultColors[$role->name] ?? '#8b5cf6'),
                'is_system' => in_array($role->name, self::CORE_ROLES, true),
                'permissions' => $role->permissions->pluck('name'),
                'users' => $role->users,
                'created_at' => $role->created_at,
            ],
        ]);
    }

    /**
     * Create a new custom enterprise role.
     */
    public function storeRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'display_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'color' => ['nullable', 'string', 'max:50'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $roleSlug = Str::slug($validated['name']);
        $displayName = $validated['display_name'] ?? Str::title(str_replace(['-', '_'], ' ', $validated['name']));

        $role = Role::create([
            'name' => $roleSlug,
            'display_name' => $displayName,
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#8b5cf6',
            'guard_name' => 'web',
        ]);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        $actor = $request->user()?->name ?? 'System';
        AuditLog::record(
            action: 'role_created',
            description: "{$actor} created role '{$role->name}' ({$displayName}) with ".(count($validated['permissions'] ?? [])).' permission(s)',
            model: $role,
            newValues: [
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'permissions' => $validated['permissions'] ?? [],
            ],
            user: $request->user()
        );

        return response()->json([
            'message' => 'Role created successfully.',
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'color' => $role->color,
                'is_system' => false,
                'users_count' => 0,
                'permissions' => $role->permissions->pluck('name'),
            ],
        ], 201);
    }

    /**
     * Update an existing role and its permissions.
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        $role = Role::findOrFail($id);

        if ($role->name === config('arx.roles.super_admin', 'super-admin')) {
            return response()->json([
                'message' => "The 'super-admin' role is immutable and strictly cannot be edited or modified.",
            ], 403);
        }

        $isSystem = in_array($role->name, self::CORE_ROLES, true);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'display_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'color' => ['nullable', 'string', 'max:50'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $oldValues = [
            'name' => $role->name,
            'display_name' => $role->display_name,
            'description' => $role->description,
            'color' => $role->color,
            'permissions' => $role->permissions()->pluck('name')->all(),
        ];

        if (isset($validated['name']) && ! $isSystem) {
            $role->name = Str::slug($validated['name']);
        }

        if (array_key_exists('display_name', $validated)) {
            $role->display_name = $validated['display_name'];
        }

        if (array_key_exists('description', $validated)) {
            $role->description = $validated['description'];
        }

        if (array_key_exists('color', $validated)) {
            $role->color = $validated['color'];
        }

        $role->save();

        if (array_key_exists('permissions', $validated)) {
            $role->syncPermissions($validated['permissions'] ?? []);
        }

        $actor = $request->user()?->name ?? 'System';
        AuditLog::record(
            action: 'role_updated',
            description: "{$actor} updated role '{$role->name}' ({$role->display_name})",
            model: $role,
            oldValues: $oldValues,
            newValues: [
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'color' => $role->color,
                'permissions' => $role->permissions()->pluck('name')->all(),
            ],
            user: $request->user()
        );

        return response()->json([
            'message' => 'Role updated successfully.',
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'color' => $role->color ?: '#8b5cf6',
                'is_system' => $isSystem,
                'permissions' => $role->permissions()->pluck('name'),
            ],
        ]);
    }

    /**
     * Delete a custom role.
     */
    public function destroyRole(int $id): JsonResponse
    {
        $role = Role::withCount('users')->findOrFail($id);

        if ($role->name === config('arx.roles.super_admin', 'super-admin')) {
            return response()->json([
                'message' => "The 'super-admin' role is immutable and strictly cannot be deleted.",
            ], 403);
        }

        if (in_array($role->name, self::CORE_ROLES, true)) {
            return response()->json([
                'message' => "System role '{$role->name}' is protected and cannot be deleted.",
            ], 422);
        }

        if ($role->users_count > 0) {
            return response()->json([
                'message' => "Cannot delete role '{$role->name}' because it is currently assigned to {$role->users_count} user(s). Reassign them first.",
            ], 422);
        }

        $roleName = $role->name;
        $roleDisplayName = $role->display_name ?? $role->name;
        $role->delete();

        $actor = request()->user()?->name ?? 'System';
        AuditLog::record(
            action: 'role_deleted',
            description: "{$actor} deleted custom role '{$roleName}' ({$roleDisplayName})",
            model: $role,
            user: request()->user()
        );

        return response()->json([
            'message' => "Role '{$role->name}' deleted successfully.",
        ]);
    }

    /**
     * Get all registered permissions grouped by module domain or category.
     */
    public function permissions(): JsonResponse
    {
        $permissions = Permission::orderBy('name')->get();

        // Dynamically filter out permissions belonging to disabled modules
        $disabledPermissions = Module::where('is_enabled', false)
            ->get()
            ->flatMap(fn ($m) => $m->manifest['permissions'] ?? [])
            ->all();

        if (! empty($disabledPermissions)) {
            $permissions = $permissions->reject(fn ($p) => in_array($p->name, $disabledPermissions, true));
        }

        // Map module permission prefixes to module names dynamically
        $enabledModules = Module::where('is_installed', true)->where('is_enabled', true)->get();
        $moduleCategoryLabels = [];
        foreach ($enabledModules as $mod) {
            $modPerms = $mod->manifest['permissions'] ?? [];
            foreach ($modPerms as $mp) {
                $pPrefix = explode('.', $mp)[0] ?? '';
                if ($pPrefix && ! isset($moduleCategoryLabels[$pPrefix])) {
                    $moduleCategoryLabels[$pPrefix] = $mod->manifest['menu']['label'] ?? $mod->name;
                }
            }
        }

        $grouped = [];
        foreach ($permissions as $perm) {
            $parts = explode('.', $perm->name);
            $rawPrefix = $parts[0] ?? 'general';

            $categoryKey = match ($rawPrefix) {
                'ai_agents', 'mcp' => 'ai_agents',
                default => $rawPrefix,
            };

            $categoryLabel = match ($categoryKey) {
                'dashboard' => 'Dashboard',
                'orders' => 'Orders',
                'users' => 'Users & Identity',
                'roles' => 'Roles & RBAC',
                'notifications' => 'Notify & Broadcasts',
                'modules' => 'Modules Manager',
                'themes' => 'Theme Engine',
                'backups' => 'Backups & Disaster Recovery',
                'updates' => 'System Updates & Licensing',
                'mail' => 'Mail Setup & SMTP',
                'api' => 'Application APIs',
                'login_history' => 'Login History & Sessions',
                'audit_logs' => 'Audit Trail',
                'ai_agents' => 'AI Agents & MCP Tools',
                default => $moduleCategoryLabels[$categoryKey] ?? Str::title(str_replace('_', ' ', $categoryKey)),
            };

            // Human readable action label & route slug
            $actionLabel = match ($perm->name) {
                'users.view' => 'View Users & Identities',
                'users.create' => 'Create User / AI Agent',
                'users.edit' => 'Edit User Details & Roles',
                'users.change_password' => 'Change User Password',
                'users.toggle_status' => 'Enable / Disable User',
                'users.delete' => 'Move User to Recycle Bin',
                'users.trash.view' => 'View Recycle Bin',
                'users.restore' => 'Restore Trashed User',
                'users.force_delete' => 'Permanently Delete User',
                'roles.view' => 'View Roles & Matrix',
                'roles.manage' => 'Manage Roles & Permissions',
                'notifications.view' => 'View Broadcast Notifications & History',
                'notifications.create' => 'Compose & Dispatch Broadcasts',
                'notifications.analytics' => 'View Broadcast Analytics & Metrics',
                'notifications.edit' => 'Edit Draft / Scheduled Broadcasts',
                'notifications.delete' => 'Delete Broadcasts from History',
                'notifications.resend' => 'Resend Existing Broadcast Notifications',
                'mail.view' => 'View Mail & SMTP Settings',
                'mail.manage' => 'Manage SMTP Server & Trigger Hooks',
                'mail.test' => 'Run Diagnostics & Send Test Emails',
                'mail.templates' => 'Manage Email Templates & Placeholders',
                'modules.view' => 'View Installed Modules',
                'modules.manage' => 'Manage & Configure Modules',
                'themes.view' => 'View Available Themes',
                'themes.manage' => 'Manage & Activate Themes',
                'themes.general.view' => 'View Theme General Settings & Branding',
                'themes.general.manage' => 'Manage General Branding, Logos & Wallpapers',
                'themes.quick_links.view' => 'View Top Bar & Login Quick Links',
                'themes.quick_links.manage' => 'Manage Top Bar & Login Quick Links',
                'themes.dashboard.view' => 'View Dashboard Overview Widgets Configuration',
                'themes.dashboard.manage' => 'Manage Dashboard Overview Widgets & Layout',
                'backups.view' => 'View Backups & Configurations',
                'backups.create' => 'Create Database & Storage Backups',
                'backups.download' => 'Download Backup Archives',
                'backups.restore' => 'Restore System from Backup Archive',
                'backups.delete' => 'Delete Backup Archives',
                'updates.check' => 'Check Updates',
                'updates.apply' => 'Download & Apply Updates',
                'updates.revoke' => 'Revoke Updates',
                'updates.license_info' => 'Check License Info',
                'audit_logs.view' => 'View Audit Trail Logs',
                'audit_logs.delete' => 'Delete Individual Audit Log',
                'audit_logs.clear' => 'Purge & Clear Audit Trail Logs',
                'audit_logs.export' => 'Export Audit Trail Archive',
                'ai_agents.view' => 'View AI Agents',
                'ai_agents.manage' => 'Manage AI Agent Identities',
                'mcp.execute' => 'Execute MCP Tools',
                default => Str::title(str_replace(['_', '.'], ' ', $perm->name)),
            };

            // Corresponding route/resource slug
            $routeSlug = match ($perm->name) {
                'users.view' => '/admin/users',
                'users.create' => '/admin/users/create',
                'users.edit' => '/admin/users/edit',
                'users.change_password' => '/admin/users/password',
                'users.toggle_status' => '/admin/users/toggle-status',
                'users.delete' => '/admin/users/delete',
                'users.trash.view' => '/admin/users/trash',
                'users.restore' => '/admin/users/restore',
                'users.force_delete' => '/admin/users/force-delete',
                'roles.view', 'roles.manage' => '/admin/roles',
                'notifications.view', 'notifications.create', 'notifications.analytics', 'notifications.edit', 'notifications.delete', 'notifications.resend' => '/admin/notify',
                'mail.view', 'mail.manage', 'mail.test', 'mail.templates' => '/admin/mail-setup',
                'api.view', 'api.create', 'api.edit', 'api.delete' => '/admin/api-keys',
                'login_history.view', 'login_history.clear', 'login_history.revoke' => '/admin/login-history',
                'modules.view', 'modules.manage' => '/admin/modules',
                'themes.view', 'themes.manage', 'themes.general.view', 'themes.general.manage', 'themes.quick_links.view', 'themes.quick_links.manage', 'themes.dashboard.view', 'themes.dashboard.manage' => '/admin/themes',
                'backups.view', 'backups.create', 'backups.download', 'backups.restore', 'backups.delete' => '/admin/backups',
                'updates.check', 'updates.apply', 'updates.revoke', 'updates.license_info' => '/admin/updates',
                'audit_logs.view', 'audit_logs.delete', 'audit_logs.clear', 'audit_logs.export' => '/admin/audit-logs',
                'ai_agents.view', 'ai_agents.manage', 'mcp.execute' => '/api/v1/mcp/execute',
                default => "/admin/{$categoryKey}",
            };

            if (! isset($grouped[$categoryKey])) {
                $grouped[$categoryKey] = [
                    'key' => $categoryKey,
                    'label' => $categoryLabel,
                    'permissions' => [],
                ];
            }

            $grouped[$categoryKey]['permissions'][] = [
                'id' => $perm->id,
                'name' => $perm->name,
                'action_label' => $actionLabel,
                'route_slug' => $routeSlug,
            ];
        }

        return response()->json([
            'groups' => array_values($grouped),
            'total_count' => $permissions->count(),
        ]);
    }
}
