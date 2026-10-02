<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Services;

use Illuminate\Support\Carbon;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableInstallment;

/**
 * Engine for computing loan installments, interest accrual, and late-payment penalties.
 * Supports Single-time (bullet) loans and Long-time amortized loans across flexible day/month/year intervals.
 */
class LoanCalculationEngine
{
    /**
     * Generate the full installment schedule for a loan-type payable.
     *
     * @return array<int, PayableInstallment>
     */
    public function generateSchedule(Payable $loan): array
    {
        $loanType = $loan->loan_type ?? 'long_time';

        if ($loanType === 'single_time') {
            return $this->calculateSingleTime($loan);
        }

        $principal = (float) $loan->principal_amount;
        $rate = (float) $loan->interest_rate / 100;
        $tenureCount = (int) ($loan->tenure_months ?: 12);
        $method = $loan->calculation_method ?? 'flat';
        $paymentDay = $loan->payment_day_of_month ?? 1;
        $startDate = $loan->start_date ? Carbon::parse($loan->start_date) : Carbon::today();
        $intervalCount = (int) ($loan->interval_count ?: 1);
        $intervalUnit = $loan->interval_unit ?: 'months';

        return match ($method) {
            'flat' => $this->calculateFlat($loan, $principal, $rate, $tenureCount, $paymentDay, $startDate, $intervalCount, $intervalUnit),
            'simple' => $this->calculateSimple($loan, $principal, $rate, $tenureCount, $paymentDay, $startDate, $intervalCount, $intervalUnit),
            'compounding' => $this->calculateCompounding($loan, $principal, $rate, $tenureCount, $paymentDay, $startDate, $intervalCount, $intervalUnit),
            default => $this->calculateFlat($loan, $principal, $rate, $tenureCount, $paymentDay, $startDate, $intervalCount, $intervalUnit),
        };
    }

    /**
     * Single-time loan: Target to pay on a specific target date.
     * Calculation: Base amount + Interest charge.
     * Overdue penalties apply if paid past target due date + grace period.
     *
     * @return array<int, PayableInstallment>
     */
    public function calculateSingleTime(Payable $loan): array
    {
        $principal = (float) $loan->principal_amount;
        $ratePercent = (float) $loan->interest_rate;
        $startDate = $loan->start_date ? Carbon::parse($loan->start_date) : Carbon::today();

        $targetDate = $loan->target_due_date
            ? Carbon::parse($loan->target_due_date)
            : ($loan->end_date ? Carbon::parse($loan->end_date) : $startDate->copy()->addMonth());

        $interestCharge = round($principal * ($ratePercent / 100), 2);
        $totalDue = round($principal + $interestCharge, 2);

        // Update the master payable record total amount to reflect principal + interest
        $loan->update(['total_amount' => $totalDue]);

        $installment = PayableInstallment::create([
            'payable_id' => $loan->id,
            'installment_number' => 1,
            'due_date' => $targetDate,
            'base_amount' => $principal,
            'interest_amount' => $interestCharge,
            'penalty_amount' => 0,
            'total_due' => $totalDue,
            'status' => 'scheduled',
        ]);

        return [$installment];
    }

    /**
     * Helper to compute due date based on arbitrary interval count and unit.
     */
    protected function calculateDueDate(
        Carbon $startDate,
        int $installmentIndex,
        int $intervalCount,
        string $intervalUnit,
        int $paymentDay
    ): Carbon {
        $step = $installmentIndex * $intervalCount;

        return match ($intervalUnit) {
            'days' => $startDate->copy()->addDays($step),
            'years' => $startDate->copy()->addYears($step),
            default => $startDate->copy()->addMonths($step)->day(min($paymentDay, $startDate->copy()->addMonths($step)->daysInMonth)),
        };
    }

    /**
     * Flat Rate: Interest = Principal × Rate × (Tenure / 12).
     * Split evenly across all installments.
     *
     * @return array<int, PayableInstallment>
     */
    protected function calculateFlat(
        Payable $loan,
        float $principal,
        float $annualRate,
        int $tenureCount,
        int $paymentDay,
        Carbon $startDate,
        int $intervalCount = 1,
        string $intervalUnit = 'months',
    ): array {
        // Normalize tenure to years for interest computation
        $tenureYears = match ($intervalUnit) {
            'days' => ($tenureCount * $intervalCount) / 365,
            'years' => ($tenureCount * $intervalCount),
            default => ($tenureCount * $intervalCount) / 12,
        };

        $totalInterest = $principal * $annualRate * max(0.01, $tenureYears);
        $perInstallmentPrincipal = round($principal / $tenureCount, 2);
        $perInstallmentInterest = round($totalInterest / $tenureCount, 2);
        $perInstallmentTotal = round($perInstallmentPrincipal + $perInstallmentInterest, 2);

        $installments = [];

        for ($i = 1; $i <= $tenureCount; $i++) {
            $dueDate = $this->calculateDueDate($startDate, $i, $intervalCount, $intervalUnit, $paymentDay);

            $installments[] = PayableInstallment::create([
                'payable_id' => $loan->id,
                'installment_number' => $i,
                'due_date' => $dueDate,
                'base_amount' => $perInstallmentPrincipal,
                'interest_amount' => $perInstallmentInterest,
                'penalty_amount' => 0,
                'total_due' => $perInstallmentTotal,
                'status' => 'scheduled',
            ]);
        }

        return $installments;
    }

