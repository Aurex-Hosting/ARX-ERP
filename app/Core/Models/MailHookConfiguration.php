<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Feature Trigger Hooks & Global Placeholders.
 *
 * @property int $id
 * @property bool $hook_user_pwd_change
 * @property bool $hook_forgot_password
 * @property bool $hook_verify_email_on_created
 * @property bool $hook_account_status_change
 * @property bool $hook_notify_broadcast
 * @property array<int, array<string, string>>|null $custom_placeholders
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class MailHookConfiguration extends Model
{
    use Auditable, HasFactory;

    protected $table = 'mail_hooks_configuration';

    protected $fillable = [
        'hook_user_pwd_change',
        'hook_forgot_password',
        'hook_verify_email_on_created',
        'hook_account_status_change',
        'hook_notify_broadcast',
        'custom_placeholders',
    ];

    protected $casts = [
        'hook_user_pwd_change' => 'boolean',
        'hook_forgot_password' => 'boolean',
        'hook_verify_email_on_created' => 'boolean',
        'hook_account_status_change' => 'boolean',
        'hook_notify_broadcast' => 'boolean',
        'custom_placeholders' => 'array',
    ];

    /**
     * Singleton accessor for global mail hooks configuration.
     */
    public static function instance(): self
    {
        return static::firstOrCreate([], [
            'hook_user_pwd_change' => true,
            'hook_forgot_password' => true,
            'hook_verify_email_on_created' => true,
            'hook_account_status_change' => true,
            'hook_notify_broadcast' => true,
            'custom_placeholders' => [
                [
                    'key' => 'support_email',
                    'value' => 'support@arx-erp.local',
                    'description' => 'Official Enterprise Support Email',
                ],
                [
                    'key' => 'company_name',
                    'value' => 'ARX Solutions Corp',
                    'description' => 'Operating Enterprise Legal Entity',
                ],
            ],
        ]);
    }
}
