<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\AuditLog;
use App\Core\Services\SettingsManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Controller managing Dashboard Overview widgets configuration, layout ordering,
 * banner slideshow parameters, profile widget customizations, and custom widgets.
 */
class ThemeDashboardWidgetController extends Controller
{
    public function __construct(
        protected SettingsManager $settingsManager
    ) {}

    /**
     * Default dashboard overview widgets configuration.
     *
     * @return array<string, mixed>
     */
    public static function getDefaultConfig(): array
    {
        return [
            'layout' => [
                'widget_profile',
                'widget_banner',
                'custom_api_modular',
                'custom_rbac_security',
                'custom_themeable_arch',
                'widget_payables_calendar',
            ],
            'profile_widget' => [
                'id' => 'widget_profile',
                'enabled' => true,
                'size' => '1/4',
                'height' => '2/2-raw',
                'title' => 'Profile',
                'show_joined_date' => true,
                'show_user_id' => true,
                'show_email_spoiler' => true,
                'custom_bg_url' => null,
            ],
            'banner_widget' => [
                'id' => 'widget_banner',
                'enabled' => true,
                'size' => '3/4',
                'height' => '2/2-raw',
                'slideshow_enabled' => true,
                'autoplay' => false,
                'autoplay_interval' => 5,
                'slides' => [
                    [
                        'id' => 'slide_default_1',
                        'bg_image_url' => null,
                        'overlay_opacity' => 0.25,
                        'bg_blur' => 0,
                        'title' => 'Welcome back',
                        'title_use_gradient' => false,
                        'title_color' => '#0f172a',
                        'title_gradient_from' => '#7c3aed',
                        'title_gradient_to' => '#4f46e5',
                        'title_gradient_dir' => 'to-r',
                        'subtitle' => 'Core Platform Ready',
                        'subtitle_use_gradient' => false,
                        'subtitle_color' => '#7c3aed',
                        'subtitle_gradient_from' => '#7c3aed',
                        'subtitle_gradient_to' => '#ec4899',
                        'subtitle_gradient_dir' => 'to-r',
                        'description' => 'This is your clean baseline overview. As you install modules (CRM, Economy, Inventory, POS), their custom widgets and dashboards will automatically populate here.',
                        'description_use_gradient' => false,
                        'description_color' => '#475569',
                        'description_gradient_from' => '#334155',
                        'description_gradient_to' => '#64748b',
                        'description_gradient_dir' => 'to-r',
                        'buttons' => [
                            [
                                'id' => 'btn_1',
                                'text' => 'Explore Modules',
                                'url' => '/admin/modules',
                                'bg_color' => '#7c3aed',
                                'text_color' => '#ffffff',
                                'style' => 'solid',
                            ],
                        ],
                    ],
                ],
            ],
            'custom_widgets' => [
                [
                    'id' => 'custom_api_modular',
                    'enabled' => true,
                    'size' => '1/4',
                    'height' => '1/2-raw',
                    'title' => 'API-First Modular Engine',
                    'description' => 'All features run as isolated modules. Core code remains immutable and safe during platform updates.',
                    'icon' => 'Layers',
                    'badge' => 'Architecture',
                    'color' => '#7c3aed',
                    'link_url' => '',
                    'link_text' => '',
                ],
                [
                    'id' => 'custom_rbac_security',
                    'enabled' => true,
                    'size' => '1/4',
                    'height' => '1/2-raw',
                    'title' => 'Granular RBAC Security',
                    'description' => 'Every module registers its own scoped permissions. Users only see and access authorized resources.',
                    'icon' => 'ShieldCheck',
                    'badge' => 'Security',
                    'color' => '#3b82f6',
                    'link_url' => '',
                    'link_text' => '',
                ],
                [
                    'id' => 'custom_themeable_arch',
                    'enabled' => true,
                    'size' => '1/4',
                    'height' => '2/2-raw',
                    'title' => 'Themeable Architecture',
                    'description' => 'Swap and customize frontend themes independently for the Dashboard and Admin surfaces.',
                    'icon' => 'Zap',
                    'badge' => 'Theming',
                    'color' => '#10b981',
                    'link_url' => '',
                    'link_text' => '',
                ],
            ],
            'payables_widget' => [
                'id' => 'widget_payables_calendar',
                'enabled' => true,
                'size' => '2/4',
                'height' => '2/2-raw',
            ],
        ];
    }

