<?php

namespace App\Filament\Resources;

use Filament\Resources\Resource;
use BezhanSalleh\FilamentShield\Contracts\HasShieldPermissions;

class MailSettingsResource extends Resource implements HasShieldPermissions
{
    protected static ?string $model = \App\Models\MailSetting::class;
    
    protected static bool $shouldRegisterNavigation = false;

    public static function getPermissionPrefixes(): array
    {
        return [
            'view_smtp_settings', 'update_smtp_settings',
            'execute_test_email',
            'view_template_email_verification', 'update_template_email_verification',
            'view_template_2fa', 'update_template_2fa',
            'view_template_password_reset', 'update_template_password_reset',
            'view_template_login_detection', 'update_template_login_detection',
            'view_broadcast', 'execute_broadcast',
            'view_global_placeholders', 'update_global_placeholders', 'create_global_placeholders', 'delete_global_placeholders',
        ];
    }
}
