<?php

namespace App\Filament\Resources;

use App\Models\Plugin;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Nwidart\Modules\Facades\Module;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Artisan;
use ZipArchive;
use App\Filament\Resources\ModuleResource\Pages;

class ModuleResource extends Resource
{
    protected static ?string $model = Plugin::class;

    protected static ?string $navigationIcon = 'heroicon-o-puzzle-piece';
    protected static ?string $navigationGroup = 'Integrations';
    protected static ?string $navigationLabel = 'Module Manager';
    protected static ?string $modelLabel = 'Module';
    protected static ?string $slug = 'module-manager';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Module Name')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('description')
                    ->label('Description')
                    ->limit(50),
                Tables\Columns\IconColumn::make('status')
                    ->label('Status')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('danger'),
            ])
            ->actions([
                Tables\Actions\Action::make('toggle')
                    ->label(fn ($record) => $record->status ? 'Disable' : 'Enable')
                    ->color(fn ($record) => $record->status ? 'danger' : 'success')
                    ->icon(fn ($record) => $record->status ? 'heroicon-o-pause' : 'heroicon-o-play')
                    ->action(function ($record) {
                        $module = Module::find($record->name);
                        
                        if ($record->status) {
                            $module->disable();
                            Notification::make()->title('Module Disabled')->success()->send();
                            activity()->causedBy(auth()->user())->log("Disabled Module: {$module->getName()}");
                        } else {
                            $module->enable();
                            Artisan::call('module:migrate', ['module' => $record->name, '--force' => true]);
                            Notification::make()->title('Module Enabled & Migrated')->success()->send();
                            activity()->causedBy(auth()->user())->log("Enabled Module: {$module->getName()}");
                        }
                        return redirect(request()->header('Referer'));
                    }),
                Tables\Actions\Action::make('uninstall')
                    ->label('Uninstall')
                    ->color('danger')
                    ->icon('heroicon-o-trash')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $module = Module::find($record->name);
                        $module->disable();
                        File::deleteDirectory($module->getPath());
                        Notification::make()->title('Module Uninstalled')->success()->send();
                        activity()->causedBy(auth()->user())->log("Uninstalled Module: {$record->name}");
                        return redirect(request()->header('Referer'));
                    }),
            ])
            ->headerActions([
                Tables\Actions\Action::make('upload')
                    ->label('Upload Module (.zip)')
                    ->icon('heroicon-o-arrow-up-tray')
                    ->form([
                        Forms\Components\FileUpload::make('plugin_zip')
                            ->label('Module ZIP File')
                            ->acceptedFileTypes(['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])
                            ->required(),
                    ])
                    ->action(function (array $data) {
                        $zipPath = storage_path('app/public/' . $data['plugin_zip']);
                        $zip = new ZipArchive;
                        if ($zip->open($zipPath) === TRUE) {
                            $extractPath = base_path('Modules');
                            if (!File::exists($extractPath)) {
                                File::makeDirectory($extractPath, 0755, true);
                            }
                            $zip->extractTo($extractPath);
                            $zip->close();
                            File::delete($zipPath);
                            Notification::make()->title('Module Uploaded & Extracted')->success()->send();
                            activity()->causedBy(auth()->user())->log("Uploaded and Extracted Module: {$data['plugin_zip']}");
                        } else {
                            Notification::make()->title('Invalid module ZIP file')->danger()->send();
                        }
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageModules::route('/'),
        ];
    }
}
