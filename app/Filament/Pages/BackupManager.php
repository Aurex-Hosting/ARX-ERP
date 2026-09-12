<?php

namespace App\Filament\Pages;

use App\Settings\BackupSettings;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Pages\SettingsPage;
use App\Filament\Widgets\BackupTableWidget;
use App\Filament\Widgets\AutoBackupTableWidget;
use Illuminate\Support\Facades\Artisan;
use Filament\Notifications\Notification;
use Filament\Actions\Action;
use Illuminate\Support\Facades\Storage;
use Spatie\LaravelSettings\Settings;

class BackupManager extends BaseSettingsPage
{
    protected static ?string $navigationIcon = 'heroicon-o-cloud-arrow-up';
    protected static ?string $navigationGroup = 'System Settings';
    protected static ?int $navigationSort = 5;
    
    protected static string $settings = BackupSettings::class;
    
    public static function canAccess(): bool
    {
        return auth()->user()->can('page_BackupManager');
    }
    
    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Auto Backup Schedule')
                    ->description(function () {
                        $desc = 'Configure automated daily backups. Keeps a rolling history of exactly 2 backups.';
                        $lastBackup = 'Never';
                        if (\Illuminate\Support\Facades\Storage::disk('backups_auto')->exists('')) {
                            $files = \Illuminate\Support\Facades\Storage::disk('backups_auto')->allFiles();
                            $zipFiles = array_filter($files, fn($f) => str_ends_with($f, '.zip'));
                            if (!empty($zipFiles)) {
                                $latest = 0;
                                foreach ($zipFiles as $f) {
                                    $time = \Illuminate\Support\Facades\Storage::disk('backups_auto')->lastModified($f);
                                    if ($time > $latest) $latest = $time;
                                }
                                // Use the application's timezone so it matches what the user expects
                                $lastBackup = \Illuminate\Support\Carbon::createFromTimestamp($latest)
                                    ->timezone(config('app.timezone'))
                                    ->format('Y-m-d h:i:s A');
                            }
                        }
                        return new \Illuminate\Support\HtmlString($desc . '<br><span style="color: rgb(var(--primary-600)); font-weight: 600;">Last auto backup created @ ' . $lastBackup . '</span>');
                    })
                    ->schema([
                        Forms\Components\Toggle::make('auto_backup_enabled')
                            ->label('Enable Automated Backups')
                            ->live()
                            ->default(true),
                        Forms\Components\TimePicker::make('auto_backup_time')
                            ->label('Backup Time')
                            ->seconds(false)
                            ->live()
                            ->default('02:00'),
                    ])
                    ->columns(2),
            ])
            ->disabled(fn () => !auth()->user()->can('update_auto_backups_settings'));
    }


    protected function getHeaderActions(): array
    {
        return [
            Action::make('create_manual_backup')
                ->label('Create Manual Backup')
                ->icon('heroicon-o-arrow-down-on-square-stack')
                ->color('primary')
                ->visible(fn () => auth()->user()->can('create_manual_backups'))
                ->requiresConfirmation()
                ->action(function () {
                    // Check limit
                    if (Storage::disk('backups_manual')->exists('')) {
                        $files = Storage::disk('backups_manual')->allFiles();
                        $zipFiles = array_filter($files, fn($f) => str_ends_with($f, '.zip'));
                        if (count($zipFiles) >= 3) {
                            // Delete oldest
                            usort($zipFiles, function($a, $b) {
                                return Storage::disk('backups_manual')->lastModified($a) <=> Storage::disk('backups_manual')->lastModified($b);
                            });
                            Storage::disk('backups_manual')->delete($zipFiles[0]);
                        }
                    }

                    // Run Backup dynamically pointing to manual disk
                    
                    
                    
                    try {
                        Artisan::call('backup:run', ['--only-to-disk' => 'backups_manual']);
                        Notification::make()->title('Backup generated successfully!')->success()->send();
                        activity()->causedBy(auth()->user())->log('Created a manual system backup');
                        $this->js('window.location.reload()');
                    } catch (\Exception $e) {
                        Notification::make()->title('Backup failed')->body($e->getMessage())->danger()->send();
                        activity()->causedBy(auth()->user())->log('Manual system backup failed: ' . $e->getMessage());
                    }
                }),
        ];
    }

    protected function getFooterWidgets(): array
    {
        return [
            BackupTableWidget::class,
            AutoBackupTableWidget::class,
        ];
    }
}



