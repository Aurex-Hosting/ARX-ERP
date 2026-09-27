<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Model representing authentication login activities, device fingerprints, and active sessions.
 *
 * @property int $id
 * @property int|null $user_id
 * @property int|null $personal_access_token_id
 * @property string $email
 * @property string $status
 * @property string|null $failure_reason
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property string|null $device_type
 * @property string|null $device_fingerprint
 * @property string|null $browser
 * @property string|null $browser_version
 * @property string|null $platform
 * @property string|null $location
 * @property bool $is_revoked
 * @property Carbon|null $revoked_at
 * @property int|null $revoked_by
 * @property Carbon|null $last_active_at
 * @property Carbon $login_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $user
 * @property-read User|null $revokedByUser
 * @property-read PersonalAccessToken|null $token
 */
class LoginHistory extends Model
{
    use HasFactory;

    protected $table = 'login_histories';

    protected $fillable = [
        'user_id',
        'personal_access_token_id',
        'email',
        'status',
        'failure_reason',
        'ip_address',
        'user_agent',
        'device_type',
        'device_fingerprint',
        'browser',
        'browser_version',
        'platform',
        'location',
        'is_revoked',
        'revoked_at',
        'revoked_by',
        'last_active_at',
        'login_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_revoked' => 'boolean',
            'revoked_at' => 'datetime',
            'last_active_at' => 'datetime',
            'login_at' => 'datetime',
        ];
    }

    /**
     * Associated user if found.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * User who revoked the session.
     *
     * @return BelongsTo<User, $this>
     */
    public function revokedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    /**
     * Associated Sanctum Personal Access Token.
     *
     * @return BelongsTo<PersonalAccessToken, $this>
     */
    public function token(): BelongsTo
    {
        return $this->belongsTo(PersonalAccessToken::class, 'personal_access_token_id');
    }

    /**
     * Scope query to only successful logins.
     *
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopeSuccessful(Builder $query): Builder
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope query to only failed logins.
     *
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope query to active sessions (successful, not revoked, token still exists).
     *
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopeActiveSessions(Builder $query): Builder
    {
        return $query->where('status', 'success')
            ->where('is_revoked', false)
            ->whereNotNull('personal_access_token_id')
            ->whereHas('token');
    }

    /**
     * Scope query to records older than given number of days.
     *
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopeOlderThanDays(Builder $query, int $days): Builder
    {
        return $query->where('login_at', '<', now()->subDays($days));
    }

    /**
     * Determine if session is actively valid.
     */
    public function isSessionActive(): bool
    {
        if ($this->status !== 'success' || $this->is_revoked || ! $this->personal_access_token_id) {
            return false;
        }

        return $this->token()->exists();
    }
}
