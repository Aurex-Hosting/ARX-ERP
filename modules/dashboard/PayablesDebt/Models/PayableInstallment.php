<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Individual installment or billing instance for a payable.
 *
 * @property int $id
 * @property int $payable_id
 * @property int $installment_number
 * @property Carbon $due_date
 * @property float $base_amount
 * @property float $interest_amount
 * @property float $penalty_amount
 * @property float $total_due
 * @property string $status
 * @property Carbon|null $paid_at
 * @property int|null $proof_document_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PayableInstallment extends Model
{
    protected $table = 'payable_installments';

    protected $fillable = [
        'payable_id',
        'installment_number',
        'due_date',
        'base_amount',
        'interest_amount',
        'penalty_amount',
        'total_due',
        'status',
        'paid_at',
        'proof_document_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'base_amount' => 'decimal:2',
            'interest_amount' => 'decimal:2',
            'penalty_amount' => 'decimal:2',
            'total_due' => 'decimal:2',
            'paid_at' => 'datetime',
            'installment_number' => 'integer',
            'proof_document_id' => 'integer',
        ];
    }

    /**
     * Get the parent payable.
     */
    public function payable(): BelongsTo
    {
        return $this->belongsTo(Payable::class);
    }

    /**
     * Get the associated proof document.
     */
    public function proofDocument(): HasOne
    {
        return $this->hasOne(PayableDocument::class, 'id', 'proof_document_id');
    }

    /**
     * Check if the installment is overdue.
     */
    public function isOverdue(): bool
    {
        return $this->status !== 'paid'
            && $this->status !== 'cancelled'
            && $this->due_date->isPast();
    }
}
