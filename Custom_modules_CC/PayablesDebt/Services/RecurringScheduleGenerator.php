<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Services;

use Illuminate\Support\Carbon;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableInstallment;

/**
 * Automatically pre-generates upcoming installments for recurring invoices and subscriptions.
 */
class RecurringScheduleGenerator
{
    /**
     * Scan and generate upcoming installments for all active recurring payables.
     *
     * @return int Number of installments generated.
     */
    public function processAll(): int
    {
        $generated = 0;

        $payables = Payable::activeRecurring()
            ->whereIn('type', ['invoice', 'subscription'])
            ->get();

        foreach ($payables as $payable) {
            $count = $this->generateNextInstallment($payable);
            $generated += $count;
        }

        return $generated;
    }

    /**
     * Generate the next installment for a single recurring payable if it's within the pre-generation window.
     */
    public function generateNextInstallment(Payable $payable): int
    {
        $lastInstallment = $payable->installments()
            ->orderByDesc('installment_number')
            ->first();

        $nextDueDate = $this->calculateNextDueDate($payable, $lastInstallment);

        if (! $nextDueDate) {
            return 0;
        }

        // Check if the pre-generation window has been reached
        $pregenerationDays = $payable->pregeneration_days;
        $triggerDate = $nextDueDate->copy()->subDays($pregenerationDays);

        if (Carbon::today()->lt($triggerDate)) {
            return 0;
        }

        // Check if installment for this due date already exists
        $exists = $payable->installments()
            ->where('due_date', $nextDueDate->toDateString())
            ->exists();

        if ($exists) {
            return 0;
        }

        $installmentNumber = $lastInstallment
            ? $lastInstallment->installment_number + 1
            : 1;

        PayableInstallment::create([
            'payable_id' => $payable->id,
            'installment_number' => $installmentNumber,
            'due_date' => $nextDueDate,
            'base_amount' => $payable->total_amount,
            'interest_amount' => 0,
            'penalty_amount' => 0,
            'total_due' => $payable->total_amount,
            'status' => 'scheduled',
        ]);

        return 1;
    }

    /**
     * Calculate the next due date based on the payable's frequency.
     */
    protected function calculateNextDueDate(Payable $payable, ?PayableInstallment $lastInstallment): ?Carbon
    {
        if ($lastInstallment) {
            $lastDue = $lastInstallment->due_date->copy();
        } else {
            $lastDue = $payable->start_date?->copy() ?? Carbon::today();

            // First installment: due date is the start date itself
            return $lastDue;
        }

        $intervalCount = (int) ($payable->interval_count ?: 1);
        $intervalUnit = $payable->interval_unit;

        if ($intervalUnit) {
            $nextDue = match ($intervalUnit) {
                'days' => $lastDue->addDays($intervalCount),
                'years' => $lastDue->addYears($intervalCount),
                default => $lastDue->addMonths($intervalCount),
            };
        } else {
            $nextDue = match ($payable->frequency) {
                'monthly' => $lastDue->addMonth(),
                'quarterly' => $lastDue->addMonths(3),
                'yearly' => $lastDue->addYear(),
                default => null,
            };
        }

        // Check end date boundary
        if ($nextDue && ! $payable->repeat_indefinitely && $payable->end_date) {
            if ($nextDue->gt($payable->end_date)) {
                return null;
            }
        }

        return $nextDue;
    }
}
