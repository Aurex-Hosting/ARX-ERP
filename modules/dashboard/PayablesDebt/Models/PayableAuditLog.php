<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Audit trail for financial actions, cancellations, and deletions.
 *
 * @property int $id
 * @property int|null $payable_id
 * @property int $user_id
 * @property string $action
 * @property string $description
 * @property string|null $ip_address
 * @property array|null $old_values
 * @property array|null $new_values
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PayableAuditLog extends Model
{
    protected $table = 'payable_audit_logs';

    protected $fillable = [
        'payable_id',
        'user_id',
        'action',
        'description',
        'ip_address',
        'old_values',
        'new_values',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
        ];
    }

    /**
     * Get the related payable (may be null if deleted).
     */
    public function payable(): BelongsTo
    {
        return $this->belongsTo(Payable::class)->withTrashed();
    }

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
