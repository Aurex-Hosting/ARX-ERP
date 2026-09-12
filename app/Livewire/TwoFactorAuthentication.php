<?php

namespace App\Livewire;

use Livewire\Component;
use PragmaRX\Google2FA\Google2FA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Filament\Notifications\Notification;
use Illuminate\Support\Str;

class TwoFactorAuthentication extends Component
{
    public $state = "idle";
    public $secret;
    public $qrCodeSvg;
    public $confirmationCode;
    public $recoveryCodes = [];
    public $hasDownloadedCodes = false;

    public function mount()
    {
        if (auth()->user()->two_factor_confirmed_at) {
            $this->state = "enabled";
        }
    }

    public function enable2FA()
    {
        $google2fa = new Google2FA();
        $this->secret = $google2fa->generateSecretKey();
        
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config("app.name"),
            auth()->user()->email,
            $this->secret
        );

        $renderer = new ImageRenderer(
            new RendererStyle(256),
            new SvgImageBackEnd()
        );
        $writer = new Writer($renderer);
        $this->qrCodeSvg = $writer->writeString($qrCodeUrl);

        $this->state = "confirming";
    }

    public function cancelEnable()
    {
        $this->state = "idle";
        $this->secret = null;
        $this->qrCodeSvg = null;
        $this->confirmationCode = null;
    }

    public function confirm2FA()
    {
        $this->validate([
            "confirmationCode" => "required|string|size:6",
        ]);

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($this->secret, $this->confirmationCode);

        if (!$valid) {
            $this->addError("confirmationCode", "The code provided is invalid.");
            return;
        }

        $this->recoveryCodes = $this->generateRecoveryCodes();

        auth()->user()->update([
            "two_factor_secret" => encrypt($this->secret),
            "two_factor_recovery_codes" => encrypt(json_encode($this->recoveryCodes)),
            "two_factor_confirmed_at" => now(),
        ]);

        $this->state = "showing_recovery_codes";
        $this->secret = null;
        $this->qrCodeSvg = null;
        $this->confirmationCode = null;
        $this->hasDownloadedCodes = false;

        Notification::make()
            ->title("Two-Factor Authentication Enabled")
            ->success()
            ->send();
    }

    public $verificationCode;

    public function disable2FA()
    {
        $this->state = "verifying_disable";
        $this->verificationCode = null;
    }

    public function confirmDisable2FA()
    {
        $this->validate(["verificationCode" => "required|string|size:6"]);
        
        $google2fa = new Google2FA();
        if (!$google2fa->verifyKey(decrypt(auth()->user()->two_factor_secret), $this->verificationCode)) {
            $this->addError("verificationCode", "The code provided is invalid.");
            return;
        }

        auth()->user()->update([
            "two_factor_secret" => null,
            "two_factor_recovery_codes" => null,
            "two_factor_confirmed_at" => null,
        ]);

        $this->state = "idle";
        $this->verificationCode = null;

        Notification::make()
            ->title("Two-Factor Authentication Disabled")
            ->warning()
            ->send();
    }

    public function hideRecoveryCodes()
    {
        $this->state = "enabled";
        $this->recoveryCodes = [];
    }

    public function regenerateRecoveryCodes()
    {
        $this->state = "verifying_regenerate";
        $this->verificationCode = null;
    }

    public function confirmRegenerateRecoveryCodes()
    {
        $this->validate(["verificationCode" => "required|string|size:6"]);
        
        $google2fa = new Google2FA();
        if (!$google2fa->verifyKey(decrypt(auth()->user()->two_factor_secret), $this->verificationCode)) {
            $this->addError("verificationCode", "The code provided is invalid.");
            return;
        }

        $this->recoveryCodes = $this->generateRecoveryCodes();
        
        auth()->user()->update([
            "two_factor_recovery_codes" => encrypt(json_encode($this->recoveryCodes)),
        ]);

        $this->state = "showing_recovery_codes";
        $this->hasDownloadedCodes = false;
        $this->verificationCode = null;

        Notification::make()
            ->title("Recovery Codes Regenerated")
            ->success()
            ->send();
    }

    public function cancelVerification()
    {
        $this->state = "enabled";
        $this->verificationCode = null;
    }

    public function downloadRecoveryCodes()
    {
        $this->hasDownloadedCodes = true;

        $content = "Two-Factor Authentication Recovery Codes\n\n";
        $content .= "Store these codes in a secure place. They can be used to recover access to your account if you lose your authenticator device.\n\n";
        
        foreach ($this->recoveryCodes as $code) {
            $content .= $code . "\n";
        }

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, 'recovery-codes.txt');
    }

    protected function generateRecoveryCodes()
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = Str::random(10) . "-" . Str::random(10);
        }
        return $codes;
    }

    public function render()
    {
        return view("livewire.two-factor-authentication");
    }
}
