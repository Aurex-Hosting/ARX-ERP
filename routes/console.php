<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Storage;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

try {
    $settings = app(\App\Settings\BackupSettings::class);
    if ($settings->auto_backup_enabled) {
        Schedule::call(function () {
            // Cleanup oldest if limit reached
            if (Storage::disk('backups_auto')->exists('')) {
                $files = Storage::disk('backups_auto')->allFiles();
                $zipFiles = array_filter($files, fn($f) => str_ends_with($f, '.zip'));
                if (count($zipFiles) >= 2) {
                    usort($zipFiles, function($a, $b) {
                        return Storage::disk('backups_auto')->lastModified($a) <=> Storage::disk('backups_auto')->lastModified($b);
                    });
                    while(count($zipFiles) >= 2) {
                        Storage::disk('backups_auto')->delete($zipFiles[0]);
                        array_shift($zipFiles);
                    }
                }
            }

            
            
            Artisan::call('backup:run', ['--only-to-disk' => 'backups_auto']);
            activity()->log('Ran scheduled automated backup');
        })->dailyAt($settings->auto_backup_time);
    }
} catch (\Exception $e) {
    //
}



Schedule::command('updater:check')->twiceDaily(1, 13);
