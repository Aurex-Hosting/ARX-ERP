<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Sushi\Sushi;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;

class BackupFile extends Model
{
    use Sushi;

    public function sushiShouldCache()
    {
        return false;
    }

    public $incrementing = false;
    protected $keyType = 'string';

    protected $schema = [
        'id' => 'string',
        'name' => 'string',
        'path' => 'string',
        'type' => 'string', // 'auto' or 'manual'
        'size' => 'integer',
        'created_at' => 'datetime',
    ];

    public function getRows()
    {
        $rows = [];
        
        // Auto Backups
        if (Storage::disk('backups_auto')->exists('')) {
            $files = Storage::disk('backups_auto')->allFiles();
            foreach ($files as $file) {
                if (!str_ends_with($file, '.zip')) continue;
                $rows[] = [
                    'id' => 'auto_' . $file,
                    'name' => $file,
                    'path' => 'auto/' . $file,
                    'type' => 'auto',
                    'size' => Storage::disk('backups_auto')->size($file),
                    'created_at' => Carbon::createFromTimestamp(Storage::disk('backups_auto')->lastModified($file))->toDateTimeString(),
                ];
            }
        }

        // Manual Backups
        if (Storage::disk('backups_manual')->exists('')) {
            $files = Storage::disk('backups_manual')->allFiles();
            foreach ($files as $file) {
                if (!str_ends_with($file, '.zip')) continue;
                $rows[] = [
                    'id' => 'manual_' . $file,
                    'name' => $file,
                    'path' => 'manual/' . $file,
                    'type' => 'manual',
                    'size' => Storage::disk('backups_manual')->size($file),
                    'created_at' => Carbon::createFromTimestamp(Storage::disk('backups_manual')->lastModified($file))->toDateTimeString(),
                ];
            }
        }

        return $rows;
    }

    public function deleteFile()
    {
        if ($this->type === 'auto') {
            Storage::disk('backups_auto')->delete($this->name);
        } else {
            Storage::disk('backups_manual')->delete($this->name);
        }
    }
}


