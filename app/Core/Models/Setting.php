<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model representing a system or user-level configuration setting.
 *
 * @property int $id
 * @property string $key
 * @property mixed $value
 * @property string $group
 * @property string $type
 * @property string $scope
 * @property int|null $user_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Setting extends Model
{
    use Auditable, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'settings';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'key',
        'value',
        'group',
        'type',
        'scope',
        'user_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'value' => 'json',
    ];

    /**
     * Get the user that owns the setting (if scoped to a user).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
