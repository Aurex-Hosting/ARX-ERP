<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model representing admin broadcast notifications dispatched across users or roles.
 */
class BroadcastNotification extends Model
{
    use Auditable, HasFactory;

    protected $fillable = [
        'title',
        'body',
        'type',
        'action_buttons',
        'enable_reactions',
        'send_email',
        'email_subject',
        'email_body_html',
        'email_action_label',
        'email_action_url',
        'target_type',
        'target_user_ids',
        'target_role_ids',
        'excluded_user_ids',
        'excluded_role_ids',
        'scheduled_at',
        'repeat_interval',
        'status',
        'created_by',
        'recipients_count',
        'sent_at',
    ];

    protected $casts = [
        'action_buttons' => 'array',
        'enable_reactions' => 'boolean',
        'send_email' => 'boolean',
        'target_user_ids' => 'array',
        'target_role_ids' => 'array',
        'excluded_user_ids' => 'array',
        'excluded_role_ids' => 'array',
        'recipients_count' => 'integer',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function userNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class, 'broadcast_notification_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(UserNotificationReaction::class, 'broadcast_notification_id');
    }
}
