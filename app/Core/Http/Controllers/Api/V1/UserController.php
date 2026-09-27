<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Services\MailService;
use App\Core\Services\NotificationService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

/**
 * Controller providing comprehensive management of Human Users, Super-Admins,
 * AI Agent identities, public unique alphanumeric identifiers (e.g. A2C921),
 * Recycle Bin (30-day soft deletes), and granular actions.
 */
class UserController extends Controller
{
    public function __construct(
        protected ?NotificationService $notificationService = null,
        protected ?MailService $mailService = null
    ) {
        $this->notificationService = $notificationService ?? app(NotificationService::class);
        $this->mailService = $mailService ?? app(MailService::class);
    }

    /**
     * List, search, and filter active users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['roles:id,name', 'permissions:id,name'])->latest('id');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('identifier', 'like', "%{$search}%");
            });
        }

        if ($request->filled('user_type') && $request->input('user_type') !== 'all') {
            $query->where('user_type', $request->string('user_type'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== 'all') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('role') && $request->input('role') !== 'all') {
            $roleName = $request->string('role')->toString();
            $query->whereHas('roles', function ($q) use ($roleName): void {
                $q->where('name', $roleName);
            });
        }

        $perPage = min($request->integer('per_page', 20), 100);
        $users = $query->paginate($perPage);

        // Include count of items in the recycle bin for the frontend badge
        $trashCount = User::onlyTrashed()->count();

        $items = collect($users->items())->map(function (User $user): array {
            $now = now();
            $isLocked = $user->locked_until ? Carbon::parse($user->locked_until)->isFuture() : false;

            return array_merge($user->toArray(), [
                'has_2fa' => (bool) ($user->two_factor_secret && $user->two_factor_confirmed_at),
                'is_locked' => $isLocked,
                'locked_until' => $user->locked_until?->toIso8601String(),
                'locked_reason' => $user->locked_reason,
            ]);
        });

        return response()->json([
            'data' => $items,
            'current_page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
            'per_page' => $users->perPage(),
            'total' => $users->total(),
            'trash_count' => $trashCount,
        ]);
    }

    /**
     * List users currently in the Recycle Bin (soft deleted).
     */
    public function trash(Request $request): JsonResponse
    {
        $query = User::onlyTrashed()->with(['roles:id,name'])->latest('deleted_at');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('identifier', 'like', "%{$search}%");
            });
        }

        $perPage = min($request->integer('per_page', 20), 100);
        $paginated = $query->paginate($perPage);

        $now = now();
        $items = collect($paginated->items())->map(function (User $user) use ($now) {
            $deletedAt = $user->deleted_at ? Carbon::parse($user->deleted_at) : $now;
            $expiresAt = $deletedAt->copy()->addDays(30);
            $daysRemaining = max(0, (int) ceil($now->diffInHours($expiresAt, false) / 24));

            return [
                'id' => $user->id,
                'identifier' => $user->identifier,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'is_active' => $user->is_active,
                'roles' => $user->roles,
                'deleted_at' => $user->deleted_at,
                'expires_at' => $expiresAt->toISOString(),
                'days_remaining' => $daysRemaining,
            ];
        });

        return response()->json([
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
            'trash_count' => $paginated->total(),
        ]);
    }

    /**
     * Show a specific user by identifier or numeric ID.
     */
    public function show(string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $user->load(['roles:id,name', 'permissions:id,name']);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'identifier' => $user->identifier,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'is_active' => $user->is_active,
                'avatar_url' => $user->avatar_url,
                'roles' => $user->roles->pluck('name'),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
        ]);
    }

    /**
     * Create a new User or AI Agent identity with unique alphanumeric ID.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['nullable', 'string', 'max:20', 'unique:users,identifier'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::defaults()],
            'user_type' => ['required', 'string', Rule::in(['user', 'ai_agent'])],
            'is_active' => ['boolean'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
        ]);

        $user = User::create([
            'identifier' => ! empty($validated['identifier']) ? strtoupper($validated['identifier']) : User::generateUniqueIdentifier(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'user_type' => $validated['user_type'],
            'is_active' => $validated['is_active'] ?? true,
            'email_verified_at' => now(),
        ]);

        if (! empty($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        } else {
            // Default role assignment based on user_type
            $defaultRole = $user->user_type === 'ai_agent'
                ? config('arx.roles.ai_agent', 'ai-agent')
                : config('arx.roles.user', 'user');

            if (Role::where('name', $defaultRole)->exists()) {
                $user->assignRole($defaultRole);
            }
        }

        if ($user->user_type === 'user') {
            $this->mailService?->sendVerificationMail($user);
        }

        return response()->json([
            'message' => "User '{$user->name}' (ID: {$user->identifier}) created successfully.",
            'user' => $user->load('roles:id,name'),
        ], 201);
    }

    /**
     * Update user details and roles (identified by identifier or numeric ID).
     */
    public function update(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'user_type' => ['sometimes', 'required', 'string', Rule::in(['user', 'ai_agent'])],
            'is_active' => ['sometimes', 'boolean'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
        ]);

        // Safety safeguard: Cannot deactivate root super admin
        if (isset($validated['is_active']) && ! $validated['is_active']) {
            if ($user->id === $request->user()?->id) {
                return response()->json([
                    'message' => 'You cannot deactivate your own administrative account.',
                ], 422);
            }

            if ($user->email === 'admin@arx-erp.local') {
                return response()->json([
                    'message' => 'The root system administrator account cannot be deactivated.',
                ], 422);
            }
        }

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (isset($validated['user_type'])) {
            $user->user_type = $validated['user_type'];
        }
        if (isset($validated['is_active'])) {
            $user->is_active = (bool) $validated['is_active'];
        }

        $user->save();

        if (array_key_exists('roles', $validated)) {
            // Safeguard: Do not strip super-admin role from the root admin
            if ($user->email === 'admin@arx-erp.local' && ! in_array(config('arx.roles.super_admin', 'super-admin'), $validated['roles'] ?? [])) {
                $validated['roles'][] = config('arx.roles.super_admin', 'super-admin');
            }
            $user->syncRoles($validated['roles'] ?? []);
        }

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->load('roles:id,name'),
        ]);
    }

    /**
     * Change user password (identified by identifier or numeric ID).
     */
    public function changePassword(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->id === $request->user()?->id) {
            return response()->json([
                'message' => 'You cannot change your own password from the User Management directory. Please use Profile Settings.',
            ], 422);
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        $user->password = Hash::make($validated['password']);
        $user->save();

        $this->notificationService?->sendSecurityAlert(
            user: $user,
            title: 'Password Reset by Admin',
            body: 'An administrator has reset your account password. If you did not request this, please contact support.',
            metadata: ['action' => 'admin_password_reset']
        );

        return response()->json([
            'message' => "Password for '{$user->name}' (ID: {$user->identifier}) updated successfully.",
        ]);
    }

    /**
     * Toggle user active status (identified by identifier or numeric ID).
     */
    public function toggleStatus(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->id === $request->user()?->id) {
            return response()->json([
                'message' => 'You cannot disable or modify the active status of your own account.',
            ], 422);
        }

        if ($user->email === 'admin@arx-erp.local' && $user->is_active) {
            return response()->json([
                'message' => 'The root system administrator cannot be disabled.',
            ], 422);
        }

        $user->is_active = ! $user->is_active;

        if ($user->is_active) {
            $user->locked_until = null;
            $user->locked_reason = null;
            $user->failed_login_attempts = 0;
            $user->failed_2fa_attempts = 0;
            $user->lockout_level = 0;
        }

        $user->save();

        // Trigger account status change email if configured
        $this->mailService?->sendAccountStatusMail($user, (bool) $user->is_active);

        $statusLabel = $user->is_active ? 'enabled' : 'disabled';

        return response()->json([
            'message' => "User '{$user->name}' (ID: {$user->identifier}) is now {$statusLabel}.",
            'is_active' => $user->is_active,
            'user' => $user->load('roles:id,name'),
        ]);
    }

    /**
     * Dispatch a 10-minute secure Password Reset Link email to user.
     */
    public function sendResetLink(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $sent = $this->mailService?->sendPasswordResetMail($user);

        if (! $sent) {
            return response()->json([
                'message' => 'Mail service is currently disabled or SMTP server is not reachable.',
            ], 422);
        }

        return response()->json([
            'message' => "A 10-minute secure password reset link has been dispatched to {$user->email}.",
        ]);
    }

    /**
     * Resend an Account Activation / Verification Email to user.
     */
    public function resendActivation(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $sent = $this->mailService?->sendVerificationMail($user);

        if (! $sent) {
            return response()->json([
                'message' => 'Mail service is currently disabled or SMTP server is not reachable.',
            ], 422);
        }

        return response()->json([
            'message' => "An activation verification link (10-min expiry) has been sent to {$user->email}.",
        ]);
    }

    /**
     * Disable 2FA for a user (Admin action).
     */
    public function disable2fa(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $user->two_factor_secret = null;
        $user->two_factor_confirmed_at = null;
        $user->two_factor_recovery_codes = null;
        $user->failed_2fa_attempts = 0;
        $user->save();

        $this->notificationService?->sendSecurityAlert(
            user: $user,
            title: 'Two-Factor Authentication Disabled by Admin',
            body: 'An administrator has disabled Two-Factor Authentication for your account.',
            metadata: ['action' => 'admin_2fa_disabled']
        );

        return response()->json([
            'message' => "Two-Factor Authentication for '{$user->name}' (ID: {$user->identifier}) has been disabled.",
            'user' => $user->load('roles:id,name'),
        ]);
    }

    /**
     * Move user to Recycle Bin (identified by identifier or numeric ID).
     */
    public function destroy(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->id === $request->user()?->id) {
            return response()->json([
                'message' => 'You cannot delete your own logged-in account.',
            ], 422);
        }

        if ($user->email === 'admin@arx-erp.local') {
            return response()->json([
                'message' => 'The root system administrator cannot be deleted.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => "User '{$user->name}' (ID: {$user->identifier}) moved to Recycle Bin. It will be permanently removed in 30 days.",
        ]);
    }

    /**
     * Restore a soft-deleted user from the Recycle Bin.
     */
    public function restore(string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id, withTrashed: true);

        if (! $user || ! $user->trashed()) {
            return response()->json(['message' => 'Trashed user not found.'], 404);
        }

        $user->restore();

        return response()->json([
            'message' => "User '{$user->name}' (ID: {$user->identifier}) restored successfully from Recycle Bin.",
            'user' => $user->load('roles:id,name'),
        ]);
    }

    /**
     * Permanently delete a user from the database.
     */
    public function forceDelete(Request $request, string|int $id): JsonResponse
    {
        $user = User::findByIdentifierOrId($id, withTrashed: true);

        if (! $user || ! $user->trashed()) {
            return response()->json(['message' => 'Trashed user not found.'], 404);
        }

        if ($user->id === $request->user()?->id) {
            return response()->json([
                'message' => 'You cannot permanently delete your own logged-in account.',
            ], 422);
        }

        if ($user->email === 'admin@arx-erp.local') {
            return response()->json([
                'message' => 'The root system administrator cannot be permanently deleted.',
            ], 422);
        }

        $userName = $user->name;
        $userIdentifier = $user->identifier;
        $user->tokens()->delete();
        $user->forceDelete();

        return response()->json([
            'message' => "User '{$userName}' (ID: {$userIdentifier}) permanently deleted from database.",
        ]);
    }
}
