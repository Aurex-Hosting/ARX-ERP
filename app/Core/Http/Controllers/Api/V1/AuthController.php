<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\LoginHistory;
use App\Core\Services\AccountLockoutService;
use App\Core\Services\LoginHistoryService;
use App\Core\Services\NotificationService;
use App\Core\Services\TwoFactorAuthService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Controller handling authentication, personal profile details, private avatar/banner
 * media management, session control, and two-factor authentication (2FA).
 */
class AuthController extends Controller
{
    public function __construct(
        protected LoginHistoryService $loginHistoryService,
        protected TwoFactorAuthService $twoFactorAuthService,
        protected AccountLockoutService $accountLockoutService,
        protected NotificationService $notificationService
    ) {}

    /**
     * User registration (creates standard user).
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $nameParts = explode(' ', trim($validated['name']), 2);

        $user = User::create([
            'name' => $validated['name'],
            'first_name' => $nameParts[0] ?? '',
            'last_name' => $nameParts[1] ?? '',
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'user_type' => 'user',
        ]);

        // Assign default user role
        $userRole = Role::where('name', config('arx.roles.user', 'user'))->first();
        if ($userRole) {
            $user->assignRole($userRole);
        }

        $newAccessToken = $user->createToken('default');
        $token = $newAccessToken->plainTextToken;

        $this->loginHistoryService->recordLogin(
            request: $request,
            email: $validated['email'],
            success: true,
            user: $user,
            token: $newAccessToken->accessToken
        );

        return response()->json([
            'message' => 'Registration successful.',
            'user' => $this->formatUserResponse($user),
            'token' => $token,
        ], 201);
    }

    /**
     * User login (returns Sanctum token or 2FA challenge).
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            $this->loginHistoryService->recordLogin(
                request: $request,
                email: $validated['email'],
                success: false,
                user: null,
                failureReason: 'Invalid email or password.'
            );

            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        // Check Account Lockout Policy
        $lockoutStatus = $this->accountLockoutService->checkLockout($user);
        if ($lockoutStatus['is_locked']) {
            $this->loginHistoryService->recordLogin(
                request: $request,
                email: $validated['email'],
                success: false,
                user: $user,
                failureReason: $lockoutStatus['reason']
            );

            return response()->json([
                'message' => $lockoutStatus['reason'],
                'is_locked' => true,
                'retry_after_seconds' => $lockoutStatus['retry_after_seconds'],
            ], 423);
        }

        if (! Hash::check($validated['password'], $user->password)) {
            $strikeResult = $this->accountLockoutService->handleFailedPasswordAttempt($user);

            $this->loginHistoryService->recordLogin(
                request: $request,
                email: $validated['email'],
                success: false,
                user: $user,
                failureReason: $strikeResult['message']
            );

            throw ValidationException::withMessages([
                'email' => [$strikeResult['message']],
            ]);
        }

        // Check if Two-Factor Authentication is enabled
        $has2fa = ! empty($user->two_factor_secret) && ! empty($user->two_factor_confirmed_at);
        if ($has2fa) {
            $twoFactorToken = Str::random(64);
            Cache::put("2fa_login_{$twoFactorToken}", [
                'user_id' => $user->id,
                'device_name' => $validated['device_name'] ?? 'web',
            ], now()->addMinutes(5));

            return response()->json([
                'two_factor_required' => true,
                'two_factor_token' => $twoFactorToken,
                'email' => $user->email,
                'message' => 'Two-Factor Authentication is required. Enter your 6-digit TOTP code or an 8-character backup recovery code.',
            ]);
        }

        // Password matches and 2FA not required: reset failed attempts
        $this->accountLockoutService->resetAttempts($user);

        $deviceName = $validated['device_name'] ?? 'web';
        $newAccessToken = $user->createToken($deviceName);
        $token = $newAccessToken->plainTextToken;

        $this->loginHistoryService->recordLogin(
            request: $request,
            email: $validated['email'],
            success: true,
            user: $user,
            token: $newAccessToken->accessToken
        );

        return response()->json([
            'message' => 'Login successful.',
            'user' => $this->formatUserResponse($user),
            'token' => $token,
        ]);
    }

    /**
     * Verify 2FA challenge (using TOTP authenticator code or single-use backup recovery code).
     */
    public function twoFactorVerify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'two_factor_token' => ['required', 'string'],
            'code' => ['nullable', 'string'],
            'backup_code' => ['nullable', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        $cached = Cache::get("2fa_login_{$validated['two_factor_token']}");
        if (! $cached || empty($cached['user_id'])) {
            return response()->json([
                'message' => 'The two-factor authentication challenge has expired. Please sign in again.',
            ], 422);
        }

        $user = User::find($cached['user_id']);
        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        // Check Lockout
        $lockoutStatus = $this->accountLockoutService->checkLockout($user);
        if ($lockoutStatus['is_locked']) {
            $this->loginHistoryService->recordLogin(
                request: $request,
                email: $user->email,
                success: false,
                user: $user,
                failureReason: $lockoutStatus['reason']
            );

            return response()->json([
                'message' => $lockoutStatus['reason'],
                'is_locked' => true,
                'retry_after_seconds' => $lockoutStatus['retry_after_seconds'],
            ], 423);
        }

        $verified = false;
        $authMethod = '2fa_totp';

        if (! empty($validated['code'])) {
            $verified = $this->twoFactorAuthService->verifyCode(
                secret: (string) $user->two_factor_secret,
                code: $validated['code']
            );
        } elseif (! empty($validated['backup_code'])) {
            $verified = $this->twoFactorAuthService->verifyAndConsumeRecoveryCode(
                user: $user,
                inputCode: $validated['backup_code']
            );
            $authMethod = '2fa_backup_code';
        }

        if (! $verified) {
            $strikeResult = $this->accountLockoutService->handleFailed2faAttempt($user);

            $failureReason = ! empty($validated['backup_code'])
                ? 'Invalid or already consumed 2FA backup recovery code.'
                : 'Invalid 2FA authentication code.';

            $this->loginHistoryService->recordLogin(
                request: $request,
                email: $user->email,
                success: false,
                user: $user,
                failureReason: "{$failureReason} {$strikeResult['message']}"
            );

            return response()->json([
                'message' => $strikeResult['message'],
                'is_locked' => $strikeResult['is_locked'],
            ], 422);
        }

        // Successfully verified 2FA
        $this->accountLockoutService->resetAttempts($user);
        Cache::forget("2fa_login_{$validated['two_factor_token']}");

        $deviceName = $validated['device_name'] ?? $cached['device_name'] ?? 'web';
        $newAccessToken = $user->createToken($deviceName);
        $token = $newAccessToken->plainTextToken;

        $this->loginHistoryService->recordLogin(
            request: $request,
            email: $user->email,
            success: true,
            user: $user,
            token: $newAccessToken->accessToken
        );

        return response()->json([
            'message' => 'Two-factor authentication verified successfully.',
            'user' => $this->formatUserResponse($user),
            'token' => $token,
            'auth_method' => $authMethod,
        ]);
    }

