<?php

use Illuminate\Support\Facades\Route;
use Modules\ExamplePlugin\Http\Controllers\ExamplePluginController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('exampleplugins', ExamplePluginController::class)->names('exampleplugin');
});
