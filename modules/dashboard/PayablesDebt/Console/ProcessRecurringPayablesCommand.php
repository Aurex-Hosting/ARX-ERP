<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Console;

use Illuminate\Console\Command;
use Modules\Dashboard\PayablesDebt\Services\RecurringScheduleGenerator;

/**
 * Daily command to auto-generate upcoming installments for recurring invoices and subscriptions.
 */
class ProcessRecurringPayablesCommand extends Command
{
    protected $signature = 'payables:process-recurring';

    protected $description = 'Scan active recurring payables and pre-generate upcoming installments';

    public function handle(RecurringScheduleGenerator $generator): int
    {
        $this->info('Processing recurring payables...');

        $generated = $generator->processAll();

        $this->info("Done. {$generated} installment(s) generated.");

        return self::SUCCESS;
    }
}
