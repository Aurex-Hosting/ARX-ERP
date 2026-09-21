<?php

namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class DashboardPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        $panel
            ->default()
            ->id('dashboard')
            ->path('dashboard')
            ->login(\App\Filament\Pages\Auth\CustomLogin::class)
            ->colors([
                'primary' => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_primary), \Filament\Support\Colors\Color::Amber, false),
                'secondary' => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_secondary), \Filament\Support\Colors\Color::Gray, false),
                'info' => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_accent), \Filament\Support\Colors\Color::Blue, false),
                'gray' => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_background), \Filament\Support\Colors\Color::Zinc, false),
            ])
            ->renderHook(\Filament\View\PanelsRenderHook::BODY_END, fn (): string => view('components.water-splash'))
            ->renderHook(\Filament\View\PanelsRenderHook::HEAD_START, fn (): string => view('components.custom-colors'))
            ->renderHook(\Filament\View\PanelsRenderHook::TOPBAR_END, fn (): string => \Illuminate\Support\Facades\Blade::render('@include(\'filament.topbar-profile\')'))
            ->favicon(rescue(fn () => app(\App\Settings\CustomizationSettings::class)->brand_favicon ? asset('storage/'.app(\App\Settings\CustomizationSettings::class)->brand_favicon) : asset('images/Customizations/favicon.png'), asset('images/Customizations/favicon.png'), false))
            ->brandName(fn () => rescue(fn () => app(\App\Settings\CustomizationSettings::class)->brand_name, "ERP System", false) ?: config("app.name"))
            ->brandLogo(fn () => view('filament.components.brand'))
            ->navigationItems([
                \Filament\Navigation\NavigationItem::make('Admin Panel')
                    ->url('/admin')
                    ->icon('heroicon-o-cog-8-tooth')
                    ->sort(9999)
                    ->visible(fn (): bool => auth()->user()?->can('access_admin_panel') ?? false),
            ])
            ->userMenuItems([
                'profile' => \Filament\Navigation\MenuItem::make()
                    ->label('My Profile')
                    ->url(fn (): string => \App\Filament\Pages\ManageProfile::getUrl(panel: 'dashboard'))
                    ->icon('heroicon-o-user'),
                \Filament\Navigation\MenuItem::make()
                    ->label('Admin Panel')
                    ->icon('heroicon-o-cog-8-tooth')
                    ->url('/admin')
                    ->visible(fn (): bool => auth()->user()?->can('access_admin_panel') ?? false),
            ])
            ->discoverResources(in: app_path('Filament/Dashboard/Resources'), for: 'App\\Filament\\Dashboard\\Resources')
            ->discoverPages(in: app_path('Filament/Dashboard/Pages'), for: 'App\\Filament\\Dashboard\\Pages')
            ->pages([
                Pages\Dashboard::class,
                \App\Filament\Pages\ManageProfile::class,
                \App\Filament\Pages\Onboarding::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Dashboard/Widgets'), for: 'App\\Filament\\Dashboard\\Widgets');

        // Dynamically register Dashboard-targeted plugins
        try {
            foreach (\Nwidart\Modules\Facades\Module::allEnabled() as $module) {
                if ($module->get('panel') === 'dashboard') {
                    if (is_dir($module->getPath() . '/app/Filament/Resources')) {
                        $panel->discoverResources(in: $module->getPath() . '/app/Filament/Resources', for: "Modules\\{$module->getName()}\Filament\Resources");
                    }
                    if (is_dir($module->getPath() . '/app/Filament/Pages')) {
                        $panel->discoverPages(in: $module->getPath() . '/app/Filament/Pages', for: "Modules\\{$module->getName()}\Filament\Pages");
                    }
                    if (is_dir($module->getPath() . '/app/Filament/Widgets')) {
                        $panel->discoverWidgets(in: $module->getPath() . '/app/Filament/Widgets', for: "Modules\\{$module->getName()}\Filament\Widgets");
                    }
                }
            }
        } catch (\Exception $e) {
            // Modules not configured yet
        }

        return $panel
            ->widgets([
                Widgets\AccountWidget::class,
                Widgets\FilamentInfoWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->databaseNotifications()
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}





