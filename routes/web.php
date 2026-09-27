<?php

declare(strict_types=1);

use App\Core\Services\ThemeManager;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| ARX-ERP Web Routes & Theme Engine Serving
|--------------------------------------------------------------------------
|
| Dynamically serves the active Dashboard theme on '/' and the active
| Admin theme on '/admin'.
|
*/

// 1. Admin Theme Asset Serving
Route::get('/admin/assets/{file}', function (string $file) {
    $themeManager = app(ThemeManager::class);
    $activeSlug = $themeManager->getActiveThemeSlug('admin');
    $filePath = base_path("themes/admin/{$activeSlug}/dist/assets/{$file}");

    if (! File::exists($filePath)) {
        abort(404);
    }

    $mimeType = File::mimeType($filePath);
    if (str_ends_with($file, '.css')) {
        $mimeType = 'text/css';
    } elseif (str_ends_with($file, '.js')) {
        $mimeType = 'application/javascript';
    }

    return response(File::get($filePath), 200, ['Content-Type' => $mimeType]);
})->where('file', '.*');

// 2. Dashboard Theme Asset Serving
Route::get('/assets/{file}', function (string $file) {
    $themeManager = app(ThemeManager::class);
    $activeSlug = $themeManager->getActiveThemeSlug('dashboard');
    $filePath = base_path("themes/dashboard/{$activeSlug}/dist/assets/{$file}");

    if (! File::exists($filePath)) {
        abort(404);
    }

    $mimeType = File::mimeType($filePath);
    if (str_ends_with($file, '.css')) {
        $mimeType = 'text/css';
    } elseif (str_ends_with($file, '.js')) {
        $mimeType = 'application/javascript';
    }

    return response(File::get($filePath), 200, ['Content-Type' => $mimeType]);
})->where('file', '.*');

// 3. Admin Theme Entry (/admin and /admin/*)
Route::get('/admin/{any?}', function (?string $any = null) {
    $themeManager = app(ThemeManager::class);
    $activeSlug = $themeManager->getActiveThemeSlug('admin');
    $entryPath = base_path("themes/admin/{$activeSlug}/dist/index.html");

    if (File::exists($entryPath)) {
        return Response::file($entryPath, ['Content-Type' => 'text/html']);
    }

    return response('Admin theme not built. Please run npm run build in themes/admin/default.', 404);
})->where('any', '^(?!api).*$');

// 4. Dashboard Theme Entry (/ and catch-all for SPA routing)
Route::get('/{any?}', function (?string $any = null) {
    $themeManager = app(ThemeManager::class);
    $activeSlug = $themeManager->getActiveThemeSlug('dashboard');
    $entryPath = base_path("themes/dashboard/{$activeSlug}/dist/index.html");

    if (File::exists($entryPath)) {
        return Response::file($entryPath, ['Content-Type' => 'text/html']);
    }

    return response('Dashboard theme not built. Please run npm run build in themes/dashboard/default.', 404);
})->where('any', '^(?!api|up).*$');
