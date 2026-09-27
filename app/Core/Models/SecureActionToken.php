<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Ephemeral One-Time Cryptographic Action Tokens (10-minute expiry).
 *
 * @property int $id
 * @property int $user_id
 * @property string $token_hash
 * @property string $token_type
 * @property array<string, mixed>|null $payload
 * @property Carbon $expires_at
 * @property Carbon|null $used_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
class SecureActionToken extends Model
{
    use HasFactory;

    protected $table = 'secure_action_tokens';

    protected $fillable = [
        'user_id',
        'token_hash',
        'token_type',
        'payload',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the token is still valid (not used and not expired).
     */
    public function isValid(): bool
    {
        return is_null($this->used_at) && $this->expires_at->isFuture();
    }
}
