<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Traits\Auditable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $identifier
 * @property string $name
 * @property string|null $first_name
 * @property string|null $last_name
 * @property string $email
 * @property string $password
 * @property string $user_type
 * @property bool $is_active
 * @property string|null $avatar_url
 * @property string|null $banner_url
 * @property string|null $phone_country_code_1
 * @property string|null $phone_1
 * @property string|null $phone_country_code_2
 * @property string|null $phone_2
 * @property string|null $country
 * @property string|null $province_state
 * @property string|null $city
 * @property string|null $postal_code
 * @property string|null $address_line_1
 * @property string|null $address_line_2
 * @property string|null $two_factor_secret
 * @property Carbon|null $two_factor_confirmed_at
 * @property Carbon|null $email_verified_at
 * @property string|null $remember_token
 * @property Carbon|null $deleted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasApiTokens, HasFactory, HasRoles, Notifiable, Prunable, SoftDeletes;

    /**
     * The guard name for Spatie Roles and Permissions.
     */
    protected string $guard_name = 'web';

    /**
     * Bootstrap model events.
     */
    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (empty($user->identifier)) {
                $user->identifier = static::generateUniqueIdentifier();
            }
        });

        static::saving(function (User $user): void {
            if (! empty($user->first_name) || ! empty($user->last_name)) {
                $user->name = trim("{$user->first_name} {$user->last_name}");
            }
        });
    }

    /**
     * Generate a unique 6-character uppercase alphanumeric identifier (e.g. A2C921).
     */
    public static function generateUniqueIdentifier(): string
    {
        do {
            $identifier = strtoupper(Str::random(6));
        } while (static::withTrashed()->where('identifier', $identifier)->exists());

        return $identifier;
    }

    /**
     * Resolve a user by their public unique alphanumeric identifier or numeric ID.
     */
    public static function findByIdentifierOrId(string|int $key, bool $withTrashed = false): ?self
    {
        $query = $withTrashed ? static::withTrashed() : static::query();

        if (is_numeric($key)) {
            return $query->where('id', (int) $key)->orWhere('identifier', (string) $key)->first();
        }

        return $query->where('identifier', $key)->first();
    }

    /**
     * Determine the prunable query for the model.
     * Soft-deleted users are permanently pruned after 30 days.
     */
    public function prunable(): Builder
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'identifier',
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'user_type',
        'is_active',
        'avatar_url',
        'banner_url',
        'phone_country_code_1',
        'phone_1',
        'phone_country_code_2',
        'phone_2',
        'country',
        'province_state',
        'city',
        'postal_code',
        'address_line_1',
        'address_line_2',
        'two_factor_secret',
        'two_factor_confirmed_at',
        'two_factor_recovery_codes',
        'failed_login_attempts',
        'failed_2fa_attempts',
        'lockout_level',
        'locked_until',
        'locked_reason',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'two_factor_enabled',
        'is_locked',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Determine if Two-Factor Authentication is currently active for this user.
     */
    public function getTwoFactorEnabledAttribute(): bool
    {
        return ! empty($this->two_factor_secret) && ! empty($this->two_factor_confirmed_at);
    }

    /**
     * Determine if this user account is currently locked or permanently disabled due to security strikes.
     */
    public function getIsLockedAttribute(): bool
    {
        if (! $this->is_active) {
            return true;
        }

        if (! empty($this->locked_until)) {
            return Carbon::parse($this->locked_until)->isFuture();
        }

        return false;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Check if user is a Super Admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasRole(config('arx.roles.super_admin', 'super-admin'));
    }

    /**
     * Check if user is an AI Agent identity.
     */
    public function isAiAgent(): bool
    {
        return $this->user_type === 'ai_agent' || $this->hasRole(config('arx.roles.ai_agent', 'ai-agent'));
    }

    /**
     * Check if user is a regular human user.
     */
    public function isStandardUser(): bool
    {
        return $this->user_type === 'user';
    }
}
