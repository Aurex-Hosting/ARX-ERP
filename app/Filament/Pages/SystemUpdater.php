<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Services\UpdateManager;
use Filament\Actions\Action;
use Filament\Notifications\Notification;

class SystemUpdater extends Page
{
    protected static ?string $navigationIcon = "heroicon-o-arrow-path";
    protected static ?string $navigationGroup = "System Settings";
    protected static ?int $navigationSort = 99;
    protected static string $view = "filament.pages.system-updater";

    public ?string $currentVersion = null;
    public ?array $latestRelease = null;
    public bool $updateAvailable = false;
    public ?string $previousVersion = null;

    public static function canAccess(): bool
    {
        return auth()->user()->can("page_SystemUpdater");
    }

    public function mount(UpdateManager $updater)
    {
        $this->currentVersion = $updater->getCurrentVersion();
        $this->latestRelease = $updater->checkLatestVersion();
        $this->updateAvailable = $updater->isUpdateAvailable();
        $this->previousVersion = $updater->getPreviousVersion();
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make("check_updates")
                ->label("Check for Updates")
                ->icon("heroicon-o-magnifying-glass")
                ->action(function (UpdateManager $updater) {
                    $updater->checkLatestVersion(true); // Force fetch
                    Notification::make()
                        ->title("Checked for updates successfully.")
                        ->success()
                        ->send();
                    $this->redirect(static::getUrl());
                }),

            Action::make("update_now")
                ->label("Update Now")
                ->icon("heroicon-o-cloud-arrow-down")
                ->color("success")
                ->requiresConfirmation()
                ->modalHeading("Confirm System Update")
                ->modalDescription("Are you sure you want to update the system to the latest version? A pre-flight backup will be taken automatically. This process may take a few minutes. Do not close this window.")
                ->visible(fn () => $this->updateAvailable)
                ->action(function (UpdateManager $updater) {
                    Notification::make()
                        ->title("Update Engine Initializing...")
                        ->warning()
                        ->send();
                        
                    $result = $updater->performUpdate();
                    
                    if ($result["success"]) {
                        Notification::make()
                            ->title("Update Successful!")
                            ->body($result["message"])
                            ->success()
                            ->send();
                    } else {
                        Notification::make()
                            ->title("Update Failed")
                            ->body($result["message"])
                            ->danger()
                            ->send();
                    }
                    $this->redirect(static::getUrl());
                }),
            
            Action::make("rollback")
                ->label(fn () => "Rollback to " . $this->previousVersion)
                ->icon("heroicon-o-arrow-u-turn-left")
                ->color("danger")
                ->requiresConfirmation()
                ->modalHeading("Confirm System Rollback")
                ->modalDescription("Are you sure you want to rollback to the previous version? The system will download and install the previous codebase.")
                ->visible(fn () => $this->previousVersion !== null)
                ->action(function (UpdateManager $updater) {
                    Notification::make()->title("Rollback Engine Initializing...")->warning()->send();
                    $result = $updater->performRollback();
                    if ($result["success"]) {
                        Notification::make()->title("Rollback Successful!")->body($result["message"])->success()->send();
                    } else {
                        Notification::make()->title("Rollback Failed")->body($result["message"])->danger()->send();
                    }
                    $this->redirect(static::getUrl());
                }),

        ];
    }
}
