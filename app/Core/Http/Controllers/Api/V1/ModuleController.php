<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Services\ModuleManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Controller managing module discovery, scaffolding, ZIP upload/installation,
 * enablement, disabling, uninstallation, and export.
 */
class ModuleController extends Controller
{
    public function __construct(
        protected ModuleManager $moduleManager
    ) {}

    /**
     * List all modules (can filter by ?area=dashboard|admin|shared).
     */
    public function index(Request $request): JsonResponse
    {
        $area = $request->query('area');
        $modules = $this->moduleManager->getAllModules($area);

        return response()->json([
            'modules' => $modules,
        ]);
    }

    /**
     * Scaffold and create a new module on the filesystem.
     */
    public function create(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'area' => ['required', 'string', 'in:dashboard,admin,shared'],
            'description' => ['nullable', 'string', 'max:500'],
            'author' => ['nullable', 'string', 'max:100'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
            'auto_install' => ['nullable', 'boolean'],
        ]);

        $result = $this->moduleManager->scaffold(
            name: $validated['name'],
            area: $validated['area'],
            description: $validated['description'] ?? null,
            authorName: $validated['author'] ?? null,
            permissions: $validated['permissions'] ?? null,
            autoInstall: $validated['auto_install'] ?? true
        );

        return response()->json([
            'message' => "Module '{$result['name']}' created successfully.",
            'module' => $result,
        ], 201);
    }

    /**
     * Generate and download a starter ZIP package for module developers.
     */
    public function generateStarter(Request $request): BinaryFileResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'area' => ['required', 'string', 'in:dashboard,admin,shared'],
            'description' => ['nullable', 'string', 'max:500'],
            'author' => ['nullable', 'string', 'max:100'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        try {
            $zipPath = $this->moduleManager->generateStarterZip(
                name: $validated['name'],
                area: $validated['area'],
                description: $validated['description'] ?? null,
                authorName: $validated['author'] ?? null,
                permissions: $validated['permissions'] ?? null
            );

            $studlyName = Str::studly($validated['name']);

            return response()->download($zipPath, "Starter_{$studlyName}_Module.zip", [
                'Content-Type' => 'application/zip',
            ])->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Upload and install a module from a ZIP file archive.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'module_zip' => ['nullable', 'file', 'mimes:zip', 'max:51200'], // max 50MB
            'zip_base64' => ['nullable', 'string'],
            'auto_install' => ['nullable', 'boolean'],
        ]);

        if (! $request->hasFile('module_zip') && ! $request->filled('zip_base64')) {
            return response()->json([
                'message' => 'Please provide a ZIP archive file (module_zip or zip_base64).',
            ], 422);
        }

        $source = $request->file('module_zip') ?: $request->input('zip_base64');
        $autoInstall = $request->boolean('auto_install', true);

        try {
            $result = $this->moduleManager->installFromZip($source, $autoInstall);

            return response()->json([
                'message' => "Module '{$result['name']}' uploaded and installed successfully.",
                'module' => $result,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Install a discovered module.
     */
    public function install(string $slug): JsonResponse
    {
        try {
            $module = $this->moduleManager->install($slug);

            return response()->json([
                'message' => "Module '{$slug}' installed successfully.",
                'module' => $module,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Enable an installed module.
     */
    public function enable(string $slug): JsonResponse
    {
        try {
            $module = $this->moduleManager->enable($slug);

            return response()->json([
                'message' => "Module '{$slug}' enabled.",
                'module' => $module,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Disable an installed module.
     */
    public function disable(string $slug): JsonResponse
    {
        try {
            $module = $this->moduleManager->disable($slug);

            return response()->json([
                'message' => "Module '{$slug}' disabled.",
                'module' => $module,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Uninstall a module (cleans up DB state and permissions).
     */
    public function destroy(string $slug): JsonResponse
    {
        try {
            $this->moduleManager->uninstall($slug);

            return response()->json([
                'message' => "Module '{$slug}' uninstalled.",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Permanently delete module directory from filesystem.
     */
    public function deleteFromDisk(string $slug): JsonResponse
    {
        try {
            $this->moduleManager->deleteFromDisk($slug);

            return response()->json([
                'message' => "Module '{$slug}' permanently removed from filesystem.",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Export and download a module as a ZIP archive.
     */
    public function export(string $slug): BinaryFileResponse|JsonResponse
    {
        try {
            $zipPath = $this->moduleManager->exportToZip($slug);

            return response()->download($zipPath, "module_{$slug}.zip", [
                'Content-Type' => 'application/zip',
            ])->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 404);
        }
    }
}
