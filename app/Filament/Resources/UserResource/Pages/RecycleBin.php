<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Database\Eloquent\Builder;
use Filament\Actions;

class RecycleBin extends ListRecords
{
    protected static string $resource = UserResource::class;
    
    protected static ?string $title = 'Recycle Bin';

    protected function getTableQuery(): Builder
    {
        return parent::getTableQuery()->onlyTrashed();
    }
    
    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('back')
                ->label('Back to Users')
                ->icon('heroicon-o-arrow-left')
                ->url(fn (): string => UserResource::getUrl('index')),
        ];
    }
}
