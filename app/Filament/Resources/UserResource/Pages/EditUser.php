<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected static string $view = 'filament.resources.user-resource.pages.edit-user';
    
    public function saveAndReload()
    {
        $this->save();
        $this->js('setTimeout(() => window.location.reload(), 500)');
    }


    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make()
                ->hidden(fn (\App\Models\User $record) => auth()->id() === $record->id),
        ];
    }

    protected function getFormActions(): array
    {
        return [];
    }

}