<?php

declare(strict_types=1);

namespace App\Core\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;

/**
 * Service managing themes per application area (discovery, activation, configuration).
 */
class ThemeManager
{
    public function __construct(
        protected SettingsManager $settingsManager,
        protected HookManager $hookManager
    ) {}

    /**
     * Discover all themes available for an area ('dashboard' or 'admin').
     *
     * @return Collection<string, array<string, mixed>>
     */
    public function discover(string $area = 'dashboard'): Collection
    {
        $discovered = collect();
        $basePath = base_path("themes/{$area}");

        if (! File::isDirectory($basePath)) {
            return $discovered;
        }

        $directories = File::directories($basePath);

        foreach ($directories as $directory) {
            $manifestPath = $directory.DIRECTORY_SEPARATOR.'theme.json';

            if (File::exists($manifestPath)) {
                $json = json_decode(File::get($manifestPath), true);

                if (is_array($json) && isset($json['slug'])) {
                    $json['area'] = $json['area'] ?? $area;
                    $json['path'] = $directory;
                    $discovered->put($json['slug'], $json);
                }
            }
        }

        return $discovered;
    }

    /**
     * Get the currently active theme slug for an area.
     */
    public function getActiveThemeSlug(string $area = 'dashboard'): string
    {
        return (string) $this->settingsManager->get("theme.{$area}.active", config("arx.areas.{$area}.default_theme", 'default'));
    }

    /**
     * Get the active theme manifest for an area.
     *
     * @return array<string, mixed>|null
     */
    public function getActiveTheme(string $area = 'dashboard'): ?array
    {
        $activeSlug = $this->getActiveThemeSlug($area);
        $theme = $this->discover($area)->get($activeSlug);

        if ($theme) {
            return $this->hookManager->applyFilters("theme.{$area}.config", $theme);
        }

        return null;
    }

    /**
     * Activate a theme for an area.
     */
    public function activate(string $area, string $slug): void
    {
        $theme = $this->discover($area)->get($slug);

        if (! $theme) {
            throw new \RuntimeException("Theme '{$slug}' not found in area '{$area}'");
        }

        $this->settingsManager->set("theme.{$area}.active", $slug, group: 'themes');
        $this->hookManager->doAction('theme.activated', $area, $slug, $theme);
    }
}
