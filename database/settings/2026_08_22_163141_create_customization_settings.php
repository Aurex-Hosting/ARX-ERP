<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('customization.brand_name', 'ARX ERP');
        $this->migrator->add('customization.brand_logo', 'Customizations/logo.png');
        $this->migrator->add('customization.brand_favicon', 'Customizations/favicon.png');
        $this->migrator->add('customization.theme_preset', 'default');
        $this->migrator->add('customization.color_primary', '#f59e0b');
        $this->migrator->add('customization.color_secondary', '#71717a');
        $this->migrator->add('customization.color_accent', '#fbbf24');
        $this->migrator->add('customization.color_background', '#18181b');
    }
};
