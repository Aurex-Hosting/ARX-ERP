<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ApiRequestLogResource\Pages;
use App\Models\ApiRequestLog;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use ZipArchive;

class ApiRequestLogResource extends Resource
{
    protected static ?string $model = ApiRequestLog::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-magnifying-glass';
    
    protected static ?string $navigationGroup = 'Integrations';
    
    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('system_application_id')
                    ->relationship('systemApplication', 'name')
                    ->label('Application Key'),
                Forms\Components\TextInput::make('endpoint')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('method')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('ip_address')
                    ->required()
                    ->maxLength(45),
                Forms\Components\TextInput::make('status_code')
                    ->required()
                    ->numeric(),
                Forms\Components\Textarea::make('status_message')
                    ->columnSpanFull(),
                Forms\Components\Textarea::make('request_payload')
                    ->columnSpanFull(),
                Forms\Components\Textarea::make('response_payload')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: false),
                Tables\Columns\TextColumn::make('systemApplication.name')
                    ->label('Key Name')
                    ->searchable()
                    ->sortable()
                    ->badge()
                    ->color('primary'),
                Tables\Columns\TextColumn::make('endpoint')
                    ->searchable(),
                Tables\Columns\TextColumn::make('method')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'GET' => 'success',
                        'POST' => 'warning',
                        'PUT', 'PATCH' => 'info',
                        'DELETE' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('status_code')
                    ->badge()
                    ->color(fn (string $state): string => match (true) {
                        $state >= 200 && $state < 300 => 'success',
                        $state >= 400 && $state < 500 => 'warning',
                        $state >= 500 => 'danger',
                        default => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('ip_address')
                    ->searchable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('system_application_id')
                    ->relationship('systemApplication', 'name')
                    ->label('Filter by Key'),
                Tables\Filters\SelectFilter::make('method')
                    ->options([
                        'GET' => 'GET',
                        'POST' => 'POST',
                        'PUT' => 'PUT',
                        'DELETE' => 'DELETE',
                    ]),
                Tables\Filters\SelectFilter::make('status_code')
                    ->options([
                        '200' => '200 OK',
                        '201' => '201 Created',
                        '400' => '400 Bad Request',
                        '401' => '401 Unauthorized',
                        '403' => '403 Forbidden',
                        '404' => '404 Not Found',
                        '500' => '500 Server Error',
                    ])
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->after(function () {
                        activity()->causedBy(auth()->user())->log("Deleted a single API request log.");
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->after(function (\Illuminate\Database\Eloquent\Collection $records) {
                            activity()->causedBy(auth()->user())->log("Deleted {$records->count()} API request logs.");
                        }),
                    Tables\Actions\BulkAction::make('export_selected')
                        ->label('Export Selected')
                        ->icon('heroicon-o-arrow-down-tray')
                        ->action(function (\Illuminate\Database\Eloquent\Collection $records) {
                            activity()->causedBy(auth()->user())->log("Exported {$records->count()} API request logs.");
                            return self::generateZip($records);
                        })
                        ->deselectRecordsAfterCompletion(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function generateZip($logs)
    {
        if ($logs->isEmpty()) {
            \Filament\Notifications\Notification::make()->title('No logs found')->warning()->send();
            return;
        }

        $grouped = $logs->groupBy(function ($log) {
            return Carbon::parse($log->created_at)->format('Y-F');
        });

        $zipPath = storage_path('app/api_temp_logs_' . time() . '.zip');
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            foreach ($grouped as $month => $monthLogs) {
                $content = "";
                foreach ($monthLogs as $log) {
                    $keyName = $log->systemApplication ? $log->systemApplication->name : 'Unknown Key';
                    $content .= "[{$log->created_at}] - {$log->method} {$log->endpoint} (Status: {$log->status_code})\n";
                    $content .= "API Key: {$keyName} | IP: {$log->ip_address}\n";
                    $content .= "Request Payload:\n" . ($log->request_payload ?: 'None') . "\n";
                    $content .= "Response Payload:\n" . ($log->response_payload ?: 'None') . "\n";
                    $content .= str_repeat("-", 60) . "\n\n";
                }
                $zip->addFromString($month . '.log', $content);
            }
            $zip->close();
        }

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListApiRequestLogs::route('/'),
            'view' => Pages\ViewApiRequestLog::route('/{record}'),
        ];
    }
}
