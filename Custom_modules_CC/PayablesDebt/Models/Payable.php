<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Master record for invoices, subscriptions, and loans.
 *
 * @property int $id
 * @property string $type
 * @property string $title
 * @property string $vendor_name
 * @property string $category
 * @property string|null $reference_no
 * @property string $currency
 * @property float $total_amount
 * @property float $amount_paid
 * @property string $status
 * @property bool $is_recurring
 * @property string|null $frequency
 * @property Carbon|null $start_date
 * @property Carbon|null $end_date
 * @property bool $repeat_indefinitely
 * @property int $pregeneration_days
 * @property string|null $plan_tier
 * @property string|null $payment_method_info
 * @property bool $auto_renew
 * @property int $notice_period_days
 * @property float|null $principal_amount
 * @property float|null $interest_rate
 * @property string|null $interest_frequency
 * @property string|null $calculation_method
 * @property int|null $tenure_months
 * @property int $grace_period_days
 * @property string|null $penalty_type
 * @property float $penalty_rate
 * @property int|null $payment_day_of_month
 * @property array|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class Payable extends Model
{
    use SoftDeletes;

    protected $table = 'payables';

    protected $fillable = [
        'type',
        'title',
        'vendor_name',
        'category',
        'reference_no',
        'currency',
        'total_amount',
        'amount_paid',
        'status',
        'payment_url',
        'payment_urls',
        'is_recurring',
        'frequency',
        'interval_count',
        'interval_unit',
        'start_date',
        'target_due_date',
        'end_date',
        'repeat_indefinitely',
        'pregeneration_days',
        'plan_tier',
        'payment_method_info',
        'auto_renew',
        'notice_period_days',
        'loan_type',
        'principal_amount',
        'interest_rate',
        'interest_frequency',
        'interest_period_count',
        'interest_period_unit',
        'calculation_method',
        'tenure_months',
        'grace_period_days',
        'penalty_type',
        'penalty_rate',
        'payment_day_of_month',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'is_recurring' => 'boolean',
            'interval_count' => 'integer',
            'start_date' => 'date',
            'target_due_date' => 'date',
            'end_date' => 'date',
            'repeat_indefinitely' => 'boolean',
            'pregeneration_days' => 'integer',
            'auto_renew' => 'boolean',
            'notice_period_days' => 'integer',
            'principal_amount' => 'decimal:2',
            'interest_rate' => 'decimal:3',
            'interest_period_count' => 'integer',
            'tenure_months' => 'integer',
            'grace_period_days' => 'integer',
            'penalty_rate' => 'decimal:2',
            'payment_day_of_month' => 'integer',
            'metadata' => 'array',
            'payment_urls' => 'array',
        ];
    }

    /**
     * Get all installments for this payable.
     */
    public function installments(): HasMany
    {
        return $this->hasMany(PayableInstallment::class);
    }

    /**
     * Get all documents for this payable.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(PayableDocument::class);
    }

    /**
     * Get all audit logs for this payable.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(PayableAuditLog::class);
    }

    /**
     * Scope: only active recurring payables.
     */
    public function scopeActiveRecurring(Builder $query): Builder
    {
        return $query->where('is_recurring', true)
            ->whereIn('status', ['pending', 'due_soon', 'overdue'])
            ->where(function (Builder $q): void {
                $q->where('repeat_indefinitely', true)
                    ->orWhere('end_date', '>=', now()->toDateString());
            });
    }

    /**
     * Calculate the outstanding balance.
     */
    public function getOutstandingBalanceAttribute(): float
    {
        return (float) bcsub((string) $this->total_amount, (string) $this->amount_paid, 2);
    }
}
