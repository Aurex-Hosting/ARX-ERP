<?php

namespace App\Filament\Pages\Auth;

use Filament\Pages\Auth\Login as BaseLogin;
use Illuminate\Contracts\View\View;
use Filament\Http\Responses\Auth\Contracts\LoginResponse;
use Illuminate\Validation\ValidationException;

class CustomLogin extends BaseLogin
{
    public function authenticate(): ?LoginResponse
    {
        // Artificial delay (1 second) to enforce loading animation visibility
        usleep(1000000);

        $data = $this->form->getState();
        $user = \App\Models\User::where('email', $data['email'])->first();

        if ($user && $user->is_locked) {
            $this->dispatch('login-failed');
            throw ValidationException::withMessages([
                'data.email' => 'This account is locked. Please contact an administrator.',
            ]);
        }

        try {
            // Check credentials first before fully authenticating
            if (! $user) {
                throw ValidationException::withMessages([
                    'data.email' => 'DEBUG: User not found! Email searched: ' . $data['email'],
                ]);
            }
            if (! \Illuminate\Support\Facades\Hash::check($data['password'], $user->password)) {
                throw ValidationException::withMessages([
                    'data.email' => 'DEBUG: Hash check failed! DB Hash starts with: ' . substr($user->password, 0, 15),
                ]);
            }

            // Check if 2FA is enabled
            if ($user->two_factor_confirmed_at) {
                // Store in session (still useful for state or if page reloads)
                session()->put('login.id', $user->id);
                session()->put('login.remember', $data['remember'] ?? false);
                session()->put('url.intended', \Filament\Facades\Filament::getUrl());

                // Reset failed attempts
                $user->update(['failed_login_attempts' => 0]);

                // Notification: Prompted
                \Filament\Notifications\Notification::make()
                    ->title('2FA Prompted')
                    ->body('A login attempt from IP ' . request()->ip() . ' was challenged for Two-Factor Authentication.')
                    ->info()
                    ->sendToDatabase($user);

                $this->dispatch('two-factor-prompt');
                return null;
            }

            // Run parent authentication to validate and login the user normally
            $response = parent::authenticate();
            
            // Reset attempts on success
            if ($user) {
                $user->update(['failed_login_attempts' => 0]);
            }

            // Get the intended URL (or fallback to dashboard)
            $url = session()->pull('url.intended', \Filament\Facades\Filament::getUrl());
            
            // Dispatch success event with the URL
            $this->dispatch('login-success', url: $url);
            
            // Return null so Livewire doesn't immediately redirect, allowing the animation to play
            return null;
        } catch (ValidationException $e) {
            $this->dispatch('login-failed');
            
            // Check if it's an invalid credentials error
            if ($user && isset($e->validator->errors()->messages()['data.email'])) {
                $user->increment('failed_login_attempts');
                if ($user->failed_login_attempts >= 3) {
                    $user->update(['is_locked' => true]);
                    throw ValidationException::withMessages([
                        'data.email' => 'Your account has been locked due to too many failed login attempts.',
                    ]);
                }
            }
            
            throw $e;
        } catch (\Exception $e) {
            $this->dispatch('login-failed');
            throw $e;
        }
    }

    public function verifyTwoFactor($code, $useBackup)
    {
        // Artificial delay (1.5 seconds) to enforce loading animation visibility
        usleep(1500000);

        $userId = session('login.id');
        if (!$userId) {
            $this->dispatch('two-factor-failed');
            return;
        }

        $user = \App\Models\User::find($userId);
        if (!$user) {
            $this->dispatch('two-factor-failed');
            return;
        }

        if ($useBackup) {
            $codes = json_decode(decrypt($user->two_factor_recovery_codes), true) ?: [];
            if (in_array($code, $codes)) {
                $codes = array_filter($codes, fn($c) => $c !== $code);
                $user->update([
                    "two_factor_recovery_codes" => encrypt(json_encode(array_values($codes)))
                ]);
                $this->completeLogin($user, "backup recovery code");
                return;
            } else {
                $this->dispatch('two-factor-failed');
                return;
            }
        } else {
            $google2fa = new \PragmaRX\Google2FA\Google2FA();
            $secret = decrypt($user->two_factor_secret);
            
            if ($google2fa->verifyKey($secret, $code)) {
                $this->completeLogin($user, "TOTP authenticator app");
                return;
            } else {
                $this->dispatch('two-factor-failed');
                return;
            }
        }
    }

    protected function completeLogin($user, $method)
    {
        session()->flash('login_method', $method);
        auth()->login($user, session("login.remember", false));
        session()->forget(["login.id", "login.remember"]);

        $url = session()->pull("url.intended", \Filament\Facades\Filament::getUrl());
        $this->dispatch('two-factor-success', url: $url);
    }

    public function render(): View
    {
        return view('filament.pages.auth.custom-login')
            ->layout('components.layouts.empty');
    }
}
