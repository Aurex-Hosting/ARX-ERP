<?php

use App\Core\Services\BackupManager;
use App\Core\Services\NotificationService;
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

Schedule::call(function (BackupManager $manager): void {
    $manager->processScheduledAutoBackup();
})->everyMinute()->name('arx:auto-backup-runner');

Schedule::command('updates:check')->twiceDaily(1, 13)->name('arx:system-updates-checker');
