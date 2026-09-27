<?php

use App\Core\Services\BackupManager;
use App\Core\Services\NotificationService;
use App\Core\Services\SettingsManager;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('notifications:dispatch-scheduled', function (NotificationService $service) {
    $count = $service->processScheduledBroadcasts();
    $this->info("Successfully processed {$count} scheduled broadcast(s).");
})->purpose('Dispatch pending scheduled broadcast notifications whose due date has arrived');

Schedule::command('notifications:dispatch-scheduled')->everyMinute();

Schedule::call(function (): void {
    $settings = app(SettingsManager::class);
    $autoEnabled = filter_var($settings->get('system.backup.auto_enabled', false), FILTER_VALIDATE_BOOLEAN);
    if (! $autoEnabled) {
        return;
    }

    $schedule = (string) $settings->get('system.backup.schedule', 'daily');
    $time = (string) $settings->get('system.backup.auto_time', '00:00');
    $type = (string) $settings->get('system.backup.default_type', 'full');
    $timezone = config('app.timezone', 'UTC');

    $now = now($timezone);
    $timeParts = explode(':', $time);
    $targetHour = (int) ($timeParts[0] ?? 0);
    $targetMinute = (int) ($timeParts[1] ?? 0);

    $isTimeMatch = ((int) $now->format('H') === $targetHour && (int) $now->format('i') === $targetMinute);

    $shouldRun = match ($schedule) {
        'hourly' => ((int) $now->format('i') === $targetMinute),
        'daily' => $isTimeMatch,
        'weekly' => ($now->isSunday() && $isTimeMatch),
        'monthly' => ($now->day === 1 && $isTimeMatch),
        default => false,
    };

    if ($shouldRun) {
        $manager = app(BackupManager::class);
        $manager->createBackup($type, "Automated scheduled backup ({$schedule} at {$time} {$timezone})");
        $manager->pruneOldBackups();
    }
})->everyMinute()->name('arx:auto-backup-runner');
