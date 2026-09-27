<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\MailConfiguration;
use App\Core\Models\MailHookConfiguration;
use App\Core\Services\MailService;
use App\Core\Services\SecurityTokenService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

/**
 * Public controller handling 10-minute cryptographic action tokens:
 * Email verification, password resets, and forgot-password link dispatches.
 */
class AuthActionController extends Controller
{
    public function __construct(
        protected SecurityTokenService $tokenService,
        protected MailService $mailService
    ) {}

    /**
     * Public endpoint to check if mail features like Forgot Password are enabled.
     */
    public function mailStatus(): JsonResponse
    {
        $config = MailConfiguration::instance();
        $hooks = MailHookConfiguration::instance();

        return response()->json([
            'is_mail_enabled' => (bool) $config->is_enabled,
            'forgot_password_enabled' => (bool) ($config->is_enabled && $hooks->hook_forgot_password),
        ]);
    }

    /**
     * Check if a 10-minute action token is currently valid and unconsumed.
     */
    public function validateToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'type' => ['required', 'string', 'in:password_reset,email_verification'],
        ]);

        $tokenRecord = $this->tokenService->validateToken($validated['token'], $validated['type']);

        if (! $tokenRecord) {
            return response()->json([
                'valid' => false,
                'message' => 'The security link is invalid or has expired. Tokens are strictly valid for 10 minutes.',
            ], 422);
        }

        return response()->json([
            'valid' => true,
            'user' => [
                'name' => $tokenRecord->user->name,
                'email' => $tokenRecord->user->email,
            ],
            'expires_at' => $tokenRecord->expires_at,
        ]);
    }

    /**
     * Complete email verification / account activation via token.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $tokenRecord = $this->tokenService->validateToken($validated['token'], 'email_verification');

        if (! $tokenRecord) {
            return response()->json([
                'message' => 'This activation link is invalid, has expired (10 minutes), or has already been used.',
            ], 422);
        }

        $user = $tokenRecord->user;

        // Activate and verify user
        $user->email_verified_at = now();
        $user->is_active = true;
        $user->save();

        // Immediately revoke token so it cannot be reused
        $this->tokenService->consumeToken($tokenRecord);

        return response()->json([
            'message' => 'Your email address has been verified and your account is now activated.',
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Execute password reset with new password.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        $tokenRecord = $this->tokenService->validateToken($validated['token'], 'password_reset');

        if (! $tokenRecord) {
            return response()->json([
                'message' => 'This password reset link is invalid, has expired (10 minutes), or has already been used.',
            ], 422);
        }

        $user = $tokenRecord->user;

        // Update user password
        $user->password = Hash::make($validated['password']);
        $user->save();

        // Immediately consume token
        $this->tokenService->consumeToken($tokenRecord);

        return response()->json([
            'message' => 'Password reset successfully. You may now log in with your new credentials.',
        ]);
    }

    /**
     * Dispatch forgot-password 10-minute reset email.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user) {
            $this->mailService->sendPasswordResetMail($user);
        }

        return response()->json([
            'message' => 'If an active account matches that email address, a 10-minute secure reset link has been dispatched.',
        ]);
    }
}