    /**
     * Simple Interest: Daily = (Outstanding × Annual Rate) / 365.
     * Installment applies accumulated daily interest.
     *
     * @return array<int, PayableInstallment>
     */
    protected function calculateSimple(
        Payable $loan,
        float $principal,
        float $annualRate,
        int $tenureCount,
        int $paymentDay,
        Carbon $startDate,
        int $intervalCount = 1,
        string $intervalUnit = 'months',
    ): array {
        $perInstallmentPrincipal = round($principal / $tenureCount, 2);
        $outstanding = $principal;
        $installments = [];

        for ($i = 1; $i <= $tenureCount; $i++) {
            $dueDate = $this->calculateDueDate($startDate, $i, $intervalCount, $intervalUnit, $paymentDay);
            $prevDate = $i === 1 ? $startDate->copy() : $this->calculateDueDate($startDate, $i - 1, $intervalCount, $intervalUnit, $paymentDay);
            $daysInPeriod = max(1, $prevDate->diffInDays($dueDate));

            $interest = round(($outstanding * $annualRate * $daysInPeriod) / 365, 2);
            $total = round($perInstallmentPrincipal + $interest, 2);

            $installments[] = PayableInstallment::create([
                'payable_id' => $loan->id,
                'installment_number' => $i,
                'due_date' => $dueDate,
                'base_amount' => $perInstallmentPrincipal,
                'interest_amount' => $interest,
                'penalty_amount' => 0,
                'total_due' => $total,
                'status' => 'scheduled',
            ]);

            $outstanding -= $perInstallmentPrincipal;
        }

        return $installments;
    }

    /**
     * Compounding Interest: Standard amortization (EMI formula).
     *
     * @return array<int, PayableInstallment>
     */
    protected function calculateCompounding(
        Payable $loan,
        float $principal,
        float $annualRate,
        int $tenureCount,
        int $paymentDay,
        Carbon $startDate,
        int $intervalCount = 1,
        string $intervalUnit = 'months',
    ): array {
        // Periods per year
        $periodsPerYear = match ($intervalUnit) {
            'days' => 365 / max(1, $intervalCount),
            'years' => 1 / max(1, $intervalCount),
            default => 12 / max(1, $intervalCount),
        };

        $periodicRate = $annualRate / max(1, $periodsPerYear);
        $installments = [];

        if ($periodicRate > 0) {
            $emi = $principal * $periodicRate * pow(1 + $periodicRate, $tenureCount)
                / (pow(1 + $periodicRate, $tenureCount) - 1);
            $emi = round($emi, 2);
        } else {
            $emi = round($principal / $tenureCount, 2);
        }

        $outstanding = $principal;

        for ($i = 1; $i <= $tenureCount; $i++) {
            $dueDate = $this->calculateDueDate($startDate, $i, $intervalCount, $intervalUnit, $paymentDay);

            $interest = round($outstanding * $periodicRate, 2);
            $principalPortion = round($emi - $interest, 2);

            // Last installment adjustment to avoid rounding drift
            if ($i === $tenureCount) {
                $principalPortion = round($outstanding, 2);
                $interest = round($emi > $principalPortion ? $emi - $principalPortion : 0, 2);
            }

            $installments[] = PayableInstallment::create([
                'payable_id' => $loan->id,
                'installment_number' => $i,
                'due_date' => $dueDate,
                'base_amount' => $principalPortion,
                'interest_amount' => $interest,
                'penalty_amount' => 0,
                'total_due' => round($principalPortion + $interest, 2),
                'status' => 'scheduled',
            ]);

            $outstanding -= $principalPortion;
        }

        return $installments;
    }

    /**
     * Calculate and apply overdue penalties for a single installment.
     */
    public function applyPenalty(PayableInstallment $installment): float
    {
        $payable = $installment->payable;
        $graceDays = (int) $payable->grace_period_days;
        $dueDate = Carbon::parse($installment->due_date);
        $graceCutoff = $dueDate->copy()->addDays($graceDays);

        if (now()->lte($graceCutoff)) {
            return 0.0;
        }

        $daysPastGrace = (int) $graceCutoff->diffInDays(now());
        $penaltyType = $payable->penalty_type;
        $penaltyRate = (float) $payable->penalty_rate;
        $penalty = 0.0;

        if ($penaltyType === 'fixed_fee') {
            // Fixed fee applied once (only if not already applied)
            if ((float) $installment->penalty_amount === 0.0) {
                $penalty = $penaltyRate;
            }
        } elseif ($penaltyType === 'daily_percentage') {
            // Daily percentage on the base amount
            $dailyRate = $penaltyRate / 100;
            $penalty = round((float) $installment->base_amount * $dailyRate * $daysPastGrace, 2);
        }

        if ($penalty > 0) {
            $installment->update([
                'penalty_amount' => $penalty,
                'total_due' => round((float) $installment->base_amount + (float) $installment->interest_amount + $penalty, 2),
                'status' => 'overdue',
            ]);
        }

        return $penalty;
    }
}
