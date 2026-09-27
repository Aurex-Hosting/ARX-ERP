<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Mail server credentials and SMTP settings.
 *
 * @property int $id
 * @property bool $is_enabled
 * @property string|null $host
 * @property int $port
 * @property string|null $username
 * @property string|null $password
 * @property string $encryption
 * @property bool $verify_peer
 * @property string|null $from_address
 * @property string|null $from_name
 * @property Carbon|null $last_tested_at
 * @property string|null $last_test_status
 * @property string|null $last_test_message
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class MailConfiguration extends Model
{
    use Auditable, HasFactory;

    protected $table = 'mail_configurations';

    protected $fillable = [
        'is_enabled',
        'host',
        'port',
        'username',
        'password',
        'encryption',
        'verify_peer',
        'from_address',
        'from_name',
        'last_tested_at',
        'last_test_status',
        'last_test_message',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'port' => 'integer',
        'verify_peer' => 'boolean',
        'password' => 'encrypted',
        'last_tested_at' => 'datetime',
    ];

    protected $hidden = [
        'password',
    ];

    /**
     * Singleton accessor for global mail configuration.
     */
    public static function instance(): self
    {
        return static::firstOrCreate([], [
            'is_enabled' => false,
            'host' => 'smtp.mailtrap.io',
            'port' => 587,
            'encryption' => 'tls',
            'from_address' => 'noreply@arx-erp.local',
            'from_name' => 'ARX-ERP System',
        ]);
    }
}
