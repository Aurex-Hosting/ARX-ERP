<?php

namespace App\Filament\Resources\SystemApplicationResource\Pages;

use App\Filament\Resources\SystemApplicationResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewSystemApplication extends ViewRecord
{
    protected static string $resource = SystemApplicationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }
    
    protected function getFooterWidgets(): array
    {
        return [
            SystemApplicationResource\Widgets\ApiRequestsStats::class,
            SystemApplicationResource\Widgets\ApiRequestsChart::class,
        ];
    }
}
