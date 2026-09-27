<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\SecureActionToken;
use App\Models\User;

/**
 * Service managing cryptographically secure, 10-minute expiring one-time action tokens.
 */
class SecurityTokenService
{
    /**
     * Generate a new 10-minute one-time action token for a user.
     *
     * @param  array<string, mixed>  $payload
     */
    public function generateToken(User $user, string $type, array $payload = [], int $expiresInMinutes = 10): string
    {
        // 1. Invalidate any existing unused tokens of the same type for this user to ensure single active token
        $this->revokeUserTokens($user, $type);

        // 2. Generate 64-char cryptographically unpredictable token
        $plaintextToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $plaintextToken);

        // 3. Store hashed token in database
        SecureActionToken::create([
            'user_id' => $user->id,
            'token_hash' => $tokenHash,
            'token_type' => $type,
            'payload' => $payload,
            'expires_at' => now()->addMinutes($expiresInMinutes),
            'used_at' => null,
        ]);

        return $plaintextToken;
    }

    /**
     * Validate a token string against the stored hash, expiration, and usage status.
     */
    public function validateToken(string $plaintextToken, string $type): ?SecureActionToken
    {
        if (empty($plaintextToken)) {
            return null;
        }

        $tokenHash = hash('sha256', $plaintextToken);

        $actionToken = SecureActionToken::with('user')
            ->where('token_hash', $tokenHash)
            ->where('token_type', $type)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        return $actionToken;
    }

    /**
     * Immediately consume/revoke an action token so it can never be used again.
     */
    public function consumeToken(SecureActionToken $token): void
    {
        $token->update([
            'used_at' => now(),
        ]);
    }

    /**
     * Revoke all active tokens of a specific type for a user.
     */
    public function revokeUserTokens(User $user, string $type): void
    {
        SecureActionToken::where('user_id', $user->id)
            ->where('token_type', $type)
            ->whereNull('used_at')
            ->update([
                'used_at' => now(),
            ]);
    }
}
