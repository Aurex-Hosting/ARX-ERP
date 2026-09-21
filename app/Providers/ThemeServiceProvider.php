<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Log;
use Filament\Support\Facades\FilamentView;
use Filament\View\PanelsRenderHook;
use App\Models\Theme;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;

class ThemeServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        try {
            if (Schema::hasTable('themes')) {
                $activeTheme = Cache::remember('active_theme', 3600, function () {
                    return Theme::where('is_active', true)->first();
                });

                if ($activeTheme) {
                    $themePath = base_path('themes/' . $activeTheme->identifier);
                    
                    if (is_dir($themePath . '/views')) {
                        // Register theme views to override filament or default views if needed
                        View::addNamespace('theme', $themePath . '/views');
                    }

                    // Register dynamic CSS styles
                    FilamentView::registerRenderHook(
                        PanelsRenderHook::HEAD_END,
                        fn (): string => Blade::render('<x-theme-dynamic-styles />')
                    );
                }
            }
        } catch (\Exception $e) {
            Log::error('ThemeServiceProvider Error: ' . $e->getMessage());
        }
    }
}
