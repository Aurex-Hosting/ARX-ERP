<?php

namespace App\Filament\Resources;

use Filament\Resources\Resource;
use BezhanSalleh\FilamentShield\Contracts\HasShieldPermissions;

class CustomizationResource extends Resource implements HasShieldPermissions
{
    protected static ?string $model = \App\Models\CustomizationSetting::class;
    
    protected static bool $shouldRegisterNavigation = false;

    public static function getPermissionPrefixes(): array
    {
        return [
            'view_brand_assets', 'update_brand_assets',
            'view_brand_colors', 'update_brand_colors',
            'view_login_background', 'update_login_background',
            'view_login_card', 'update_login_card',
            'view_login_slides', 'update_login_slides',
            'view_404_customization', 'update_404_customization',
        ];
    }
}
