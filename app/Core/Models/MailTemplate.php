<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Dynamic Mail Template Model.
 *
 * @property int $id
 * @property string $key
 * @property string $name
 * @property string $subject
 * @property string $body_html
 * @property string|null $body_plain
 * @property string|null $action_button_label
 * @property array<string, string>|null $placeholders_schema
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class MailTemplate extends Model
{
    use Auditable, HasFactory;

    protected $table = 'mail_templates';

    protected $fillable = [
        'key',
        'name',
        'subject',
        'body_html',
        'body_plain',
        'action_button_label',
        'placeholders_schema',
    ];

    protected $casts = [
        'placeholders_schema' => 'array',
    ];
}
