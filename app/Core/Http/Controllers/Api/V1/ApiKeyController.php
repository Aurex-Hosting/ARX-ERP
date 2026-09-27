<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\ApiKey;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

/**
 * Controller providing comprehensive management of Application API Keys,
 * permission scopes, rate limits, expiry dates, and IP whitelist/blacklist access rules.
 */
class ApiKeyController extends Controller
{
    /**
     * List, search, and filter Application API Keys.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ApiKey::with('user:id,name,email')->latest('id');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('key_id', 'like', "%{$search}%")
                    ->orWhere('secret_preview', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $status = $request->string('status')->toString();
            if ($status === 'active') {
                $query->where('is_active', true)
                    ->where(function ($q): void {
                        $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                    });
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            } elseif ($status === 'expired') {
                $query->whereNotNull('expires_at')->where('expires_at', '<=', now());
            }
        }

        $perPage = min($request->integer('per_page', 20), 100);
        $apiKeys = $query->paginate($perPage);

        // Calculate summary statistics
        $totalKeys = ApiKey::count();
        $activeKeys = ApiKey::where('is_active', true)
            ->where(function ($q): void {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })->count();
        $expiredKeys = ApiKey::whereNotNull('expires_at')->where('expires_at', '<=', now())->count();
        $totalRequests = (int) ApiKey::sum('total_requests');

        $transformed = $apiKeys->getCollection()->map(fn (ApiKey $key) => $this->formatApiKey($key));
        $apiKeys->setCollection($transformed);

        return response()->json([
            'api_keys' => $apiKeys,
            'stats' => [
                'total_keys' => $totalKeys,
                'active_keys' => $activeKeys,
                'expired_keys' => $expiredKeys,
                'total_requests' => $totalRequests,
            ],
        ]);
    }

    /**
     * Store a newly created Application API Key.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
            'allowed_endpoints' => ['nullable', 'array'],
            'allowed_endpoints.*' => ['string'],
            'rate_limit' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'ip_restriction_type' => ['nullable', 'string', Rule::in(['none', 'whitelist', 'blacklist'])],
            'ip_addresses' => ['nullable', 'array'],
            'ip_addresses.*' => ['string'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $credentials = ApiKey::generateCredentials();

        $apiKey = ApiKey::create([
            'user_id' => $request->user()?->id,
            'name' => $validated['name'],
            'key_id' => $credentials['key_id'],
            'key_hash' => $credentials['key_hash'],
            'secret_preview' => $credentials['secret_preview'],
            'permissions' => $validated['permissions'] ?? ['*'],
            'allowed_endpoints' => $validated['allowed_endpoints'] ?? null,
            'rate_limit' => $validated['rate_limit'] ?? 60,
            'ip_restriction_type' => $validated['ip_restriction_type'] ?? 'none',
            'ip_addresses' => ! empty($validated['ip_addresses']) ? array_values(array_filter($validated['ip_addresses'])) : null,
            'expires_at' => ! empty($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => "Application API Key '{$apiKey->name}' created successfully.",
            'api_key' => $this->formatApiKey($apiKey),
            'plain_secret' => $credentials['secret'],
        ], 201);
    }

    /**
     * Display the specified Application API Key.
     */
    public function show(int $id): JsonResponse
    {
        $apiKey = ApiKey::with('user:id,name,email')->findOrFail($id);

        return response()->json([
            'api_key' => $this->formatApiKey($apiKey),
        ]);
    }

    /**
     * Update the specified Application API Key.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $apiKey = ApiKey::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
            'allowed_endpoints' => ['nullable', 'array'],
            'allowed_endpoints.*' => ['string'],
            'rate_limit' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'ip_restriction_type' => ['nullable', 'string', Rule::in(['none', 'whitelist', 'blacklist'])],
            'ip_addresses' => ['nullable', 'array'],
            'ip_addresses.*' => ['string'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $apiKey->update([
            'name' => $validated['name'],
            'permissions' => $validated['permissions'] ?? $apiKey->permissions,
            'allowed_endpoints' => array_key_exists('allowed_endpoints', $validated) ? $validated['allowed_endpoints'] : $apiKey->allowed_endpoints,
            'rate_limit' => $validated['rate_limit'] ?? $apiKey->rate_limit,
            'ip_restriction_type' => $validated['ip_restriction_type'] ?? $apiKey->ip_restriction_type,
            'ip_addresses' => array_key_exists('ip_addresses', $validated) ? (! empty($validated['ip_addresses']) ? array_values(array_filter($validated['ip_addresses'])) : null) : $apiKey->ip_addresses,
            'expires_at' => array_key_exists('expires_at', $validated) ? (! empty($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null) : $apiKey->expires_at,
            'is_active' => $validated['is_active'] ?? $apiKey->is_active,
        ]);

        return response()->json([
            'message' => "Application API Key '{$apiKey->name}' updated successfully.",
            'api_key' => $this->formatApiKey($apiKey),
        ]);
    }

    /**
     * Toggle active/suspended status of an API Key.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $apiKey = ApiKey::findOrFail($id);
        $apiKey->is_active = ! $apiKey->is_active;
        $apiKey->save();

        $statusText = $apiKey->is_active ? 'activated' : 'suspended';

        return response()->json([
            'message' => "Application API Key '{$apiKey->name}' is now {$statusText}.",
            'api_key' => $this->formatApiKey($apiKey),
        ]);
    }

    /**
     * Regenerate secret key credentials for an API Key.
     */
    public function regenerate(int $id): JsonResponse
    {
        $apiKey = ApiKey::findOrFail($id);
        $credentials = ApiKey::generateCredentials();

        $apiKey->update([
            'key_hash' => $credentials['key_hash'],
            'secret_preview' => $credentials['secret_preview'],
        ]);

        return response()->json([
            'message' => "Application API Key '{$apiKey->name}' secret regenerated successfully.",
            'api_key' => $this->formatApiKey($apiKey),
            'plain_secret' => $credentials['secret'],
        ]);
    }

