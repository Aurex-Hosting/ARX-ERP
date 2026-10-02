<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Console;

use Illuminate\Console\Command;
use Modules\Dashboard\PayablesDebt\Models\PayableAuditLog;
use Modules\Dashboard\PayablesDebt\Models\PayableInstallment;
use Modules\Dashboard\PayablesDebt\Services\LoanCalculationEngine;

/**
 * Daily command to evaluate overdue installments and apply late-payment penalties.
 */
class CalculateOverduePenaltiesCommand extends Command
{
    protected $signature = 'payables:calculate-penalties';

    protected $description = 'Evaluate overdue installments and apply late fees and penalty interest';

    public function handle(LoanCalculationEngine $engine): int
    {
        $this->info('Scanning for overdue installments...');

        $overdueInstallments = PayableInstallment::with('payable')
            ->whereIn('status', ['scheduled', 'due_soon', 'overdue'])
            ->where('due_date', '<', now()->toDateString())
            ->get();

        $penaltiesApplied = 0;

        foreach ($overdueInstallments as $installment) {
            $payable = $installment->payable;

            if (! $payable || ! $payable->penalty_type) {
                // Still mark as overdue even if no penalty config
                if ($installment->status !== 'overdue') {
                    $installment->update(['status' => 'overdue']);
                    $payable?->update(['status' => 'overdue']);
                }

                continue;
            }

            $penalty = $engine->applyPenalty($installment);

            if ($penalty > 0) {
                $penaltiesApplied++;

                PayableAuditLog::create([
                    'payable_id' => $payable->id,
                    'user_id' => 0, // System action
                    'action' => 'penalty_applied',
                    'description' => "Auto-applied penalty of {$penalty} to installment #{$installment->installment_number} for: {$payable->title}",
                    'ip_address' => '127.0.0.1',
                    'new_values' => [
                        'installment_id' => $installment->id,
                        'penalty_amount' => $penalty,
                        'total_due' => $installment->fresh()->total_due,
                    ],
                ]);
            }

            // Ensure parent payable status reflects overdue
            if ($payable->status !== 'overdue' && $payable->status !== 'paid' && $payable->status !== 'cancelled') {
                $payable->update(['status' => 'overdue']);
            }
        }

        $this->info("Done. Processed {$overdueInstallments->count()} overdue installment(s), applied {$penaltiesApplied} penalty/penalties.");

        return self::SUCCESS;
    }
}
