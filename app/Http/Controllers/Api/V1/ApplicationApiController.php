<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SystemApplication;
use Illuminate\Http\Request;

class ApplicationApiController extends Controller
{
    public function index()
    {
        return SystemApplication::all();
    }
}
