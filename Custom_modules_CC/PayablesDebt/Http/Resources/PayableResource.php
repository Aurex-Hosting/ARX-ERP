<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Dashboard\PayablesDebt\Models\Payable;

/**
 * API Resource for Payable models.
 *
 * @mixin Payable
 */
class PayableResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'vendor_name' => $this->vendor_name,
            'category' => $this->category,
            'reference_no' => $this->reference_no,
            'currency' => $this->currency,
            'total_amount' => $this->total_amount,
            'amount_paid' => $this->amount_paid,
            'outstanding_balance' => $this->outstanding_balance,
            'status' => $this->status,
            'payment_url' => $this->payment_url,
            'payment_urls' => $this->payment_urls,

            // Recurring
            'is_recurring' => $this->is_recurring,
            'frequency' => $this->frequency,
            'interval_count' => $this->interval_count,
            'interval_unit' => $this->interval_unit,
            'start_date' => $this->start_date?->toDateString(),
            'target_due_date' => $this->target_due_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'repeat_indefinitely' => $this->repeat_indefinitely,
            'pregeneration_days' => $this->pregeneration_days,

            // Subscription
            'plan_tier' => $this->when($this->type === 'subscription', $this->plan_tier),
            'payment_method_info' => $this->when($this->type === 'subscription', $this->payment_method_info),
            'auto_renew' => $this->when($this->type === 'subscription', $this->auto_renew),
            'notice_period_days' => $this->when($this->type === 'subscription', $this->notice_period_days),

            // Loan
            'loan_type' => $this->when($this->type === 'loan', $this->loan_type),
            'principal_amount' => $this->when($this->type === 'loan', $this->principal_amount),
            'interest_rate' => $this->when($this->type === 'loan', $this->interest_rate),
            'interest_frequency' => $this->when($this->type === 'loan', $this->interest_frequency),
            'interest_period_count' => $this->when($this->type === 'loan', $this->interest_period_count),
            'interest_period_unit' => $this->when($this->type === 'loan', $this->interest_period_unit),
            'calculation_method' => $this->when($this->type === 'loan', $this->calculation_method),
            'tenure_months' => $this->when($this->type === 'loan', $this->tenure_months),
            'grace_period_days' => $this->when($this->type === 'loan', $this->grace_period_days),
            'penalty_type' => $this->when($this->type === 'loan', $this->penalty_type),
            'penalty_rate' => $this->when($this->type === 'loan', $this->penalty_rate),
            'payment_day_of_month' => $this->when($this->type === 'loan', $this->payment_day_of_month),

            'metadata' => $this->metadata,

            // Relations
            'installments' => $this->whenLoaded('installments'),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            'audit_logs' => $this->whenLoaded('auditLogs'),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
