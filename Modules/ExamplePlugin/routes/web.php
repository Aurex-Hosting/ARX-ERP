<?php

use Illuminate\Support\Facades\Route;
use Modules\ExamplePlugin\Http\Controllers\ExamplePluginController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('exampleplugins', ExamplePluginController::class)->names('exampleplugin');
});
