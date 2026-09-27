<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Service managing RFC 6238 Time-Based One-Time Passwords (TOTP),
 * QR provisioning URIs, and single-use 2FA recovery backup codes.
 */
class TwoFactorAuthService
{
    /**
     * Standard Base32 alphabet according to RFC 4648.
     */
    protected const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a cryptographically secure random Base32 secret key (16 characters is standard for Google Authenticator).
     */
    public function generateSecretKey(int $length = 16): string
    {
        $secret = '';
        $alphabetLength = strlen(self::BASE32_ALPHABET);

        for ($i = 0; $i < $length; $i++) {
            $secret .= self::BASE32_ALPHABET[random_int(0, $alphabetLength - 1)];
        }

        return $secret;
    }

    /**
     * Generate standard OTPAuth provisioning URI for authenticator applications (Google Authenticator, Microsoft Authenticator, 1Password, Authy).
     */
    public function getQrCodeUri(string $email, string $secret, ?string $issuer = null): string
    {
        $issuer = $issuer ?: config('app.name', 'ARX ERP');
        $cleanIssuer = str_replace(':', '', $issuer);

        return "otpauth://totp/{$cleanIssuer}:{$email}?secret={$secret}&issuer={$cleanIssuer}";
    }

    /**
     * Verify a 6-digit TOTP code against the given secret key.
     *
     * @param  int  $discrepancy  Time drift allowance in 30-second steps (default 10 = +/- 5 minutes tolerance)
     */
    public function verifyCode(string $secret, string $code, int $discrepancy = 10): bool
    {
        // Strip any spaces, hyphens, or formatting
        $code = preg_replace('/\s+|-/', '', trim($code)) ?? '';
        if (strlen($code) !== 6 || ! ctype_digit($code)) {
            return false;
        }

        // Clean secret key (uppercase, remove spaces)
        $secret = strtoupper(preg_replace('/\s+/', '', trim($secret)) ?? '');
        if (empty($secret)) {
            return false;
        }

        $currentTimeSlice = (int) floor(time() / 30);

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculatedCode = $this->calculateCode($secret, $currentTimeSlice + $i);
            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate 6-digit TOTP code for a specific 30-second time slice.
     */
    public function calculateCode(string $secret, int $timeSlice): string
    {
        $secretKey = $this->base32Decode($secret);
        $time = pack('N*', 0).pack('N*', $timeSlice);

        $hmac = hash_hmac('sha1', $time, $secretKey, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;

        $hashPart = substr($hmac, $offset, 4);
        $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;

        $modulo = $value % 1000000;

        return str_pad((string) $modulo, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate a set of 8 single-use formatted backup recovery codes (e.g. "A8B2-9F1C").
     *
     * @return array<int, string>
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];

        for ($i = 0; $i < $count; $i++) {
            $part1 = strtoupper(Str::random(4));
            $part2 = strtoupper(Str::random(4));
            $codes[] = "{$part1}-{$part2}";
        }

        return $codes;
    }

    /**
     * Store freshly generated recovery codes on the user model.
     *
     * @param  array<int, string>  $plainCodes
     */
    public function storeRecoveryCodes(User $user, array $plainCodes): void
    {
        $formatted = array_map(function (string $code): array {
            return [
                'code' => $this->normalizeCode($code),
                'display' => $code,
                'used' => false,
                'used_at' => null,
            ];
        }, $plainCodes);

        $user->two_factor_recovery_codes = json_encode($formatted);
        $user->save();
    }

    /**
     * Verify and consume a single-use backup recovery code.
     */
    public function verifyAndConsumeRecoveryCode(User $user, string $inputCode): bool
    {
        if (empty($user->two_factor_recovery_codes)) {
            return false;
        }

        $codes = json_decode((string) $user->two_factor_recovery_codes, true);
        if (! is_array($codes)) {
            return false;
        }

        $normalizedInput = $this->normalizeCode($inputCode);
        $matchedIndex = null;

        foreach ($codes as $index => $item) {
            if (! empty($item['code']) && ! ($item['used'] ?? false) && hash_equals($item['code'], $normalizedInput)) {
                $matchedIndex = $index;
                break;
            }
        }

        if ($matchedIndex === null) {
            return false;
        }

        // Mark as consumed
        $codes[$matchedIndex]['used'] = true;
        $codes[$matchedIndex]['used_at'] = now()->toIso8601String();

        $user->two_factor_recovery_codes = json_encode($codes);
        $user->save();

        return true;
    }

    /**
     * Get real-time status of recovery codes for a user.
     *
     * @return array{is_enabled: bool, total: int, used: int, remaining: int}
     */
    public function getRecoveryCodesStatus(User $user): array
    {
        $isEnabled = ! empty($user->two_factor_secret) && ! empty($user->two_factor_confirmed_at);

        if (! $isEnabled || empty($user->two_factor_recovery_codes)) {
            return [
                'is_enabled' => $isEnabled,
                'total' => 8,
                'used' => 0,
                'remaining' => 8,
            ];
        }

        $codes = json_decode((string) $user->two_factor_recovery_codes, true);
        if (! is_array($codes)) {
            return [
                'is_enabled' => $isEnabled,
                'total' => 8,
                'used' => 0,
                'remaining' => 8,
            ];
        }

        $total = count($codes);
        $used = count(array_filter($codes, fn (array $item): bool => ! empty($item['used'])));
        $remaining = max(0, $total - $used);

        return [
            'is_enabled' => $isEnabled,
            'total' => $total,
            'used' => $used,
            'remaining' => $remaining,
        ];
    }

    /**
     * Normalize recovery code by removing spaces/hyphens and converting to uppercase.
     */
    public function normalizeCode(string $code): string
    {
        return strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $code) ?? '');
    }

    /**
     * Base32 decode binary string converter according to RFC 4648.
     */
    protected function base32Decode(string $b32): string
    {
        $b32 = strtoupper(trim($b32));
        $buffer = 0;
        $bufferSize = 0;
        $binary = '';

        for ($i = 0; $i < strlen($b32); $i++) {
            $char = $b32[$i];
            if ($char === '=') {
                break;
            }

            $position = strpos(self::BASE32_ALPHABET, $char);
            if ($position === false) {
                continue;
            }

            $buffer = ($buffer << 5) | $position;
            $bufferSize += 5;

            if ($bufferSize >= 8) {
                $bufferSize -= 8;
                $binary .= chr(($buffer >> $bufferSize) & 0xFF);
            }
        }

        return $binary;
    }
}
