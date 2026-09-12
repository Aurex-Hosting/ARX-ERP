<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Sushi\Sushi;
use Nwidart\Modules\Facades\Module;

class Plugin extends Model
{
    use Sushi;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    public function getRows()
    {
        return collect(Module::all())->map(function ($module) {
            return [
                'id' => $module->getName(),
                'name' => $module->getName(),
                'description' => $module->getDescription() ?? 'No description provided.',
                'version' => $module->get('version', '1.0.0'),
                'dependencies' => json_encode($module->get('requires', [])),
                'status' => $module->isEnabled() ? 1 : 0,
            ];
        })->values()->toArray();
    }

    protected function casts(): array
    {
        return [
            'dependencies' => 'array',
            'status' => 'boolean',
        ];
    }
}



