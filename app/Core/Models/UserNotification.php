<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Model representing individual user inbox notifications.
 */
class UserNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'broadcast_notification_id',
        'title',
        'body',
        'type',
        'category',
        'action_buttons',
        'enable_reactions',
        'metadata',
        'read_at',
        'dismissed_at',
    ];

    protected $casts = [
        'action_buttons' => 'array',
        'enable_reactions' => 'boolean',
        'metadata' => 'array',
        'read_at' => 'datetime',
        'dismissed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function broadcast(): BelongsTo
    {
        return $this->belongsTo(BroadcastNotification::class, 'broadcast_notification_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(UserNotificationReaction::class, 'user_notification_id');
    }

    public function userReaction(): HasOne
    {
        return $this->hasOne(UserNotificationReaction::class, 'user_notification_id')
            ->where('user_id', auth()->id());
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    public function markAsRead(): void
    {
        if ($this->read_at === null) {
            $this->update(['read_at' => now()]);
        }
    }
}
