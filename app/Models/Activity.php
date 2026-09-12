<?php

namespace App\Models;

use Spatie\Activitylog\Models\Activity as SpatieActivity;

class Activity extends SpatieActivity
{
    protected static function booted()
    {
        static::creating(function ($activity) {
            $activity->ip_address = request()->ip();
            $activity->user_agent = request()->userAgent();
        });
    }
}
