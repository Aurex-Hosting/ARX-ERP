<?php
namespace App\Filament\Resources\SystemApplicationResource\Pages;
use App\Filament\Resources\SystemApplicationResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
class ListSystemApplications extends ListRecords
{
    protected static string $resource = SystemApplicationResource::class;
    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