    /**
     * Provision or view 2FA Setup configuration (Secret and QR URI).
     */
    public function twoFactorSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        $isConfirmed = ! empty($user->two_factor_secret) && ! empty($user->two_factor_confirmed_at);

        if ($isConfirmed) {
            $status = $this->twoFactorAuthService->getRecoveryCodesStatus($user);

            return response()->json([
                'is_enabled' => true,
                'status' => $status,
            ]);
        }

        // Generate temporary secret key for scanning
        $secret = $this->twoFactorAuthService->generateSecretKey();
        $qrUri = $this->twoFactorAuthService->getQrCodeUri(
            email: $user->email,
            secret: $secret,
            issuer: config('app.name', 'ARX-ERP')
        );

        return response()->json([
            'is_enabled' => false,
            'secret' => $secret,
            'qr_uri' => $qrUri,
        ]);
    }

    /**
     * Confirm and activate 2FA with 6-digit TOTP verification code.
     */
    public function twoFactorConfirm(Request $request): JsonResponse
    {
        $rawCode = (string) $request->input('code');
        $rawSecret = (string) $request->input('secret');

        $cleanCode = preg_replace('/\s+|-/', '', trim($rawCode)) ?? '';
        $cleanSecret = strtoupper(preg_replace('/\s+/', '', trim($rawSecret)) ?? '');

        $request->merge([
            'code' => $cleanCode,
            'secret' => $cleanSecret,
        ]);

        $validated = $request->validate([
            'secret' => ['required', 'string', 'min:16'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        $valid = $this->twoFactorAuthService->verifyCode(
            secret: $validated['secret'],
            code: $validated['code'],
            discrepancy: 10
        );

        if (! $valid) {
            Log::warning('2FA Confirmation Failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'input_code' => $validated['code'],
                'secret' => $validated['secret'],
                'server_time' => now()->toIso8601String(),
                'server_time_slice' => (int) floor(time() / 30),
            ]);

            return response()->json([
                'message' => 'Invalid 6-digit authentication code. Please ensure your device clock is synchronized and enter the current code from Google Authenticator.',
            ], 422);
        }

        $recoveryCodes = $this->twoFactorAuthService->generateRecoveryCodes(8);

        $user->two_factor_secret = $validated['secret'];
        $user->two_factor_confirmed_at = now();
        $user->save();

        $this->twoFactorAuthService->storeRecoveryCodes($user, $recoveryCodes);

        $this->notificationService->sendSecurityAlert(
            user: $user,
            title: 'Two-Factor Authentication Enabled',
            body: 'TOTP two-factor authentication has been activated on your account. Keep your backup recovery codes safe.',
            metadata: ['action' => '2fa_enabled']
        );

        return response()->json([
            'message' => 'Two-Factor Authentication has been successfully enabled!',
            'recovery_codes' => $recoveryCodes,
            'status' => $this->twoFactorAuthService->getRecoveryCodesStatus($user),
        ]);
    }

    /**
     * Get real-time status of 2FA backup recovery codes.
     */
    public function twoFactorStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $this->twoFactorAuthService->getRecoveryCodesStatus($user);

        return response()->json([
            'status' => $status,
        ]);
    }

    /**
     * Regenerate 8 single-use recovery backup codes (Requires password + 2FA TOTP code).
     */
    public function twoFactorRegenerateRecoveryCodes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Current password verification failed.',
            ], 422);
        }

        if (empty($user->two_factor_secret) || empty($user->two_factor_confirmed_at)) {
            return response()->json([
                'message' => 'Two-Factor Authentication is not enabled on this account.',
            ], 422);
        }

        $valid = $this->twoFactorAuthService->verifyCode(
            secret: $user->two_factor_secret,
            code: $validated['code']
        );

        if (! $valid) {
            return response()->json([
                'message' => 'Invalid 6-digit authentication code.',
            ], 422);
        }

        $newRecoveryCodes = $this->twoFactorAuthService->generateRecoveryCodes(8);
        $this->twoFactorAuthService->storeRecoveryCodes($user, $newRecoveryCodes);

        $this->notificationService->sendSecurityAlert(
            user: $user,
            title: '2FA Recovery Codes Regenerated',
            body: 'A new set of 8 single-use backup recovery codes was generated for your account. Previous backup codes are now invalid.',
            metadata: ['action' => '2fa_recovery_regenerated']
        );

        return response()->json([
            'message' => 'New recovery backup codes generated successfully.',
            'recovery_codes' => $newRecoveryCodes,
            'status' => $this->twoFactorAuthService->getRecoveryCodesStatus($user),
        ]);
    }

    /**
     * Disable Two-Factor Authentication (Requires password + 2FA TOTP code OR backup code).
     */
    public function twoFactorDisable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['nullable', 'string'],
            'backup_code' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Current password verification failed.',
            ], 422);
        }

        if (empty($user->two_factor_secret) || empty($user->two_factor_confirmed_at)) {
            return response()->json([
                'message' => 'Two-Factor Authentication is not enabled on this account.',
            ], 422);
        }

        $verified = false;
        if (! empty($validated['code'])) {
            $verified = $this->twoFactorAuthService->verifyCode(
                secret: $user->two_factor_secret,
                code: $validated['code']
            );
        } elseif (! empty($validated['backup_code'])) {
            $verified = $this->twoFactorAuthService->verifyAndConsumeRecoveryCode(
                user: $user,
                inputCode: $validated['backup_code']
            );
        }

        if (! $verified) {
            return response()->json([
                'message' => 'Invalid 2FA authentication code or backup recovery code.',
            ], 422);
        }

        $user->two_factor_secret = null;
        $user->two_factor_confirmed_at = null;
        $user->two_factor_recovery_codes = null;
        $user->failed_2fa_attempts = 0;
        $user->save();

        $this->notificationService->sendSecurityAlert(
            user: $user,
            title: 'Two-Factor Authentication Disabled',
            body: 'Two-factor authentication was disabled for your account. If you did not perform this action, change your password immediately.',
            metadata: ['action' => '2fa_disabled']
        );

        return response()->json([
            'message' => 'Two-Factor Authentication has been disabled.',
        ]);
    }

    /**
     * Change authenticated user password (in security settings).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The provided current password does not match our records.',
                'errors' => ['current_password' => ['The provided current password does not match our records.']],
            ], 422);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        $this->notificationService->sendSecurityAlert(
            user: $user,
            title: 'Account Password Updated',
            body: 'Your account password was successfully updated. If this was not done by you, contact system administration immediately.',
            metadata: ['action' => 'password_updated']
        );

        return response()->json([
            'message' => 'Your password has been changed successfully.',
        ]);
    }

    /**
     * Authenticated basic user profile.
     */
    public function user(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->formatUserResponse($user),
        ]);
    }

    /**
     * Detailed personal profile for authenticated user.
     */
    public function profile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'profile' => [
                'id' => $user->id,
                'identifier' => $user->identifier,
                'name' => $user->name,
                'first_name' => $user->first_name ?: '',
                'last_name' => $user->last_name ?: '',
                'email' => $user->email,
                'user_type' => $user->user_type,
                'is_super_admin' => $user->isSuperAdmin(),
                'avatar_url' => $user->avatar_url ? (Storage::disk('public')->exists($user->avatar_url) ? Storage::disk('public')->url($user->avatar_url) : route('api.v1.auth.profile.avatar', ['identifier' => $user->identifier])).'?t='.strtotime((string) $user->updated_at) : null,
                'banner_url' => $user->banner_url ? (Storage::disk('public')->exists($user->banner_url) ? Storage::disk('public')->url($user->banner_url) : route('api.v1.auth.profile.banner', ['identifier' => $user->identifier])).'?t='.strtotime((string) $user->updated_at) : null,
                'has_avatar' => ! empty($user->avatar_url),
                'has_banner' => ! empty($user->banner_url),
                'phone_country_code_1' => $user->phone_country_code_1 ?: '+1',
                'phone_1' => $user->phone_1 ?: '',
                'phone_country_code_2' => $user->phone_country_code_2 ?: '+1',
                'phone_2' => $user->phone_2 ?: '',
                'country' => $user->country ?: '',
                'province_state' => $user->province_state ?: '',
                'city' => $user->city ?: '',
                'postal_code' => $user->postal_code ?: '',
                'address_line_1' => $user->address_line_1 ?: '',
                'address_line_2' => $user->address_line_2 ?: '',
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'created_at' => $user->created_at,
            ],
        ]);
    }

    /**
     * Update authenticated user personal details and address.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'phone_country_code_1' => ['required', 'string', 'max:10'],
            'phone_1' => ['required', 'string', 'max:30'],
            'phone_country_code_2' => ['required', 'string', 'max:10'],
            'phone_2' => ['required', 'string', 'max:30'],
            'country' => ['nullable', 'string', 'max:100'],
            'province_state' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:30'],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
        ]);

        $user->first_name = $validated['first_name'];
        $user->last_name = $validated['last_name'] ?? '';
        $user->phone_country_code_1 = $validated['phone_country_code_1'];
        $user->phone_1 = $validated['phone_1'];
        $user->phone_country_code_2 = $validated['phone_country_code_2'];
        $user->phone_2 = $validated['phone_2'];
        $user->country = $validated['country'] ?? null;
        $user->province_state = $validated['province_state'] ?? null;
        $user->city = $validated['city'] ?? null;
        $user->postal_code = $validated['postal_code'] ?? null;
        $user->address_line_1 = $validated['address_line_1'] ?? null;
        $user->address_line_2 = $validated['address_line_2'] ?? null;
        $user->save();

        return response()->json([
            'message' => 'Personal details updated successfully.',
            'profile' => $this->profile($request)->getData(true)['profile'],
            'user' => $this->formatUserResponse($user),
        ]);
    }

    /**
     * Upload and store avatar in public storage.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $resolved = $this->resolveMediaPayload($request, ['avatar', 'image', 'file', 'photo', 'media', 'data'], 5 * 1024 * 1024, 'avatar');

        if ($resolved instanceof JsonResponse) {
            return $resolved;
        }

        /** @var User $user */
        $user = $request->user();

        // Remove previous avatar file if exists
        if ($user->avatar_url) {
            if (Storage::disk('public')->exists($user->avatar_url)) {
                Storage::disk('public')->delete($user->avatar_url);
            }
            if (Storage::disk('local')->exists($user->avatar_url)) {
                Storage::disk('local')->delete($user->avatar_url);
            }
        }

        if ($resolved instanceof UploadedFile) {
            $path = Storage::disk('public')->putFile('avatars', $resolved);
        } else {
            $path = 'avatars/'.Str::random(40).'.'.$resolved['extension'];
            Storage::disk('public')->put($path, $resolved['content']);
        }

        $user->avatar_url = $path;
        $user->save();

        $publicUrl = Storage::disk('public')->url($path).'?t='.time();

        return response()->json([
            'message' => 'Profile picture updated successfully.',
            'avatar_url' => $publicUrl,
            'user' => $this->formatUserResponse($user),
        ]);
    }

    /**
     * Remove current avatar.
     */
    public function removeAvatar(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->avatar_url) {
            if (Storage::disk('public')->exists($user->avatar_url)) {
                Storage::disk('public')->delete($user->avatar_url);
            }
            if (Storage::disk('local')->exists($user->avatar_url)) {
                Storage::disk('local')->delete($user->avatar_url);
            }
        }

        $user->avatar_url = null;
        $user->save();

        return response()->json([
            'message' => 'Profile picture removed successfully.',
            'avatar_url' => null,
            'user' => $this->formatUserResponse($user),
        ]);
    }

    /**
     * Upload and store banner in public storage.
     */
    public function uploadBanner(Request $request): JsonResponse
    {
        $resolved = $this->resolveMediaPayload($request, ['banner', 'image', 'file', 'photo', 'media', 'data'], 10 * 1024 * 1024, 'banner');

        if ($resolved instanceof JsonResponse) {
            return $resolved;
        }

        /** @var User $user */
        $user = $request->user();

        // Remove previous banner file if exists
        if ($user->banner_url) {
            if (Storage::disk('public')->exists($user->banner_url)) {
                Storage::disk('public')->delete($user->banner_url);
            }
            if (Storage::disk('local')->exists($user->banner_url)) {
                Storage::disk('local')->delete($user->banner_url);
            }
        }

        if ($resolved instanceof UploadedFile) {
            $path = Storage::disk('public')->putFile('banners', $resolved);
        } else {
            $path = 'banners/'.Str::random(40).'.'.$resolved['extension'];
            Storage::disk('public')->put($path, $resolved['content']);
        }

        $user->banner_url = $path;
        $user->save();

        $publicUrl = Storage::disk('public')->url($path).'?t='.time();

        return response()->json([
            'message' => 'Profile banner updated successfully.',
            'banner_url' => $publicUrl,
            'user' => $this->formatUserResponse($user),
        ]);
    }

    /**
     * Remove current banner.
     */
    public function removeBanner(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->banner_url) {
            if (Storage::disk('public')->exists($user->banner_url)) {
                Storage::disk('public')->delete($user->banner_url);
            }
            if (Storage::disk('local')->exists($user->banner_url)) {
                Storage::disk('local')->delete($user->banner_url);
            }
        }

        $user->banner_url = null;
        $user->save();

        return response()->json([
            'message' => 'Profile banner removed successfully.',
            'banner_url' => null,
            'user' => $this->formatUserResponse($user),
        ]);
    }

    /**
     * Helper to resolve multipart UploadedFile or base64 image data payload.
     *
     * @param  array<int, string>  $keys
     * @return array{content: string, extension: string}|UploadedFile|JsonResponse
     */
    private function resolveMediaPayload(Request $request, array $keys, int $maxBytes, string $field): array|UploadedFile|JsonResponse
    {
        // 1. Check for standard multipart file upload
        foreach ($keys as $key) {
            if ($request->hasFile($key)) {
                $file = $request->file($key);
                if ($file && $file->isValid()) {
                    if ($file->getSize() > $maxBytes) {
                        $maxMb = round($maxBytes / (1024 * 1024));

                        return response()->json([
                            'message' => "The {$field} image must not exceed {$maxMb}MB.",
                            'errors' => [$field => ["The {$field} image must not exceed {$maxMb}MB."]],
                        ], 422);
                    }

                    return $file;
                }
            }
        }

        if (! empty($request->allFiles())) {
            $files = $request->allFiles();
            $file = reset($files);
            if ($file && $file->isValid()) {
                if ($file->getSize() > $maxBytes) {
                    $maxMb = round($maxBytes / (1024 * 1024));

                    return response()->json([
                        'message' => "The {$field} image must not exceed {$maxMb}MB.",
                        'errors' => [$field => ["The {$field} image must not exceed {$maxMb}MB."]],
                    ], 422);
                }

                return $file;
            }
        }

        // 2. Check for base64 / Data URL payload in request body
        foreach ($keys as $key) {
            $value = $request->input($key);
            if (is_string($value) && ! empty($value)) {
                $extension = 'png';
                if (preg_match('/^data:image\/(\w+);base64,/', $value, $matches)) {
                    $extension = strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
                    $value = substr($value, strpos($value, ',') + 1);
                }

                $decoded = base64_decode($value, true);
                if ($decoded !== false && strlen($decoded) > 0) {
                    if (strlen($decoded) > $maxBytes) {
                        $maxMb = round($maxBytes / (1024 * 1024));

                        return response()->json([
                            'message' => "The {$field} image must not exceed {$maxMb}MB.",
                            'errors' => [$field => ["The {$field} image must not exceed {$maxMb}MB."]],
                        ], 422);
                    }

                    return ['content' => $decoded, 'extension' => $extension];
                }
            }
        }

        return response()->json([
            'message' => "The {$field} image file is required.",
            'errors' => [$field => ["The {$field} image file is required."]],
        ], 422);
    }

    /**
     * Stream avatar securely through authenticated route or public identifier route.
     */
    public function streamAvatar(Request $request, ?string $identifier = null): BinaryFileResponse|JsonResponse
    {
        $user = null;
        if ($identifier) {
            $user = User::findByIdentifierOrId($identifier);
        }

        if (! $user) {
            $token = $request->bearerToken() ?? $request->query('token');
            if ($token) {
                $accessToken = PersonalAccessToken::findToken($token);
                if ($accessToken) {
                    $user = $accessToken->tokenable;
                }
            }
        }

        if (! $user) {
            $user = auth('sanctum')->user() ?? $request->user();
        }

        if (! $user || ! $user->avatar_url) {
            return response()->json(['message' => 'Avatar not found.'], 404);
        }

        if (Storage::disk('public')->exists($user->avatar_url)) {
            return response()->file(Storage::disk('public')->path($user->avatar_url), [
                'Cache-Control' => 'public, max-age=3600',
            ]);
        }

        if (Storage::disk('local')->exists($user->avatar_url)) {
            return response()->file(Storage::disk('local')->path($user->avatar_url), [
                'Cache-Control' => 'public, max-age=3600',
            ]);
        }

        return response()->json(['message' => 'Avatar not found.'], 404);
    }

    /**
     * Stream banner securely through authenticated route or public identifier route.
     */
    public function streamBanner(Request $request, ?string $identifier = null): BinaryFileResponse|JsonResponse
    {
        $user = null;
        if ($identifier) {
            $user = User::findByIdentifierOrId($identifier);
        }

        if (! $user) {
            $token = $request->bearerToken() ?? $request->query('token');
            if ($token) {
                $accessToken = PersonalAccessToken::findToken($token);
                if ($accessToken) {
                    $user = $accessToken->tokenable;
                }
            }
        }

        if (! $user) {
            $user = auth('sanctum')->user() ?? $request->user();
        }

        if (! $user || ! $user->banner_url) {
            return response()->json(['message' => 'Banner not found.'], 404);
        }

        if (Storage::disk('public')->exists($user->banner_url)) {
            return response()->file(Storage::disk('public')->path($user->banner_url), [
                'Cache-Control' => 'public, max-age=3600',
            ]);
        }

        if (Storage::disk('local')->exists($user->banner_url)) {
            return response()->file(Storage::disk('local')->path($user->banner_url), [
                'Cache-Control' => 'public, max-age=3600',
            ]);
        }

        return response()->json(['message' => 'Banner not found.'], 404);
    }

    /**
     * Create scoped API token.
     */
    public function createToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'abilities' => ['nullable', 'array'],
            'abilities.*' => ['string'],
        ]);

        $user = $request->user();
        $abilities = $validated['abilities'] ?? ['*'];

        $token = $user->createToken($validated['name'], $abilities)->plainTextToken;

        return response()->json([
            'message' => 'Token created successfully.',
            'name' => $validated['name'],
            'token' => $token,
            'abilities' => $abilities,
        ], 201);
    }

    /**
     * Logout / revoke current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token) {
            LoginHistory::where('personal_access_token_id', $token->id)
                ->update([
                    'is_revoked' => true,
                    'revoked_at' => now(),
                    'revoked_by' => $request->user()->id,
                ]);
            $token->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Helper to format consistent user auth payloads.
     */
    private function formatUserResponse(User $user): array
    {
        $avatarUrl = $user->avatar_url
            ? route('api.v1.auth.profile.avatar', ['identifier' => $user->identifier, 't' => strtotime((string) $user->updated_at)])
            : null;

        $bannerUrl = $user->banner_url
            ? route('api.v1.auth.profile.banner', ['identifier' => $user->identifier, 't' => strtotime((string) $user->updated_at)])
            : null;

        return [
            'id' => $user->id,
            'identifier' => $user->identifier,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'user_type' => $user->user_type,
            'is_super_admin' => $user->isSuperAdmin(),
            'avatar_url' => $avatarUrl,
            'banner_url' => $bannerUrl,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'timezone' => config('app.timezone', 'UTC'),
        ];
    }
}
