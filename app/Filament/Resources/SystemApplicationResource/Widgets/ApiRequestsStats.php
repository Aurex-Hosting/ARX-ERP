<?php

namespace App\Filament\Resources\SystemApplicationResource\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\ApiRequestLog;
use Illuminate\Database\Eloquent\Model;

class ApiRequestsStats extends BaseWidget
{
    public ?Model $record = null;

    protected function getStats(): array
    {
        if (! $this->record) return [];

        $logs = ApiRequestLog::where('system_application_id', $this->record->id);
        
        $total = (clone $logs)->count();
        $rejected = (clone $logs)->where('status_code', '>=', 400)->count();
        
        $mostUsedEndpoint = (clone $logs)
            ->select('endpoint', \DB::raw('count(*) as total'))
            ->groupBy('endpoint')
            ->orderByDesc('total')
            ->first();
            
        $lastRequest = (clone $logs)->latest()->first();

        return [
            Stat::make('Total Requests', $total)
                ->description('Total API calls made')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('primary'),
                
            Stat::make('Rejected Requests', $rejected)
                ->description('Blocked / failed requests')
                ->descriptionIcon('heroicon-m-shield-exclamation')
                ->color($rejected > 0 ? 'danger' : 'success'),
                
            Stat::make('Most Used Endpoint', $mostUsedEndpoint ? '/' . $mostUsedEndpoint->endpoint : 'N/A')
                ->description('Highest traffic route')
                ->descriptionIcon('heroicon-m-bars-3-bottom-left')
                ->color('info'),
                
            Stat::make('Last Request Time', $lastRequest ? $lastRequest->created_at->diffForHumans() : 'Never')
                ->description($lastRequest ? 'IP: ' . $lastRequest->ip_address : 'No requests yet')
                ->descriptionIcon('heroicon-m-clock')
                ->color('gray'),
        ];
    }
}
