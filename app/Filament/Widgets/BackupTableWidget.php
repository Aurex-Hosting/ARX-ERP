<?php

namespace App\Filament\Widgets;

use App\Models\BackupFile;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupTableWidget extends BaseWidget
{
    protected static ?string $heading = 'Manual Backups';
    public string $backupType = 'manual';
    
    protected int | string | array $columnSpan = 'full';

    public static function canView(): bool
    {
        $isAuto = static::class === AutoBackupTableWidget::class;
        return auth()->user()->can($isAuto ? 'view_auto_backups' : 'view_manual_backups');
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(
                BackupFile::query()->where('type', $this->backupType)
            )
            ->heading($this->backupType === 'auto' ? 'Auto Backups (Rolling 2)' : 'Manual Backups (Limit 3)')
            ->description($this->backupType === 'auto' ? 'Automated scheduled backups.' : 'Backups generated manually by administrators.')
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('File Name')
                    ->icon('heroicon-o-archive-box')
                    ->searchable(),
                Tables\Columns\TextColumn::make('size')
                    ->label('Size')
                    ->formatStateUsing(fn ($state) => number_format($state / 1048576, 2) . ' MB'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\Action::make('download')
                    ->icon('heroicon-o-arrow-down-tray')
                    ->visible(fn () => auth()->user()->can($this->backupType === 'auto' ? 'download_auto_backups' : 'download_manual_backups'))
                    ->action(function (BackupFile $record) {
                        $disk = $record->type === 'auto' ? 'backups_auto' : 'backups_manual';
                        return Storage::disk($disk)->download($record->name);
                    }),
                Tables\Actions\Action::make('delete')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->visible(fn () => auth()->user()->can($this->backupType === 'auto' ? 'delete_auto_backups' : 'delete_manual_backups'))
                    ->requiresConfirmation()
                    ->action(function (BackupFile $record) {
                        $record->deleteFile();
                        \Filament\Notifications\Notification::make()->title('Backup deleted')->success()->send();
                    }),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
