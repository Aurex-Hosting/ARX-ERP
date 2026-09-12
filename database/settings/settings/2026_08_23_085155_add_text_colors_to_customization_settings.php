<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('customization.color_text_primary', '#ffffff');
        $this->migrator->add('customization.color_text_secondary', '#9ca3af');
    }
};
