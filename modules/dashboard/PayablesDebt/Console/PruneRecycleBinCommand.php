<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Console;

use Illuminate\Console\Command;
use Modules\Dashboard\PayablesDebt\Http\Controllers\RecycleBinController;

/**
 * Daily command to auto-purge soft-deleted payables, installments, and documents older than 14 days.
 */
class PruneRecycleBinCommand extends Command
{
    protected $signature = 'payables:prune-recycle-bin';

    protected $description = 'Permanently purge soft-deleted payables, installments, and receipts that have been in the recycle bin for over 14 days';

    public function handle(): int
    {
        $this->info('Pruning recycle bin records older than 14 days...');

        $pruned = RecycleBinController::pruneExpired();

        $this->info("Done. {$pruned} record(s) permanently purged from the recycle bin.");

        return self::SUCCESS;
    }
}
