<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class PruneTrashUsersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:prune-trash {--days=30 : Days in trash before permanent deletion}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently purge soft-deleted users and AI agents that have remained in the recycle bin for 30 days.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $query = User::onlyTrashed()->where('deleted_at', '<=', $cutoff);
        $count = $query->count();

        if ($count === 0) {
            $this->info('No expired trashed users found.');

            return self::SUCCESS;
        }

        $query->forceDelete();

        $this->info("Successfully purged {$count} trashed user(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
