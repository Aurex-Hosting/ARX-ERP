<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListUsers extends ListRecords
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('recycle_bin')
                ->label('Recycle Bin')
                ->icon('heroicon-o-trash')
                ->color('danger')
                ->url(fn (): string => UserResource::getUrl('recycle-bin')),
            Actions\CreateAction::make(),
        ];
    }
}
