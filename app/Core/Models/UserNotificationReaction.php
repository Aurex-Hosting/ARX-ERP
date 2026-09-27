<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model representing user emoji reactions on notifications.
 */
class UserNotificationReaction extends Model
{
    use HasFactory;

    /**
     * Supported reaction types and their emoji equivalents.
     */
    public const SUPPORTED_REACTIONS = [
        'fire' => '🔥',
        'thumbs_up' => '👍',
        'smile' => '😊',
        'laugh' => '😂',
        'handshake' => '🤝',
        'cry' => '😢',
        'angry' => '😡',
    ];

    protected $fillable = [
        'user_notification_id',
        'broadcast_notification_id',
        'user_id',
        'reaction',
    ];

    public function userNotification(): BelongsTo
    {
        return $this->belongsTo(UserNotification::class, 'user_notification_id');
    }

    public function broadcast(): BelongsTo
    {
        return $this->belongsTo(BroadcastNotification::class, 'broadcast_notification_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
