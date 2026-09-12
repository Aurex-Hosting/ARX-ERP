<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $fillable = [
        'name',
        'token',
        'abilities',
        'expires_at',
        'rate_limit',
        'allowed_ips',
        'blocked_ips',
    ];

    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            'allowed_ips' => 'array',
            'blocked_ips' => 'array',
        ]);
    }
}
