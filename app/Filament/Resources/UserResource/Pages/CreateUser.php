<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Mail;
use Exception;
use Filament\Notifications\Notification;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    protected function afterCreate(): void
    {
        $user = $this->record;
        
        try {
            $settings = app(\App\Settings\MailSettings::class);
            config([
                'mail.default' => $settings->mail_mailer,
                'mail.mailers.smtp.host' => $settings->mail_host,
                'mail.mailers.smtp.port' => $settings->mail_port,
                'mail.mailers.smtp.username' => $settings->mail_username,
                'mail.mailers.smtp.password' => $settings->mail_password,
                'mail.mailers.smtp.encryption' => $settings->mail_encryption ?: null,
                'mail.mailers.smtp.verify_peer' => $settings->mail_verify_peer,
                'mail.from.address' => $settings->mail_from_address,
                'mail.from.name' => $settings->mail_from_name,
            ]);

            $verifyUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addHours(24),
                ['id' => $user->getKey(), 'hash' => sha1($user->getEmailForVerification())]
            );

            $body = $settings->mail_template_email_verification;
            $body = str_replace(['{{verify_url}}', '{{name}}'], [$verifyUrl, $user->name], $body);
            
            if (is_array($settings->mail_placeholders)) {
                foreach ($settings->mail_placeholders as $k => $v) {
                    $body = str_replace('{{'.$k.'}}', $v, $body);
                }
            }

            Mail::html($body, function($msg) use ($user) {
                $msg->to($user->email)->subject('Verify your account');
            });
            
            Notification::make()->title('Verification email sent to user!')->success()->send();
        } catch (Exception $e) {
            Notification::make()->title('Failed to send verification email')->body($e->getMessage())->danger()->send();
        }
    }
}
