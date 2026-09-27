<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Services\ThemeManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller managing themes and active theme configuration per area.
 */
class ThemeController extends Controller
{
    public function __construct(
        protected ThemeManager $themeManager
    ) {}

    /**
     * List all available themes for an area.
     */
    public function index(Request $request): JsonResponse
    {
        $area = $request->query('area', 'dashboard');
        $themes = $this->themeManager->discover($area)->values();
        $activeSlug = $this->themeManager->getActiveThemeSlug($area);

        return response()->json([
            'area' => $area,
            'active_theme' => $activeSlug,
            'themes' => $themes,
        ]);
    }

    /**
     * Get active theme configuration for an area (Public endpoint for frontend initialization).
     */
    public function activeConfig(Request $request): JsonResponse
    {
        $area = $request->query('area', 'dashboard');
        $theme = $this->themeManager->getActiveTheme($area);

        return response()->json([
            'area' => $area,
            'theme' => $theme,
        ]);
    }

    /**
     * Activate a theme for a specific area (Super-Admin or authorized role only).
     */
    public function activate(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        if ($user && ! $user->isSuperAdmin()) {
            try {
                if (! $user->hasPermissionTo('themes.manage')) {
                    return response()->json([
                        'message' => 'You do not have permission to activate themes.',
                    ], 403);
                }
            } catch (\Throwable) {
                return response()->json([
                    'message' => 'You do not have permission to activate themes.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'area' => ['required', 'string', 'in:dashboard,admin'],
        ]);

        $this->themeManager->activate($validated['area'], $slug);

        return response()->json([
            'message' => "Theme '{$slug}' activated for area '{$validated['area']}'.",
        ]);
    }
}
