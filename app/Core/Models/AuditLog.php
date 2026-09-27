<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

/**
 * Model representing an immutable audit log record.
 *
 * @property int $id
 * @property string|null $request_id
 * @property int|null $user_id
 * @property string $user_type
 * @property string|null $user_identifier
 * @property string $action
 * @property string|null $model_type
 * @property int|null $model_id
 * @property string|null $model_identifier
 * @property string|null $description
 * @property array<string, mixed>|null $old_values
 * @property array<string, mixed>|null $new_values
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property array<string, mixed>|null $metadata
 * @property Carbon $created_at
 */
class AuditLog extends Model
{
    use HasFactory;

    /**
     * Disable updated_at since audit logs are strictly append-only.
     */
    public const UPDATED_AT = null;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'audit_logs';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'request_id',
        'user_id',
        'user_type',
        'user_identifier',
        'action',
        'model_type',
        'model_id',
        'model_identifier',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'metadata',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Get the actor who generated the audit log.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record an audit log event.
     *
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     * @param  array<string, mixed>|null  $metadata
     */
    public static function record(
        string $action,
        ?string $description = null,
        ?Model $model = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
        mixed $user = null
    ): ?self {
        if (! config('arx.audit.enabled', true)) {
            return null;
        }

        $user = $user ?? Auth::user();
        $userIdentifier = $user?->identifier ?? null;
        $modelIdentifier = $model?->identifier ?? null;
        $requestId = Request::header('X-Request-ID') ?? (string) Request::instance()->attributes->get('request_id');

        if (! $requestId) {
            $requestId = (string) Str::uuid();
            Request::instance()->attributes->set('request_id', $requestId);
        }

        if (! $description && $model) {
            $actorName = $user?->name ?? 'System';
            $modelName = class_basename($model);
            $targetName = $model->name ?? $model->title ?? $model->identifier ?? "ID #{$model->getKey()}";
            $description = "{$actorName} performed {$action} on {$modelName} '{$targetName}'";
        }

        return static::create([
            'request_id' => $requestId,
            'user_id' => $user?->getAuthIdentifier(),
            'user_type' => $user?->user_type ?? ($user ? 'user' : 'system'),
            'user_identifier' => $userIdentifier,
            'action' => $action,
            'model_type' => $model ? get_class($model) : null,
            'model_id' => $model?->getKey(),
            'model_identifier' => $modelIdentifier,
            'description' => $description ?? "System performed {$action}",
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'metadata' => array_merge([
                'route' => Request::path(),
                'method' => Request::method(),
            ], $metadata ?? []),
        ]);
    }
}
