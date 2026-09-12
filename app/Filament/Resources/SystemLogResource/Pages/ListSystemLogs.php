<?php

namespace App\Filament\Resources\SystemLogResource\Pages;

use App\Filament\Resources\SystemLogResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Filament\Forms\Components\Select;

class ListSystemLogs extends ListRecords
{
    protected static string $resource = SystemLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('export_logs')
                ->label('Export Logs')
                ->icon('heroicon-o-arrow-down-tray')
                ->form([
                    Select::make('timeframe')
                        ->label('Timeframe')
                        ->options([
                            'today' => 'Today',
                            '3_days' => 'Last 3 Days',
                            'week' => 'Last Week',
                            'month' => 'Last Month',
                            'year' => 'Last Year',
                            'all' => 'All Logs',
                        ])
                        ->default('all')
                        ->required(),
                ])
                ->action(function (array $data) {
                    return \App\Services\LogExportService::exportTimeframe($data['timeframe']);
                }),

            Actions\Action::make('mass_delete')
                ->label('Mass Delete')
                ->icon('heroicon-o-trash')
                ->color('danger')
                ->requiresConfirmation()
                ->form([
                    Select::make('criteria')
                        ->label('Deletion Criteria')
                        ->options([
                            'all' => 'Delete All',
                            'last_month' => 'Delete Last Month',
                            'last_year' => 'Delete Last Year',
                            'last_7_days' => 'Delete Last 7 Days',
                            'except_last_week' => 'Delete Except Last Week',
                            'except_last_month' => 'Delete Except Last Month',
                            'except_last_year' => 'Delete Except Last Year',
                        ])
                        ->required(),
                ])
                ->action(function (array $data) {
                    \App\Services\LogExportService::massDelete($data['criteria']);
                    \Filament\Notifications\Notification::make()->title('Logs deleted')->success()->send();
                }),
        ];
    }
}