    /**
     * Get Dashboard Overview widget configuration (Used by Dashboard surface).
     */
    public function getDashboardWidgets(Request $request): JsonResponse
    {
        $config = $this->loadMergedConfig();

        return response()->json([
            'config' => $config,
        ]);
    }

    /**
     * Get Dashboard Overview widget configuration for Admin Theme Manager.
     */
    public function getDashboardWidgetsAdmin(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && ! $user->isSuperAdmin()) {
            if (! $user->hasPermissionTo('themes.dashboard.view') &&
                ! $user->hasPermissionTo('themes.dashboard.manage') &&
                ! $user->hasPermissionTo('themes.manage')) {
                return response()->json([
                    'message' => 'You do not have permission to view dashboard overview widgets configuration.',
                ], 403);
            }
        }

        $config = $this->loadMergedConfig();

        return response()->json([
            'config' => $config,
        ]);
    }

    /**
     * Update Dashboard Overview widgets configuration and layout (Admin action).
     */
    public function updateDashboardWidgets(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && ! $user->isSuperAdmin()) {
            if (! $user->hasPermissionTo('themes.dashboard.manage') &&
                ! $user->hasPermissionTo('themes.manage')) {
                return response()->json([
                    'message' => 'You do not have permission to manage dashboard overview widgets.',
                ], 403);
            }
        }

        $rawPayload = $request->input('config');
        if (is_string($rawPayload)) {
            $parsed = json_decode($rawPayload, true);
            if (is_array($parsed)) {
                $rawPayload = $parsed;
            }
        }

        if (! is_array($rawPayload)) {
            $rawPayload = $request->all();
        }

        $oldConfig = $this->loadMergedConfig();
        $defaults = self::getDefaultConfig();

        // Build new configuration from incoming data with defaults fallback
        $newConfig = [
            'layout' => is_array($rawPayload['layout'] ?? null)
                ? array_values($rawPayload['layout'])
                : $oldConfig['layout'],
            'profile_widget' => is_array($rawPayload['profile_widget'] ?? null)
                ? array_merge($defaults['profile_widget'], $rawPayload['profile_widget'])
                : $oldConfig['profile_widget'],
            'banner_widget' => is_array($rawPayload['banner_widget'] ?? null)
                ? array_merge($defaults['banner_widget'], $rawPayload['banner_widget'])
                : $oldConfig['banner_widget'],
            'custom_widgets' => is_array($rawPayload['custom_widgets'] ?? null)
                ? array_values($rawPayload['custom_widgets'])
                : $oldConfig['custom_widgets'],
            'payables_widget' => is_array($rawPayload['payables_widget'] ?? null)
                ? array_merge($defaults['payables_widget'], $rawPayload['payables_widget'])
                : $oldConfig['payables_widget'],
        ];

        $normalizeSize = static function (?string $size, string $fallback = '1/4'): string {
            return match ($size) {
                '1/3', '1/4' => '1/4',
                '2/3', '2/4' => '2/4',
                '3/4' => '3/4',
                '3/3', '4/4' => '4/4',
                default => $fallback,
            };
        };

        // Ensure Profile Widget width is strictly 1/4 in PC view as specified
        $newConfig['profile_widget']['size'] = '1/4';
        $newConfig['banner_widget']['size'] = $normalizeSize($newConfig['banner_widget']['size'] ?? null, '4/4');
        $newConfig['payables_widget']['size'] = $normalizeSize($newConfig['payables_widget']['size'] ?? null, '2/4');
        if (isset($newConfig['custom_widgets']) && is_array($newConfig['custom_widgets'])) {
            foreach ($newConfig['custom_widgets'] as &$cw) {
                if (is_array($cw)) {
                    $cw['size'] = $normalizeSize($cw['size'] ?? null, '1/4');
                }
            }
            unset($cw);
        }

        // Process File Upload: Profile Widget background
        if ($request->hasFile('profile_bg_file')) {
            $profileBgFile = $request->file('profile_bg_file');
            if ($profileBgFile instanceof UploadedFile && $profileBgFile->isValid()) {
                $path = $profileBgFile->store('theme/widgets', 'public');
                $newConfig['profile_widget']['custom_bg_url'] = Storage::url($path);
            }
        }

        // Process File Uploads: Banner slide background images
        if (isset($newConfig['banner_widget']['slides']) && is_array($newConfig['banner_widget']['slides'])) {
            foreach ($newConfig['banner_widget']['slides'] as $index => &$slide) {
                $slideId = $slide['id'] ?? 'slide_'.$index;
                $fileKey = "slide_bg_file_{$slideId}";

                if ($request->hasFile($fileKey)) {
                    $file = $request->file($fileKey);
                    if ($file instanceof UploadedFile && $file->isValid()) {
                        $path = $file->store('theme/widgets', 'public');
                        $slide['bg_image_url'] = Storage::url($path);
                    }
                }
            }
            unset($slide);
        }

        // Persist to system settings
        $this->settingsManager->set('theme.dashboard_widgets', $newConfig, 'theme', 'json');

        // Audit Trail Entry
        $actor = $user?->name ?? 'System Administrator';
        AuditLog::record(
            action: 'theme.dashboard_widgets.update',
            description: "{$actor} updated Dashboard Overview widget configuration, layout, and styling.",
            oldValues: $oldConfig,
            newValues: $newConfig,
            user: $user
        );

        return response()->json([
            'message' => 'Dashboard Overview widgets configuration updated successfully.',
            'config' => $newConfig,
        ]);
    }

    /**
     * Load current configuration merged with system defaults.
     *
     * @return array<string, mixed>
     */
    private function loadMergedConfig(): array
    {
        $stored = $this->settingsManager->get('theme.dashboard_widgets', null);
        $defaults = self::getDefaultConfig();

        if (! is_array($stored)) {
            return $defaults;
        }

        $normalizeSize = static function (?string $size, string $fallback = '1/4'): string {
            return match ($size) {
                '1/3', '1/4' => '1/4',
                '2/3', '2/4' => '2/4',
                '3/4' => '3/4',
                '3/3', '4/4' => '4/4',
                default => $fallback,
            };
        };

        $profileWidget = array_merge(
            $defaults['profile_widget'],
            is_array($stored['profile_widget'] ?? null) ? $stored['profile_widget'] : []
        );
        $profileWidget['size'] = '1/4';

        $bannerWidget = array_merge(
            $defaults['banner_widget'],
            is_array($stored['banner_widget'] ?? null) ? $stored['banner_widget'] : []
        );
        $bannerWidget['size'] = $normalizeSize($bannerWidget['size'] ?? null, '4/4');

        $payablesWidget = array_merge(
            $defaults['payables_widget'],
            is_array($stored['payables_widget'] ?? null) ? $stored['payables_widget'] : []
        );
        $payablesWidget['size'] = $normalizeSize($payablesWidget['size'] ?? null, '2/4');

        $customWidgets = is_array($stored['custom_widgets'] ?? null)
            ? array_values($stored['custom_widgets'])
            : $defaults['custom_widgets'];
        foreach ($customWidgets as &$cw) {
            if (is_array($cw)) {
                $cw['size'] = $normalizeSize($cw['size'] ?? null, '1/4');
            }
        }
        unset($cw);

        return [
            'layout' => is_array($stored['layout'] ?? null)
                ? array_values($stored['layout'])
                : $defaults['layout'],
            'profile_widget' => $profileWidget,
            'banner_widget' => $bannerWidget,
            'custom_widgets' => $customWidgets,
            'payables_widget' => $payablesWidget,
        ];
    }
}
