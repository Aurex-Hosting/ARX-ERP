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

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        $panel
            ->default()
            ->id("admin")
            ->path("admin")
            ->login(\App\Filament\Pages\Auth\CustomLogin::class)

            ->userMenuItems([
                \Filament\Navigation\MenuItem::make()
                    ->label("My Profile")
                    ->url(fn (): string => \App\Filament\Pages\ManageProfile::getUrl(panel: "dashboard"))
                    ->icon("heroicon-o-user"),
            ])
            ->renderHook(\Filament\View\PanelsRenderHook::PAGE_START, function (): string {
                try {
                    $status = app(\App\Services\LicenseManager::class)->getLicenseStatus();
                    if ($status && isset($status["expiresAt"])) {
                        $expires = \Carbon\Carbon::parse($status["expiresAt"]);
                        $daysLeft = (int) now()->diffInDays($expires, false);
                        if ($daysLeft <= 7 && $daysLeft >= 0) {
                            return "<div style=\"background-color: #ef4444; color: white; padding: 0.75rem; text-align: center; border-radius: 0.5rem; margin-bottom: 1rem; font-weight: 500;\">Your system license will expire in " . $daysLeft . " days! <a href=\"https://license.magneticx.store\" target=\"_blank\" style=\"text-decoration: underline; font-weight: 700;\">Renew now to avoid service interruption.</a></div>";
                        }
                    }
                } catch (\Exception $e) {}
                return "";
            })
            ->renderHook(\Filament\View\PanelsRenderHook::BODY_END, fn (): string => view("components.water-splash"))
            ->renderHook(\Filament\View\PanelsRenderHook::HEAD_START, fn (): string => view("components.custom-colors"))
            ->renderHook(\Filament\View\PanelsRenderHook::TOPBAR_END, fn (): string => \Illuminate\Support\Facades\Blade::render("@include(\"filament.topbar-profile\")"))
            ->renderHook(\Filament\View\PanelsRenderHook::GLOBAL_SEARCH_AFTER, fn (): string => \Illuminate\Support\Facades\Blade::render("@include(\"filament.digital-clock\")"))
            ->brandName(fn () => rescue(fn () => app(\App\Settings\CustomizationSettings::class)->brand_name, "ERP System", false) ?: config("app.name"))
            ->brandLogo(fn () => rescue(fn () => app(\App\Settings\CustomizationSettings::class)->brand_logo ? asset("storage/".app(\App\Settings\CustomizationSettings::class)->brand_logo) : null, null, false))
            ->favicon(rescue(fn () => app(\App\Settings\CustomizationSettings::class)->brand_favicon ? asset("storage/".app(\App\Settings\CustomizationSettings::class)->brand_favicon) : asset("images/Customizations/favicon.png"), asset("images/Customizations/favicon.png"), false))
            ->colors([
                "primary" => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_primary), \Filament\Support\Colors\Color::Amber, false),
                "secondary" => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_secondary), \Filament\Support\Colors\Color::Gray, false),
                "info" => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_accent), \Filament\Support\Colors\Color::Blue, false),
                "gray" => rescue(fn () => \Filament\Support\Colors\Color::hex(app(\App\Settings\CustomizationSettings::class)->color_background), \Filament\Support\Colors\Color::Zinc, false),
            ])
            ->discoverResources(in: app_path("Filament/Resources"), for: "App\Filament\Resources")
            ->discoverPages(in: app_path("Filament/Pages"), for: "App\Filament\Pages")
            ->pages([
                Pages\Dashboard::class,
            ])
            ->discoverWidgets(in: app_path("Filament/Widgets"), for: "App\Filament\Widgets");

        try {
            foreach (\Nwidart\Modules\Facades\Module::allEnabled() as $module) {
                if ($module->get("panel", "admin") === "admin") {
                    if (is_dir($module->getPath() . "/app/Filament/Resources")) {
                        $panel->discoverResources(in: $module->getPath() . "/app/Filament/Resources", for: "Modules\\" . $module->getName() . "\Filament\Resources");
                    }
                    if (is_dir($module->getPath() . "/app/Filament/Pages")) {
                        $panel->discoverPages(in: $module->getPath() . "/app/Filament/Pages", for: "Modules\\" . $module->getName() . "\Filament\Pages");
                    }
                    if (is_dir($module->getPath() . "/app/Filament/Widgets")) {
                        $panel->discoverWidgets(in: $module->getPath() . "/app/Filament/Widgets", for: "Modules\\" . $module->getName() . "\Filament\Widgets");
                    }
                }
            }
        } catch (\Exception $e) {}

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
            ->plugins([
                \BezhanSalleh\FilamentShield\FilamentShieldPlugin::make(),
            ])
            ->databaseNotifications()
            ->authMiddleware([
                Authenticate::class,
                \App\Http\Middleware\EnsureOnboardingIsComplete::class,
            ]);
    }
}