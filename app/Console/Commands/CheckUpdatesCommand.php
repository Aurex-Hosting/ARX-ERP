<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\UpdateManager;
use App\Models\User;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Mail;
use App\Mail\UpdateAvailableMail;
use Illuminate\Support\Facades\Log;

class CheckUpdatesCommand extends Command
{
    protected $signature = "updater:check";
    protected $description = "Check for system updates via GitHub releases";

    public function handle(UpdateManager $updater)
    {
        $latest = $updater->checkLatestVersion(true);
        if ($updater->isUpdateAvailable()) {
            $superAdmins = User::role("super_admin")->get();
            
            foreach ($superAdmins as $admin) {
                Notification::make()
                    ->title("System Update Available")
                    ->body("Version {$latest["version"]} is now available.")
                    ->icon("heroicon-o-cloud-arrow-down")
                    ->color("success")
                    ->sendToDatabase($admin);
                    
                try {
                    Mail::to($admin->email)->send(new UpdateAvailableMail($latest["version"], $latest["notes"]));
                } catch (\Exception $e) {
                    Log::error("Failed to send update email to " . $admin->email . ": " . $e->getMessage());
                }
            }
            $this->info("Update available. Notifications sent.");
        } else {
            $this->info("System is up to date.");
        }
    }
}
