<?php

namespace App\Filament\Resources;

use Filament\Resources\Resource;
use BezhanSalleh\FilamentShield\Contracts\HasShieldPermissions;

class StorageResource extends Resource implements HasShieldPermissions
{
    protected static ?string $model = \App\Settings\StorageSettings::class; // dummy model
    
    protected static bool $shouldRegisterNavigation = false;

    public static function getPermissionPrefixes(): array
    {
        return [
            'view', 'update'
        ];
    }
}


