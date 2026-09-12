<?php
namespace App\Filament\Resources\SystemApplicationResource\Pages;
use App\Filament\Resources\SystemApplicationResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
class EditSystemApplication extends EditRecord
{
    protected static string $resource = SystemApplicationResource::class;
    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
