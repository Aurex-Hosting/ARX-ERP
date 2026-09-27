<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\Setting;
use App\Core\Services\SettingsManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Controller managing system, user, and theme general branding settings.
 */
class SettingController extends Controller
{
    public function __construct(
        protected SettingsManager $settingsManager
    ) {}

    /**
     * Get a setting by key.
     */
    public function show(Request $request, string $key): JsonResponse
    {
        $userId = $request->query('scope') === 'user' ? $request->user()?->id : null;
        $value = $this->settingsManager->get($key, null, $userId);

        return response()->json([
            'key' => $key,
            'value' => $value,
        ]);
    }

    /**
     * Get all settings in a group.
     */
    public function getGroup(Request $request, string $group): JsonResponse
    {
        $userId = $request->query('scope') === 'user' ? $request->user()?->id : null;
        $settings = $this->settingsManager->getGroup($group, $userId);

        return response()->json([
            'group' => $group,
            'settings' => $settings,
        ]);
    }

    /**
     * Update or create a setting.
     */
    public function update(Request $request, string $key): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['required'],
            'group' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:string,integer,boolean,json'],
            'scope' => ['nullable', 'string', 'in:system,user'],
        ]);

        $userId = ($validated['scope'] ?? 'system') === 'user' ? $request->user()?->id : null;
        $group = $validated['group'] ?? 'system';
        $type = $validated['type'] ?? 'string';

        $setting = $this->settingsManager->set($key, $validated['value'], $group, $type, $userId);

        return response()->json([
            'message' => "Setting '{$key}' updated.",
            'setting' => $setting,
        ]);
    }

    /**
     * Get General Branding & Theme Settings.
     */
    public function getGeneralSettings(Request $request): JsonResponse
    {
        $companyName = $this->settingsManager->get('theme.company_name')
            ?: $this->settingsManager->get('system.app_name', 'ARX-ERP');

        $rawTopbar = $this->settingsManager->get('theme.quick_links_topbar', []);
        if (is_string($rawTopbar)) {
            $rawTopbar = json_decode($rawTopbar, true) ?: [];
        }
        $rawLogin = $this->settingsManager->get('theme.quick_links_login', []);
        if (is_string($rawLogin)) {
            $rawLogin = json_decode($rawLogin, true) ?: [];
        }

        $settings = [
            'company_name' => $companyName,
            'logo_dark' => $this->settingsManager->get('theme.logo_dark', null),
            'logo_light' => $this->settingsManager->get('theme.logo_light', null),
            'favicon' => $this->settingsManager->get('theme.favicon', null),
            'copyright_text' => $this->settingsManager->get('theme.copyright_text', '© '.date('Y').' '.$companyName.'. All rights reserved.'),
            'auth_bg_dark' => $this->settingsManager->get('theme.auth_bg_dark', null),
            'auth_bg_light' => $this->settingsManager->get('theme.auth_bg_light', null),
            'site_title_dashboard' => $this->settingsManager->get('theme.site_title_dashboard', $companyName.' - Dashboard'),
            'site_title_admin' => $this->settingsManager->get('theme.site_title_admin', $companyName.' - Admin Portal'),
            'quick_links_topbar' => is_array($rawTopbar) ? array_values(array_filter($rawTopbar, fn ($l) => is_array($l) && (! empty($l['name']) || ! empty($l['url'])))) : [],
            'quick_links_login' => is_array($rawLogin) ? array_values(array_filter($rawLogin, fn ($l) => is_array($l) && (! empty($l['name']) || ! empty($l['url'])))) : [],
        ];

        return response()->json([
            'settings' => $settings,
        ]);
    }

    /**
     * Check if the authenticated actor has permission (or super-admin / themes.manage fallback).
     */
    private function checkPermission(Request $request, string $permission): bool
    {
        $user = $request->user();
        if (! $user) {
            return true;
        }

        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return true;
        }

        try {
            return $user->hasPermissionTo($permission) || $user->hasPermissionTo('themes.manage');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Update General Branding & Theme Settings (Super-Admin or authorized role only).
     */
    public function updateGeneralSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => ['nullable', 'string', 'max:255'],
            'copyright_text' => ['nullable', 'string', 'max:500'],
            'site_title_dashboard' => ['nullable', 'string', 'max:255'],
            'site_title_admin' => ['nullable', 'string', 'max:255'],
            'logo_dark' => ['nullable', 'file', 'max:10240', 'mimes:png,jpg,jpeg,svg,ico,webp,gif,bmp'],
            'logo_light' => ['nullable', 'file', 'max:10240', 'mimes:png,jpg,jpeg,svg,ico,webp,gif,bmp'],
            'favicon' => ['nullable', 'file', 'max:10240', 'mimes:png,jpg,jpeg,svg,ico,webp,gif,bmp'],
            'auth_bg_dark' => ['nullable', 'file', 'max:10240', 'mimes:png,jpg,jpeg,svg,ico,webp,gif,bmp'],
            'auth_bg_light' => ['nullable', 'file', 'max:10240', 'mimes:png,jpg,jpeg,svg,ico,webp,gif,bmp'],
            'remove_assets' => ['nullable'],
            'quick_links_topbar' => ['nullable'],
            'quick_links_login' => ['nullable'],
        ]);

        $touchesGeneral = $request->hasAny([
            'company_name', 'copyright_text', 'site_title_dashboard', 'site_title_admin',
            'logo_dark', 'logo_light', 'favicon', 'auth_bg_dark', 'auth_bg_light', 'remove_assets',
        ]);

        if ($touchesGeneral && ! $this->checkPermission($request, 'themes.general.manage')) {
            return response()->json([
                'message' => 'You do not have permission to manage general theme branding settings.',
            ], 403);
        }

        $touchesQuickLinks = $request->hasAny(['quick_links_topbar', 'quick_links_login'])
            || collect($request->allFiles())->keys()->contains(fn ($k) => str_starts_with((string) $k, 'quick_link_icon_'));

        if ($touchesQuickLinks && ! $this->checkPermission($request, 'themes.quick_links.manage')) {
            return response()->json([
                'message' => 'You do not have permission to manage theme quick links.',
            ], 403);
        }

        if (isset($validated['company_name'])) {
            $companyName = trim((string) $validated['company_name']);
            $this->settingsManager->set('theme.company_name', $companyName, 'theme', 'string');
            // Keep system.app_name in sync for existing integrations
            $this->settingsManager->set('system.app_name', $companyName, 'system', 'string');
        }

        if (isset($validated['copyright_text'])) {
            $this->settingsManager->set('theme.copyright_text', trim((string) $validated['copyright_text']), 'theme', 'string');
        }

        if (isset($validated['site_title_dashboard'])) {
            $this->settingsManager->set('theme.site_title_dashboard', trim((string) $validated['site_title_dashboard']), 'theme', 'string');
        }

        if (isset($validated['site_title_admin'])) {
            $this->settingsManager->set('theme.site_title_admin', trim((string) $validated['site_title_admin']), 'theme', 'string');
        }

        // Process Quick Links Topbar
        if ($request->has('quick_links_topbar')) {
            $rawTopbar = $request->input('quick_links_topbar');
            $topbarLinks = is_string($rawTopbar) ? json_decode($rawTopbar, true) : $rawTopbar;
            if (is_array($topbarLinks)) {
                $processedTopbar = [];
                foreach ($topbarLinks as $idx => $link) {
                    $id = $link['id'] ?? 'link_top_'.($idx + 1);
                    $iconUrl = $link['icon_url'] ?? null;

                    // Check for newly uploaded icon file for this quick link
                    $fileKey = "quick_link_icon_topbar_{$id}";
                    if ($request->hasFile($fileKey)) {
                        $iconFile = $request->file($fileKey);
                        if ($iconFile) {
                            $ext = $iconFile->getClientOriginalExtension() ?: 'svg';
                            $fn = "quick_top_{$id}_".Str::random(10).".{$ext}";
                            $storedPath = $iconFile->storeAs('branding/quick_links', $fn, 'public');
                            $iconUrl = "/storage/{$storedPath}?t=".time();
                        }
                    }

                    $name = trim((string) ($link['name'] ?? ''));
                    $url = trim((string) ($link['url'] ?? ''));

                    if ($name !== '' || $url !== '') {
                        $processedTopbar[] = [
                            'id' => (string) $id,
                            'name' => $name,
                            'url' => $url,
                            'icon_url' => $iconUrl,
                        ];
                    }
                }
                $this->settingsManager->set('theme.quick_links_topbar', $processedTopbar, 'theme', 'json');
            }
        }

        // Process Quick Links Login
        if ($request->has('quick_links_login')) {
            $rawLogin = $request->input('quick_links_login');
            $loginLinks = is_string($rawLogin) ? json_decode($rawLogin, true) : $rawLogin;
            if (is_array($loginLinks)) {
                $processedLogin = [];
                foreach ($loginLinks as $idx => $link) {
                    $id = $link['id'] ?? 'link_login_'.($idx + 1);
                    $iconUrl = $link['icon_url'] ?? null;

                    // Check for newly uploaded icon file for this quick link
                    $fileKey = "quick_link_icon_login_{$id}";
                    if ($request->hasFile($fileKey)) {
                        $iconFile = $request->file($fileKey);
                        if ($iconFile) {
                            $ext = $iconFile->getClientOriginalExtension() ?: 'svg';
                            $fn = "quick_login_{$id}_".Str::random(10).".{$ext}";
                            $storedPath = $iconFile->storeAs('branding/quick_links', $fn, 'public');
                            $iconUrl = "/storage/{$storedPath}?t=".time();
                        }
                    }

                    $name = trim((string) ($link['name'] ?? ''));
                    $url = trim((string) ($link['url'] ?? ''));

                    if ($name !== '' || $url !== '') {
                        $processedLogin[] = [
                            'id' => (string) $id,
                            'name' => $name,
                            'url' => $url,
                            'icon_url' => $iconUrl,
                        ];
                    }
                }
                $this->settingsManager->set('theme.quick_links_login', $processedLogin, 'theme', 'json');
            }
        }

        // Process asset deletions upon save
        $removeAssets = $request->input('remove_assets');
        if (is_string($removeAssets)) {
            $removeAssets = array_filter(array_map('trim', explode(',', $removeAssets)));
        }
        if (is_array($removeAssets)) {
            foreach ($removeAssets as $assetType) {
                if (in_array($assetType, ['logo_dark', 'logo_light', 'favicon', 'auth_bg_dark', 'auth_bg_light'], true)) {
                    $oldPath = $this->settingsManager->get("theme.{$assetType}");
                    if ($oldPath && is_string($oldPath)) {
                        $cleanOldPath = Str::after($oldPath, '/storage/');
                        if (Storage::disk('public')->exists($cleanOldPath)) {
                            Storage::disk('public')->delete($cleanOldPath);
                        }
                    }
                    $this->settingsManager->set("theme.{$assetType}", null, 'theme', 'string');
                }
            }
        }

        // Process staged file uploads upon save
        $assetTypes = ['logo_dark', 'logo_light', 'favicon', 'auth_bg_dark', 'auth_bg_light'];
        foreach ($assetTypes as $assetType) {
            if ($request->hasFile($assetType)) {
                $file = $request->file($assetType);
                if ($file) {
                    $oldPath = $this->settingsManager->get("theme.{$assetType}");
                    if ($oldPath && is_string($oldPath)) {
                        $cleanOldPath = Str::after($oldPath, '/storage/');
                        if (Storage::disk('public')->exists($cleanOldPath)) {
                            Storage::disk('public')->delete($cleanOldPath);
                        }
                    }

                    $extension = $file->getClientOriginalExtension() ?: 'png';
                    $filename = "{$assetType}_".Str::random(16).".{$extension}";
                    $path = $file->storeAs('branding', $filename, 'public');

                    $assetUrl = "/storage/{$path}?t=".time();
                    $this->settingsManager->set("theme.{$assetType}", $assetUrl, 'theme', 'string');
                }
            }
        }

        return response()->json([
            'message' => 'General settings saved and applied successfully.',
            'settings' => $this->getGeneralSettings($request)->getData(true)['settings'],
        ]);
    }

    /**
     * Upload branding asset (logo dark/light, favicon, login page background images).
     */
    public function uploadAsset(Request $request): JsonResponse
    {
        if (! $this->checkPermission($request, 'themes.general.manage')) {
            return response()->json([
                'message' => 'You do not have permission to upload branding assets.',
            ], 403);
        }

        $validated = $request->validate([
            'asset_type' => ['required', 'string', 'in:logo_dark,logo_light,favicon,auth_bg_dark,auth_bg_light'],
            'file' => ['required', 'file', 'max:10240', 'mimes:png,jpg,jpeg,svg,ico,webp,gif,bmp'],
        ]);

        $assetType = $validated['asset_type'];
        $file = $request->file('file');

        if (! $file) {
            return response()->json(['message' => 'No file provided.'], 422);
        }

        // Delete previous asset if it was stored in public disk
        $oldPath = $this->settingsManager->get("theme.{$assetType}");
        if ($oldPath && is_string($oldPath)) {
            $cleanOldPath = Str::after($oldPath, '/storage/');
            if (Storage::disk('public')->exists($cleanOldPath)) {
                Storage::disk('public')->delete($cleanOldPath);
            }
        }

        $extension = $file->getClientOriginalExtension() ?: 'png';
        $filename = "{$assetType}_".Str::random(16).".{$extension}";
        $path = $file->storeAs('branding', $filename, 'public');

        $assetUrl = "/storage/{$path}?t=".time();
        $this->settingsManager->set("theme.{$assetType}", $assetUrl, 'theme', 'string');

        return response()->json([
            'message' => ucfirst(str_replace('_', ' ', $assetType)).' uploaded successfully.',
            'asset_type' => $assetType,
            'url' => $assetUrl,
            'settings' => $this->getGeneralSettings($request)->getData(true)['settings'],
        ]);
    }

    /**
     * Delete branding asset and revert to default.
     */
    public function deleteAsset(Request $request, string $assetType): JsonResponse
    {
        if (! $this->checkPermission($request, 'themes.general.manage')) {
            return response()->json([
                'message' => 'You do not have permission to delete branding assets.',
            ], 403);
        }

        if (! in_array($assetType, ['logo_dark', 'logo_light', 'favicon', 'auth_bg_dark', 'auth_bg_light'], true)) {
            return response()->json(['message' => 'Invalid asset type specified.'], 422);
        }

        $oldPath = $this->settingsManager->get("theme.{$assetType}");
        if ($oldPath && is_string($oldPath)) {
            $cleanOldPath = Str::after($oldPath, '/storage/');
            if (Storage::disk('public')->exists($cleanOldPath)) {
                Storage::disk('public')->delete($cleanOldPath);
            }
        }

        $this->settingsManager->set("theme.{$assetType}", null, 'theme', 'string');

        return response()->json([
            'message' => ucfirst(str_replace('_', ' ', $assetType)).' removed successfully.',
            'asset_type' => $assetType,
            'settings' => $this->getGeneralSettings($request)->getData(true)['settings'],
        ]);
    }
}
