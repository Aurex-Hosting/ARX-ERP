<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('backup.auto_backup_enabled', true);
        $this->migrator->add('backup.auto_backup_time', '02:00');
    }
};
