<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('customization.login_background_image', 'Customizations/login-bg.jpeg');
        $this->migrator->add('customization.login_background_opacity', 50);
        $this->migrator->add('customization.login_background_blur', 0);
        $this->migrator->add('customization.login_card_opacity', 100);
        $this->migrator->add('customization.login_card_blur', 0);
        $this->migrator->add('customization.login_slides', []);
        
        $this->migrator->add('customization.error_404_background_image', 'Customizations/404-backgroun.png');
        $this->migrator->add('customization.error_404_background_opacity', 50);
        $this->migrator->add('customization.error_404_background_blur', 0);
    }
};
