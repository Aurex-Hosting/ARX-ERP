<?php

namespace App\Filament\Resources\ApiRequestLogResource\Pages;

use App\Filament\Resources\ApiRequestLogResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Filament\Forms\Components\Select;
use App\Models\ApiRequestLog;
use Illuminate\Support\Carbon;
use ZipArchive;

class ListApiRequestLogs extends ListRecords
{
    protected static string $resource = ApiRequestLogResource::class;

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
                    activity()->causedBy(auth()->user())->log("Exported API Logs ({$data['timeframe']})");
                    
                    $query = ApiRequestLog::query();
                    $now = Carbon::now();
                    
                    switch ($data['timeframe']) {
                        case 'today': $query->whereDate('created_at', $now->today()); break;
                        case '3_days': $query->where('created_at', '>=', $now->copy()->subDays(3)); break;
                        case 'week': $query->where('created_at', '>=', $now->copy()->subWeek()); break;
                        case 'month': $query->where('created_at', '>=', $now->copy()->subMonth()); break;
                        case 'year': $query->where('created_at', '>=', $now->copy()->subYear()); break;
                    }

                    return \App\Filament\Resources\ApiRequestLogResource::generateZip($query->get());
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
                    activity()->causedBy(auth()->user())->log("Mass deleted API Logs ({$data['criteria']})");

                    $query = ApiRequestLog::query();
                    $now = Carbon::now();

                    switch ($data['criteria']) {
                        case 'last_month': $query->where('created_at', '>=', $now->copy()->subMonth()); break;
                        case 'last_year': $query->where('created_at', '>=', $now->copy()->subYear()); break;
                        case 'last_7_days': $query->where('created_at', '>=', $now->copy()->subDays(7)); break;
                        case 'except_last_week': $query->where('created_at', '<', $now->copy()->subWeek()); break;
                        case 'except_last_month': $query->where('created_at', '<', $now->copy()->subMonth()); break;
                        case 'except_last_year': $query->where('created_at', '<', $now->copy()->subYear()); break;
                    }

                    $count = $query->count();
                    $query->delete();
                    \Filament\Notifications\Notification::make()->title("Deleted {$count} logs")->success()->send();
                }),
        ];
    }
}
