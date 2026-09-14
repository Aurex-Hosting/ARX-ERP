<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Services\LicenseManager;
use App\Services\UpdateManager;
use Filament\Actions\Action;
use Filament\Notifications\Notification;

class LicenseStatus extends Page
{
    protected static ?string $navigationIcon = "heroicon-o-shield-check";
    protected static ?string $navigationGroup = "System Settings";
    protected static ?int $navigationSort = 98;
    protected static string $view = "filament.pages.license-status";
    protected static ?string $title = "License Information";

    public ?array $licenseData = null;
    public ?string $installationId = null;
    public ?string $licenseKey = null;

    public static function canAccess(): bool
    {
        return auth()->user()->can("view_license_status");
    }

    public function mount(LicenseManager $licenseManager, UpdateManager $updateManager)
    {
        $this->licenseData = $licenseManager->getLicenseStatus();
        $this->installationId = $updateManager->getInstallationId();
        
        $key = env("PRODUCT_LICENSE_KEY");
        if ($key) {
            $this->licenseKey = substr($key, 0, 4) . str_repeat("*", strlen($key) - 8) . substr($key, -4);
        } else {
            $this->licenseKey = "Not Set";
        }
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make("revalidate")
                ->label("Re-Validate License")
                ->icon("heroicon-o-arrow-path")
                ->action(function (LicenseManager $licenseManager, UpdateManager $updateManager) {
                    $this->licenseData = $licenseManager->getLicenseStatus(true);
                    $this->installationId = $updateManager->getInstallationId();
                    
                    if (isset($this->licenseData["success"]) && $this->licenseData["success"] === true) {
                        Notification::make()->title("License is Valid")->success()->send();
                    } else {
                        Notification::make()->title("Validation Failed")->body($this->licenseData["error"] ?? "Unknown error")->danger()->send();
                    }
                }),
            Action::make("renew")
                ->label("Renew License")
                ->icon("heroicon-o-credit-card")
                ->color("primary")
                ->url("https://license.magneticx.store")
                ->openUrlInNewTab()
        ];
    }
}
