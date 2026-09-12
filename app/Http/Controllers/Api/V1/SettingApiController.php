<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Settings\MailSettings;
use App\Settings\CustomizationSettings;

class SettingApiController extends Controller
{
    public function getMail(MailSettings $settings)
    {
        return response()->json($settings->toArray());
    }

    public function updateMail(Request $request, MailSettings $settings)
    {
        $validated = $request->validate([
            'mail_mailer' => 'sometimes|string',
            'mail_host' => 'sometimes|string',
            'mail_port' => 'sometimes|integer',
            'mail_username' => 'sometimes|string|nullable',
            'mail_password' => 'sometimes|string|nullable',
            'mail_encryption' => 'sometimes|string|nullable',
            'mail_from_address' => 'sometimes|email',
            'mail_from_name' => 'sometimes|string',
        ]);

        foreach ($validated as $key => $value) {
            $settings->{$key} = $value;
        }
        
        $settings->save();

        return response()->json($settings->toArray());
    }

    public function getCustomization(CustomizationSettings $settings)
    {
        return response()->json($settings->toArray());
    }

    public function updateCustomization(Request $request, CustomizationSettings $settings)
    {
        $validated = $request->validate([
            'app_name' => 'sometimes|string',
            'primary_color' => 'sometimes|string',
            'logo_path' => 'sometimes|string|nullable',
        ]);

        foreach ($validated as $key => $value) {
            $settings->{$key} = $value;
        }

        $settings->save();

        return response()->json($settings->toArray());
    }
}
