<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Service enforcing progressive authentication lockout policies and security rules.
 */
class AccountLockoutService
{
    /**
     * Check if a user account is currently locked or permanently disabled.
     *
     * @return array{is_locked: bool, is_permanent: bool, reason: string|null, retry_after_seconds: int|null}
     */
    public function checkLockout(User $user): array
    {
        // 1. Permanently disabled by admin or level 2 lockout
        if (! $user->is_active) {
            return [
                'is_locked' => true,
                'is_permanent' => true,
                'reason' => $user->locked_reason ?: 'Account is disabled. Please contact administrator.',
                'retry_after_seconds' => null,
            ];
        }

        // 2. Temporary 10-minute lockout window check
        if ($user->locked_until) {
            $lockedUntil = Carbon::parse($user->locked_until);
            if ($lockedUntil->isFuture()) {
                $seconds = $lockedUntil->diffInSeconds(now());
                $minutes = (int) ceil($seconds / 60);

                return [
                    'is_locked' => true,
                    'is_permanent' => false,
                    'reason' => "Account is temporarily locked for 10 minutes due to 3 failed attempts. Please try again in {$minutes} minute(s).",
                    'retry_after_seconds' => (int) $seconds,
                ];
            }

            // Lockout period has elapsed; clear temporary locked_until timestamp
            $user->locked_until = null;
            $user->save();
        }

        return [
            'is_locked' => false,
            'is_permanent' => false,
            'reason' => null,
            'retry_after_seconds' => null,
        ];
    }

    /**
     * Determine if a user account is locked.
     */
    public function isLocked(User $user): bool
    {
        return $this->checkLockout($user)['is_locked'];
    }

    /**
     * Handle a failed password authentication attempt and increment strikes.
     *
     * @return array{is_locked: bool, is_permanent: bool, message: string}
     */
    public function handleFailedPasswordAttempt(User $user): array
    {
        $user->increment('failed_login_attempts');
        $user->refresh();

        if ($user->failed_login_attempts >= 3) {
            if ($user->lockout_level === 0) {
                // Strike 1: Temporary 10-minute lockout
                $user->update([
                    'lockout_level' => 1,
                    'locked_until' => now()->addMinutes(10),
                    'failed_login_attempts' => 0,
                    'locked_reason' => 'Account temporarily locked for 10 minutes due to 3 failed password attempts.',
                ]);

                return [
                    'is_locked' => true,
                    'is_permanent' => false,
                    'message' => 'Account temporarily locked for 10 minutes due to 3 failed password attempts.',
                ];
            }

            // Strike 2: Permanent disable after failing 3 times again
            $user->update([
                'lockout_level' => 2,
                'is_active' => false,
                'locked_until' => null,
                'failed_login_attempts' => 0,
                'locked_reason' => 'Account permanently disabled due to repeated failed login attempts.',
            ]);

            return [
                'is_locked' => true,
                'is_permanent' => true,
                'message' => 'Account has been permanently disabled due to repeated failed login attempts. Contact an administrator.',
            ];
        }

        $remaining = 3 - $user->failed_login_attempts;

        return [
            'is_locked' => false,
            'is_permanent' => false,
            'message' => "Invalid email or password. {$remaining} attempt(s) remaining before temporary lockout.",
        ];
    }

    /**
     * Handle a failed 2FA verification attempt and increment strikes.
     *
     * @return array{is_locked: bool, is_permanent: bool, message: string}
     */
    public function handleFailed2faAttempt(User $user): array
    {
        $user->increment('failed_2fa_attempts');
        $user->refresh();

        if ($user->failed_2fa_attempts >= 3) {
            if ($user->lockout_level === 0) {
                // Strike 1: Temporary 10-minute lockout
                $user->update([
                    'lockout_level' => 1,
                    'locked_until' => now()->addMinutes(10),
                    'failed_2fa_attempts' => 0,
                    'locked_reason' => 'Account temporarily locked for 10 minutes due to 3 failed 2FA attempts.',
                ]);

                return [
                    'is_locked' => true,
                    'is_permanent' => false,
                    'message' => 'Account temporarily locked for 10 minutes due to 3 failed 2FA attempts.',
                ];
            }

            // Strike 2: Permanent disable
            $user->update([
                'lockout_level' => 2,
                'is_active' => false,
                'locked_until' => null,
                'failed_2fa_attempts' => 0,
                'locked_reason' => 'Account permanently disabled due to repeated failed 2FA attempts.',
            ]);

            return [
                'is_locked' => true,
                'is_permanent' => true,
                'message' => 'Account has been permanently disabled due to repeated failed 2FA attempts.',
            ];
        }

        $remaining = 3 - $user->failed_2fa_attempts;

        return [
            'is_locked' => false,
            'is_permanent' => false,
            'message' => "Invalid 2FA authentication code. {$remaining} attempt(s) remaining before temporary lockout.",
        ];
    }

    /**
     * Reset all failed attempt counters upon fully successful authentication.
     */
    public function resetAttempts(User $user): void
    {
        $user->update([
            'failed_login_attempts' => 0,
            'failed_2fa_attempts' => 0,
            'lockout_level' => 0,
            'locked_until' => null,
            'locked_reason' => null,
        ]);
    }

    /**
     * Unlock and re-enable user account manually (Admin action).
     * Bypasses any remaining 10-minute countdown.
     */
    public function manualAdminUnlock(User $user): void
    {
        $user->update([
            'is_active' => true,
            'failed_login_attempts' => 0,
            'failed_2fa_attempts' => 0,
            'lockout_level' => 0,
            'locked_until' => null,
            'locked_reason' => null,
        ]);
    }
}
