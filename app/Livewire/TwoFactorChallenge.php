<?php

namespace App\Livewire;

use Livewire\Component;
use PragmaRX\Google2FA\Google2FA;
use App\Models\User;
use Filament\Notifications\Notification;

class TwoFactorChallenge extends Component
{
    public $code;
    public $recoveryCode;
    public $useRecoveryCode = false;

    public function mount()
    {
        if (!session()->has("login.id")) {
            return redirect()->route("filament.admin.auth.login");
        }
    }

    public function toggleRecovery()
    {
        $this->useRecoveryCode = !$this->useRecoveryCode;
    }

    public function verify()
    {
        $userId = session("login.id");
        $user = User::findOrFail($userId);

        if ($this->useRecoveryCode) {
            $this->validate(["recoveryCode" => "required|string"]);
            
            $codes = json_decode(decrypt($user->two_factor_recovery_codes), true) ?: [];
            
            if (in_array($this->recoveryCode, $codes)) {
                // Remove the used code
                $codes = array_filter($codes, fn($code) => $code !== $this->recoveryCode);
                $user->update([
                    "two_factor_recovery_codes" => encrypt(json_encode(array_values($codes)))
                ]);
                
                $this->loginUser($user, "backup recovery code");
                return;
            } else {
                $this->addError("recoveryCode", "The recovery code is invalid.");
                return;
            }
        } else {
            $this->validate(["code" => "required|string|size:6"]);
            
            $google2fa = new Google2FA();
            $secret = decrypt($user->two_factor_secret);
            
            if ($google2fa->verifyKey($secret, $this->code)) {
                $this->loginUser($user, "TOTP authenticator app");
                return;
            } else {
                $this->addError("code", "The authentication code is invalid.");
                return;
            }
        }
    }

    protected function loginUser($user, $method)
    {
        auth()->login($user, session("login.remember", false));
        session()->forget(["login.id", "login.remember"]);

        Notification::make()
            ->title("Login Successful")
            ->body("You successfully logged in using a " . $method . ".")
            ->success()
            ->sendToDatabase($user);

        return redirect()->to(session()->pull("url.intended", \Filament\Facades\Filament::getUrl()));
    }

    public function render()
    {
        return view("livewire.two-factor-challenge")->layout("components.layouts.empty");
    }
}
