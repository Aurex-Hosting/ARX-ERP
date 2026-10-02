<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Singleton notification audience and email/in-app toggle configuration.
 *
 * @property int $id
 * @property string $audience_type
 * @property array $selected_user_ids
 * @property array $selected_role_ids
 * @property array $excluded_user_ids
 * @property array $excluded_role_ids
 * @property int $notify_due_soon_days
 * @property bool $notify_overdue
 * @property bool $enable_in_app
 * @property bool $enable_email
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PayableNotificationConfig extends Model
{
    protected $table = 'payable_notification_configs';

    protected $fillable = [
        'audience_type',
        'selected_user_ids',
        'selected_role_ids',
        'excluded_user_ids',
        'excluded_role_ids',
        'notify_due_soon_days',
        'notify_overdue',
        'enable_in_app',
        'enable_email',
        'widget_calendar_enabled',
        'widget_calendar_size',
        'widget_calendar_design',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'selected_user_ids' => 'array',
            'selected_role_ids' => 'array',
            'excluded_user_ids' => 'array',
            'excluded_role_ids' => 'array',
            'notify_due_soon_days' => 'integer',
            'notify_overdue' => 'boolean',
            'enable_in_app' => 'boolean',
            'enable_email' => 'boolean',
            'widget_calendar_enabled' => 'boolean',
            'widget_calendar_size' => 'string',
            'widget_calendar_design' => 'string',
        ];
    }

    /**
     * Singleton accessor: returns the single configuration row or creates default.
     */
    public static function instance(): self
    {
        return static::firstOrCreate([], [
            'audience_type' => 'all_users',
            'selected_user_ids' => [],
            'selected_role_ids' => [],
            'excluded_user_ids' => [],
            'excluded_role_ids' => [],
            'notify_due_soon_days' => 5,
            'notify_overdue' => true,
            'enable_in_app' => true,
            'enable_email' => false,
        ]);
    }
}
