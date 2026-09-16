<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName;
use Filament\Models\Contracts\HasAvatar;
use Filament\Panel;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Prunable;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail, FilamentUser, HasName, HasAvatar
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles, SoftDeletes, Prunable, LogsActivity, HasApiTokens;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "User '{$this->getFilamentName()}' was {$eventName}");
    }
    
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($user) {
            do {
                $profileId = strtoupper(\Illuminate\Support\Str::random(6));
            } while (self::where('profile_id', $profileId)->exists());
            
            $user->profile_id = $profileId;
        });
    }

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'profile_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'is_locked',
        'failed_login_attempts',
        'avatar_url',
        'banner_url',
        'country',
        'region',
        'city',
        'postal_code',
        'address_line_1',
        'address_line_2',
        'phone_number',
        'force_password_change',
        'force_profile_update',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
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
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_locked' => 'boolean',
            'failed_login_attempts' => 'integer',
            'force_password_change' => 'boolean',
            'force_profile_update' => 'boolean',
            'two_factor_recovery_codes' => 'array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    
    public function getFilamentName(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getFilamentAvatarUrl(): ?string
    {
        return $this->avatar_url 
            ? asset('storage/' . $this->avatar_url) 
            : 'https://ui-avatars.com/api/?name=' . urlencode($this->getFilamentName()) . '&color=FFFFFF&background=111827';
    }

    public function canAccessPanel(Panel $panel): bool
    {
        if (!$this->hasVerifiedEmail()) {
            return false;
        }

        if ($panel->getId() === 'admin') {
            if ($this->hasRole('super_admin')) {
                return true;
            }
            
            if (!$this->can('access_admin_panel')) {
                abort(404);
            }
            return true;
        }

        return true;
    }
}
