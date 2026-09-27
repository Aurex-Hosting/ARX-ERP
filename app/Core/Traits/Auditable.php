<?php

declare(strict_types=1);

namespace App\Core\Traits;

use App\Core\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

/**
 * Trait to automatically record mutation audit logs on Eloquent models.
 */
trait Auditable
{
    /**
     * Boot the Auditable trait.
     */
    public static function bootAuditable(): void
    {
        static::created(function (Model $model): void {
            static::recordAudit($model, 'create', null, $model->attributesToArray());
        });

        static::updated(function (Model $model): void {
            $old = array_intersect_key($model->getOriginal(), $model->getDirty());
            $new = $model->getDirty();

            static::recordAudit($model, 'update', $old, $new);
        });

        static::deleted(function (Model $model): void {
            $action = 'delete';

            if (in_array(SoftDeletes::class, class_uses_recursive($model), true)) {
                $action = method_exists($model, 'isForceDeleting') && $model->isForceDeleting()
                    ? 'force_delete'
                    : 'soft_delete';
            }

            static::recordAudit($model, $action, $model->attributesToArray(), null);
        });

        if (in_array(SoftDeletes::class, class_uses_recursive(static::class), true)) {
            static::restored(function (Model $model): void {
                static::recordAudit($model, 'restore', null, $model->attributesToArray());
            });
        }
    }

    /**
     * Record an audit log entry.
     *
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    protected static function recordAudit(Model $model, string $action, ?array $oldValues, ?array $newValues): void
    {
        if (! config('arx.audit.enabled', true)) {
            return;
        }

        $user = Auth::user();
        $userIdentifier = $user?->identifier ?? null;
        $modelIdentifier = $model->identifier ?? null;
        $requestId = Request::header('X-Request-ID') ?? (string) Request::instance()->attributes->get('request_id');

        if (! $requestId) {
            $requestId = (string) Str::uuid();
            Request::instance()->attributes->set('request_id', $requestId);
        }

        $description = static::generateAuditDescription($model, $action, $oldValues, $newValues, $user);

        AuditLog::create([
            'request_id' => $requestId,
            'user_id' => $user?->getAuthIdentifier(),
            'user_type' => $user?->user_type ?? 'system',
            'user_identifier' => $userIdentifier,
            'action' => $action,
            'model_type' => get_class($model),
            'model_id' => $model->getKey(),
            'model_identifier' => $modelIdentifier,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'metadata' => [
                'route' => Request::path(),
                'method' => Request::method(),
            ],
        ]);
    }

    /**
     * Generate a clear, human-readable description for the audit event.
     *
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    protected static function generateAuditDescription(
        Model $model,
        string $action,
        ?array $oldValues,
        ?array $newValues,
        mixed $user
    ): string {
        $actorName = $user?->name ?? 'System';
        $modelName = class_basename($model);
        $targetName = $model->name ?? $model->title ?? $model->identifier ?? "ID #{$model->getKey()}";
        $targetIdentifier = $model->identifier ? " (#{$model->identifier})" : '';

        return match ($action) {
            'create' => "{$actorName} created {$modelName} '{$targetName}'{$targetIdentifier}",
            'update' => "{$actorName} updated {$modelName} '{$targetName}'{$targetIdentifier}".
                ($newValues ? ' (modified: '.implode(', ', array_keys($newValues)).')' : ''),
            'soft_delete' => "{$actorName} moved {$modelName} '{$targetName}'{$targetIdentifier} to Recycle Bin",
            'restore' => "{$actorName} restored {$modelName} '{$targetName}'{$targetIdentifier} from Recycle Bin",
            'force_delete' => "{$actorName} permanently deleted {$modelName} '{$targetName}'{$targetIdentifier}",
            default => "{$actorName} performed {$action} on {$modelName} '{$targetName}'{$targetIdentifier}",
        };
    }
}
