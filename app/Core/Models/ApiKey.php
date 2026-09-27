<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Model representing an Application API Key with granular scopes, rate limits, expiry, and IP rules.
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $name
 * @property string $key_id
 * @property string $key_hash
 * @property string $secret_preview
 * @property array<string>|null $permissions
 * @property array<string>|null $allowed_endpoints
 * @property int $rate_limit
 * @property string $ip_restriction_type
 * @property array<string>|null $ip_addresses
 * @property Carbon|null $expires_at
 * @property Carbon|null $last_used_at
 * @property string|null $last_used_ip
 * @property int $total_requests
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class ApiKey extends Model
{
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'key_id',
        'key_hash',
        'secret_preview',
        'permissions',
        'allowed_endpoints',
        'rate_limit',
        'ip_restriction_type',
        'ip_addresses',
        'expires_at',
        'last_used_at',
        'last_used_ip',
        'total_requests',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'allowed_endpoints' => 'array',
            'ip_addresses' => 'array',
            'rate_limit' => 'integer',
            'total_requests' => 'integer',
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * User who owns/created the API key.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the API key has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Check if a given client IP is authorized under current rules.
     */
    public function isIpAllowed(string $ip): bool
    {
        if ($this->ip_restriction_type === 'none' || empty($this->ip_addresses)) {
            return true;
        }

        $list = array_map('trim', $this->ip_addresses);

        if ($this->ip_restriction_type === 'whitelist') {
            return in_array($ip, $list, true);
        }

        if ($this->ip_restriction_type === 'blacklist') {
            return ! in_array($ip, $list, true);
        }

        return true;
    }

    /**
     * Check if this API Key has permission to execute an action.
     */
    public function hasPermission(string $permission): bool
    {
        if (empty($this->permissions)) {
            return false;
        }

        if (in_array('*', $this->permissions, true)) {
            return true;
        }

        return in_array($permission, $this->permissions, true);
    }

    /**
     * Generate a new API Key credential pair.
     *
     * @return array{key_id: string, secret: string, key_hash: string, secret_preview: string}
     */
    public static function generateCredentials(): array
    {
        $keyId = 'arx_key_'.Str::random(16);
        $randomSecret = Str::random(40);
        $plainSecret = 'arx_live_'.$randomSecret;
        $keyHash = hash('sha256', $plainSecret);
        $secretPreview = 'arx_live_•••••••'.substr($plainSecret, -6);

        return [
            'key_id' => $keyId,
            'secret' => $plainSecret,
            'key_hash' => $keyHash,
            'secret_preview' => $secretPreview,
        ];
    }
}
