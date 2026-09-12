<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class CustomizationSettings extends Settings
{
    public string $brand_name;
    public ?string $brand_logo;
    public ?string $brand_favicon;
    
    public string $theme_preset;
    
    
    public string $color_primary;
    public string $color_secondary;
    public string $color_accent;
    public string $color_background;
    public string $color_text_primary;
    public string $color_text_secondary;

    public ?string $login_background_image;
    public int $login_background_opacity;
    public int $login_background_blur;
    public int $login_card_opacity;
    public int $login_card_blur;
    public array $login_slides;

    public ?string $error_404_background_image;
    public int $error_404_background_opacity;
    public int $error_404_background_blur;

    public static function group(): string
    {
        return 'customization';
    }
}
