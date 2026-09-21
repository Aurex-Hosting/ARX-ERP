<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (str_starts_with(config('app.url'), 'https://')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('super_admin') ? true : null;
        });

        \Spatie\Permission\Models\Role::observe(\App\Observers\RoleObserver::class);

        try {
            $mailSettings = app(\App\Settings\MailSettings::class);
            if ($mailSettings->mail_host) {
                config([
                    'mail.default' => $mailSettings->mail_mailer,
                    'mail.mailers.smtp.host' => $mailSettings->mail_host,
                    'mail.mailers.smtp.port' => $mailSettings->mail_port,
                    'mail.mailers.smtp.username' => $mailSettings->mail_username,
                    'mail.mailers.smtp.password' => $mailSettings->mail_password,
                    'mail.mailers.smtp.encryption' => $mailSettings->mail_encryption ?: null,
                    'mail.mailers.smtp.verify_peer' => $mailSettings->mail_verify_peer,
                    'mail.from.address' => $mailSettings->mail_from_address,
                    'mail.from.name' => $mailSettings->mail_from_name,
                ]);
            }
        } catch (\Exception $e) {
            // Ignore during migrations or when settings aren't migrated yet
        }

                \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Auth\Events\Login::class,
            \App\Listeners\LogSuccessfulLogin::class
        );
        
        \Illuminate\Support\Facades\Event::listen(function (\Spatie\Backup\Events\BackupWasSuccessful $event) {
            \Illuminate\Support\Facades\Log::info('System Backup completed successfully.');
            activity()->log('System backup completed successfully.');
        });
        
        \Illuminate\Support\Facades\Event::listen(function (\Spatie\Backup\Events\BackupHasFailed $event) {
            \Illuminate\Support\Facades\Log::error('System Backup failed: ' . $event->exception->getMessage());
            activity()->log('System backup failed: ' . $event->exception->getMessage());
        });
    }
}

