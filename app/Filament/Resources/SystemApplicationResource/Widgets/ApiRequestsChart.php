<?php

namespace App\Filament\Resources\SystemApplicationResource\Widgets;

use Filament\Widgets\ChartWidget;
use App\Models\ApiRequestLog;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ApiRequestsChart extends ChartWidget
{
    protected static ?string $heading = 'API Requests (Last 7 Days)';
    
    public ?Model $record = null;

    protected function getData(): array
    {
        if (! $this->record) return ['datasets' => [], 'labels' => []];

        $data = [];
        $labels = [];
        
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $labels[] = $date->format('M d');
            
            $count = ApiRequestLog::where('system_application_id', $this->record->id)
                ->whereDate('created_at', $date->toDateString())
                ->count();
                
            $data[] = $count;
        }

        return [
            'datasets' => [
                [
                    'label' => 'Requests',
                    'data' => $data,
                    'borderColor' => '#3b82f6',
                    'backgroundColor' => 'rgba(59, 130, 246, 0.2)',
                    'fill' => true,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
