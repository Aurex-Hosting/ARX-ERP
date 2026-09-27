<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Services\NavigationBuilder;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller providing dynamic, permission-filtered navigation menus per area.
 */
class NavigationController extends Controller
{
    public function __construct(
        protected NavigationBuilder $navigationBuilder
    ) {}

    /**
     * Get permission-filtered navigation menu items for current user and area.
     */
    public function index(Request $request): JsonResponse
    {
        $area = $request->query('area', 'dashboard');
        $user = $request->user();

        $items = $this->navigationBuilder->build($user, $area);

        return response()->json([
            'area' => $area,
            'items' => $items,
        ]);
    }
}
