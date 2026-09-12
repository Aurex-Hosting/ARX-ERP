<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class BackupSettings extends Settings
{
    public bool $auto_backup_enabled;
    public string $auto_backup_time;

    public static function group(): string
    {
        return 'backup';
    }
}
