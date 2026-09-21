<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Theme extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'identifier',
        'version',
        'is_active',
        'options',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'options' => 'array',
    ];
}
