<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class LogSuccessfulLogin
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(Login $event): void
    {
        \App\Models\LoginHistory::create([
            'user_id' => $event->user->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        $body = 'A new login was detected from IP: ' . request()->ip();
        if (session()->has('login_method')) {
            $body .= ' using a ' . session('login_method') . '.';
        }

        \Filament\Notifications\Notification::make()
            ->title('New Login Detected')
            ->body($body)
            ->info()
            ->actions([
                \Filament\Notifications\Actions\Action::make('view_history')
                    ->label('View History')
                    ->url('/admin/manage-profile?tab=notifications')
                    ->button()
                    ->markAsRead(),
            ])
            ->sendToDatabase($event->user);
    }
}
