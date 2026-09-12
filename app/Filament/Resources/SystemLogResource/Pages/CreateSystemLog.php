<?php

namespace App\Filament\Resources\SystemLogResource\Pages;

use App\Filament\Resources\SystemLogResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateSystemLog extends CreateRecord
{
    protected static string $resource = SystemLogResource::class;
}
