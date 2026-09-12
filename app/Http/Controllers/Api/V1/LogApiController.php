<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Spatie\Activitylog\Models\Activity;
use App\Models\LoginHistory;
use Illuminate\Http\Request;

class LogApiController extends Controller
{
    public function activity()
    {
        return Activity::with('causer')->latest()->paginate(25);
    }

    public function logins()
    {
        return LoginHistory::with('user')->latest()->paginate(25);
    }
}