    /**
     * Delete an Application API Key.
     */
    public function destroy(int $id): JsonResponse
    {
        $apiKey = ApiKey::findOrFail($id);
        $name = $apiKey->name;
        $apiKey->delete();

        return response()->json([
            'message' => "Application API Key '{$name}' deleted successfully.",
        ]);
    }

    /**
     * Get grouped system permissions and endpoint templates for creation UI.
     */
    public function meta(): JsonResponse
    {
        $allPermissions = Permission::orderBy('name')->pluck('name');

        $groups = [
            'Users & Identities' => [
                'users.view' => 'View Users & Profiles',
                'users.create' => 'Create New Users',
                'users.edit' => 'Edit User Information',
                'users.change_password' => 'Update User Password',
                'users.toggle_status' => 'Activate/Deactivate User',
                'users.delete' => 'Delete Users',
                'users.trash.view' => 'View Trashed Users',
                'users.restore' => 'Restore Trashed Users',
                'users.force_delete' => 'Permanently Delete Users',
            ],
            'Roles & Permissions' => [
                'roles.view' => 'View Roles & Permission Matrix',
                'roles.manage' => 'Create, Edit & Delete Roles',
            ],
            'Application APIs' => [
                'api.view' => 'View Application API Keys',
                'api.create' => 'Create Application API Keys',
                'api.edit' => 'Edit Application API Keys',
                'api.delete' => 'Revoke & Delete API Keys',
            ],
            'Modules & Extensions' => [
                'modules.view' => 'View Installed Modules',
                'modules.manage' => 'Install, Enable, Disable Modules',
            ],
            'Themes & Customization' => [
                'themes.view' => 'View Installed Themes',
                'themes.manage' => 'Activate & Configure Themes',
                'themes.general.view' => 'View Theme General Settings & Branding',
                'themes.general.manage' => 'Modify General Branding, Logos & Wallpapers',
                'themes.quick_links.view' => 'View Top Bar & Login Quick Links',
                'themes.quick_links.manage' => 'Manage & Configure Quick Links',
            ],
            'Backups & Disaster Recovery' => [
                'backups.view' => 'View Backups & Configurations',
                'backups.create' => 'Create Database & Storage Backups',
                'backups.download' => 'Download Backup Archives',
                'backups.restore' => 'Restore System from Backup Archive',
                'backups.delete' => 'Delete Backup Archives',
            ],
            'Settings & Configuration' => [
                'settings.view' => 'Read System & Group Settings',
                'settings.manage' => 'Modify System Configuration',
            ],
            'Audit Trail & Logging' => [
                'audit_logs.view' => 'View System Audit Trail Logs',
            ],
            'AI Agents & MCP' => [
                'ai_agents.view' => 'View AI Agent Identities',
                'ai_agents.manage' => 'Manage AI Agent Configurations',
                'mcp.execute' => 'Invoke MCP Tools & AI Operations',
            ],
        ];

        $endpointPresets = [
            '/api/v1/auth/user' => 'Get Current Authenticated User',
            '/api/v1/navigation' => 'Get Dynamic Navigation Tree',
            '/api/v1/settings/*' => 'Read Settings Endpoints',
            '/api/v1/mcp/*' => 'Access MCP Tools & Resources',
            '/api/v1/admin/users*' => 'Admin Users API',
            '/api/v1/admin/roles*' => 'Admin Roles API',
            '/api/v1/admin/modules*' => 'Admin Modules API',
            '/api/v1/admin/themes*' => 'Admin Themes API',
            '/api/v1/admin/backups*' => 'Admin Backups & Disaster Recovery API',
            '/api/v1/admin/audit-logs*' => 'Admin Audit Logs API',
        ];

        return response()->json([
            'permission_groups' => $groups,
            'all_permissions' => $allPermissions,
            'endpoint_presets' => $endpointPresets,
        ]);
    }

    /**
     * Format API key record for JSON presentation.
     *
     * @return array<string, mixed>
     */
    protected function formatApiKey(ApiKey $key): array
    {
        $isExpired = $key->isExpired();

        $status = 'active';
        if (! $key->is_active) {
            $status = 'inactive';
        } elseif ($isExpired) {
            $status = 'expired';
        }

        return [
            'id' => $key->id,
            'name' => $key->name,
            'key_id' => $key->key_id,
            'secret_preview' => $key->secret_preview,
            'permissions' => $key->permissions ?? [],
            'allowed_endpoints' => $key->allowed_endpoints ?? [],
            'rate_limit' => $key->rate_limit,
            'ip_restriction_type' => $key->ip_restriction_type,
            'ip_addresses' => $key->ip_addresses ?? [],
            'expires_at' => $key->expires_at?->toISOString(),
            'expires_at_formatted' => $key->expires_at ? $key->expires_at->format('M d, Y') : 'Never',
            'is_expired' => $isExpired,
            'last_used_at' => $key->last_used_at?->toISOString(),
            'last_used_at_formatted' => $key->last_used_at ? $key->last_used_at->diffForHumans() : 'Never used',
            'last_used_ip' => $key->last_used_ip,
            'total_requests' => $key->total_requests,
            'is_active' => $key->is_active,
            'status' => $status,
            'user' => $key->user ? [
                'id' => $key->user->id,
                'name' => $key->user->name,
                'email' => $key->user->email,
            ] : null,
            'created_at' => $key->created_at?->toISOString(),
            'created_at_formatted' => $key->created_at ? $key->created_at->format('M d, Y') : null,
        ];
    }
}
