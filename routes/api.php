<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\UserApiController;
use App\Http\Controllers\Api\V1\RoleApiController;
use App\Http\Controllers\Api\V1\LogApiController;
use App\Http\Controllers\Api\V1\SettingApiController;
use App\Http\Controllers\Api\V1\ApplicationApiController;

Route::prefix('v1')->middleware(['auth:sanctum', \App\Http\Middleware\LogApiRequests::class])->group(function () {
    
    // Ping (Full Access or any token can ping, handled by middleware)
    Route::get('/ping', function (Request $request) {
        return response()->json([
            'message' => 'Pong! Your API token is valid.',
            'user_id' => $request->user()->id,
            'token_name' => $request->user()->currentAccessToken()->name,
            'token_abilities' => $request->user()->currentAccessToken()->abilities,
        ]);
    })->middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class);

    // Users API
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':users:read')->group(function () {
        Route::get('/users', [UserApiController::class, 'index']);
        Route::get('/users/{user}', [UserApiController::class, 'show']);
    });
    
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':users:write')->group(function () {
        Route::post('/users', [UserApiController::class, 'store']);
        Route::put('/users/{user}', [UserApiController::class, 'update']);
    });
    
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':users:delete')->group(function () {
        Route::delete('/users/{user}', [UserApiController::class, 'destroy']);
    });

    // Roles & Permissions API
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':roles:read')->group(function () {
        Route::get('/roles', [RoleApiController::class, 'index']);
        Route::get('/roles/{role}', [RoleApiController::class, 'show']);
    });
    
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':roles:write')->group(function () {
        Route::post('/roles', [RoleApiController::class, 'store']);
        Route::put('/roles/{role}', [RoleApiController::class, 'update']);
        Route::delete('/roles/{role}', [RoleApiController::class, 'destroy']);
    });

    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':permissions:read')->group(function () {
        Route::get('/permissions', [RoleApiController::class, 'permissions']);
    });

    // Logs API
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':logs:read')->group(function () {
        Route::get('/logs/activity', [LogApiController::class, 'activity']);
        Route::get('/logs/logins', [LogApiController::class, 'logins']);
    });

    // Settings API
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':settings:read')->group(function () {
        Route::get('/settings/mail', [SettingApiController::class, 'getMail']);
        Route::get('/settings/customization', [SettingApiController::class, 'getCustomization']);
    });
    
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':settings:write')->group(function () {
        Route::put('/settings/mail', [SettingApiController::class, 'updateMail']);
        Route::put('/settings/customization', [SettingApiController::class, 'updateCustomization']);
    });

    // Applications API
    Route::middleware(\App\Http\Middleware\EnsureTokenHasAbilityAndRateLimit::class.':applications:read')->group(function () {
        Route::get('/applications', [ApplicationApiController::class, 'index']);
    });
});

