<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Model representing an installed or discovered module.
 *
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property string $area
 * @property string $version
 * @property string|null $description
 * @property bool $is_installed
 * @property bool $is_enabled
 * @property array<string, mixed>|null $manifest
 * @property array<string, mixed>|null $settings
 * @property Carbon|null $installed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Module extends Model
{
    use Auditable, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'modules';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'slug',
        'name',
        'area',
        'version',
        'description',
        'is_installed',
        'is_enabled',
        'manifest',
        'settings',
        'installed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_installed' => 'boolean',
        'is_enabled' => 'boolean',
        'manifest' => 'array',
        'settings' => 'array',
        'installed_at' => 'datetime',
    ];
}
