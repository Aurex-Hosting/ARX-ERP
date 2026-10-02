<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\Module as ModuleModel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use ZipArchive;

/**
 * Service managing module lifecycle (discovery, scaffolding, zip upload/install, enablement, dependencies).
 */
class ModuleManager
{
    public function __construct(
        protected HookManager $hookManager
    ) {}

    /**
     * Discover all module manifests across dashboard, admin, and shared directories.
     *
     * @return Collection<string, array<string, mixed>>
     */
    public function discover(?string $area = null): Collection
    {
        $discovered = collect();
        $areas = $area ? [$area] : ['dashboard', 'admin', 'shared'];

        foreach ($areas as $targetArea) {
            $basePath = base_path("modules/{$targetArea}");

            if (! File::isDirectory($basePath)) {
                continue;
            }

            $directories = File::directories($basePath);

            foreach ($directories as $directory) {
                $manifestPath = $directory.DIRECTORY_SEPARATOR.'module.json';

                if (File::exists($manifestPath)) {
                    $json = json_decode(File::get($manifestPath), true);

                    if (is_array($json) && isset($json['slug'])) {
                        $json['area'] = $json['area'] ?? $targetArea;
                        $json['path'] = $directory;
                        $discovered->put($json['slug'], $json);
                    }
                }
            }
        }

        return $discovered;
    }

    /**
     * Get list of all installed modules from database synced with filesystem discovery.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function getAllModules(?string $area = null): Collection
    {
        $discovered = $this->discover($area);
        $installed = ModuleModel::all()->keyBy('slug');

        return $discovered->map(function (array $manifest, string $slug) use ($installed): array {
            $model = $installed->get($slug);
            $hasIcon = $this->hasModuleAsset($slug, 'icon');
            $hasBanner = $this->hasModuleAsset($slug, 'banner');
            $hasReadme = $this->hasModuleReadme($slug);

            return [
                'slug' => $slug,
                'name' => $manifest['name'] ?? $slug,
                'area' => $manifest['area'] ?? 'dashboard',
                'version' => $manifest['version'] ?? '1.0.0',
                'description' => $manifest['description'] ?? '',
                'author' => $manifest['author'] ?? null,
                'dependencies' => $manifest['dependencies'] ?? [],
                'permissions' => $manifest['permissions'] ?? [],
                'is_installed' => (bool) ($model?->is_installed ?? false),
                'is_enabled' => (bool) ($model?->is_enabled ?? false),
                'installed_at' => $model?->installed_at?->toIso8601String(),
                'icon' => $manifest['icon'] ?? null,
                'banner' => $manifest['banner'] ?? null,
                'icon_url' => $hasIcon ? route('api.v1.modules.icon', ['slug' => $slug]) : null,
                'banner_url' => $hasBanner ? route('api.v1.modules.banner', ['slug' => $slug]) : null,
                'has_readme' => $hasReadme,
                'manifest' => $manifest,
            ];
        })->values();
    }

    /**
     * Resolve the filesystem directory for a given module slug.
     */
    public function getModulePath(string $slug): ?string
    {
        $manifest = $this->discover()->get($slug);
        if ($manifest && ! empty($manifest['path']) && File::isDirectory($manifest['path'])) {
            return $manifest['path'];
        }

        $studlyName = Str::studly($slug);
        $candidates = [
            base_path("modules/dashboard/{$studlyName}"),
            base_path("modules/dashboard/{$slug}"),
            base_path("modules/admin/{$studlyName}"),
            base_path("modules/admin/{$slug}"),
            base_path("modules/shared/{$studlyName}"),
            base_path("modules/shared/{$slug}"),
        ];

        foreach ($candidates as $candidate) {
            if (File::isDirectory($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Check if a module asset exists.
     */
    public function hasModuleAsset(string $slug, string $type): bool
    {
        return $this->getModuleAssetPath($slug, $type) !== null;
    }

    /**
     * Resolve the absolute path to a module asset (icon, banner).
     */
    public function getModuleAssetPath(string $slug, string $type): ?string
    {
        $manifest = $this->discover()->get($slug);
        $modulePath = $this->getModulePath($slug);

        if (! $modulePath || ! File::isDirectory($modulePath)) {
            return null;
        }

        if ($type === 'icon') {
            if (! empty($manifest['icon'])) {
                $iconPath = $modulePath.DIRECTORY_SEPARATOR.ltrim((string) $manifest['icon'], '/\\');
                if (File::exists($iconPath)) {
                    return $iconPath;
                }
            }

            $fallbacks = ['icon.png', 'icon.svg', 'icon.webp', 'icon.jpg', 'icon.jpeg', 'assets/icon.png', 'assets/icon.svg'];
            foreach ($fallbacks as $fallback) {
                $candidate = $modulePath.DIRECTORY_SEPARATOR.$fallback;
                if (File::exists($candidate)) {
                    return $candidate;
                }
            }
        } elseif ($type === 'banner') {
            if (! empty($manifest['banner'])) {
                $bannerPath = $modulePath.DIRECTORY_SEPARATOR.ltrim((string) $manifest['banner'], '/\\');
                if (File::exists($bannerPath)) {
                    return $bannerPath;
                }
            }

            $fallbacks = ['banner.png', 'banner.svg', 'banner.webp', 'banner.jpg', 'banner.jpeg', 'assets/banner.png', 'assets/banner.svg'];
            foreach ($fallbacks as $fallback) {
                $candidate = $modulePath.DIRECTORY_SEPARATOR.$fallback;
                if (File::exists($candidate)) {
                    return $candidate;
                }
            }
        }

        return null;
    }

    /**
     * Check if a module has a README file.
     */
    public function hasModuleReadme(string $slug): bool
    {
        return $this->getModuleReadme($slug) !== null;
    }

    /**
     * Read the contents of a module's README.md file.
     */
    public function getModuleReadme(string $slug): ?string
    {
        $modulePath = $this->getModulePath($slug);

        if (! $modulePath || ! File::isDirectory($modulePath)) {
            return null;
        }

        $candidates = ['README.md', 'readme.md', 'README.MD', 'Readme.md'];
        foreach ($candidates as $candidate) {
            $path = $modulePath.DIRECTORY_SEPARATOR.$candidate;
            if (File::exists($path)) {
                return File::get($path);
            }
        }

        return null;
    }

    /**
     * Install a discovered module.
     *
     * @throws \RuntimeException
     */
    public function install(string $slug): ModuleModel
    {
        $manifest = $this->discover()->get($slug);

        if (! $manifest) {
            throw new \RuntimeException("Module manifest not found for slug: {$slug}");
        }

        // Verify dependencies
        $dependencies = $manifest['dependencies'] ?? [];
        foreach ($dependencies as $depSlug) {
            $dep = ModuleModel::where('slug', $depSlug)->where('is_installed', true)->first();
            if (! $dep) {
                throw new \RuntimeException("Cannot install {$slug}: missing dependency {$depSlug}");
            }
        }

        $this->hookManager->doAction('module.installing', $slug, $manifest);

        // Register module permissions
        $permissions = $manifest['permissions'] ?? [];
        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        // Run module migrations if present
        $modulePath = $manifest['path'] ?? null;
        if (! $modulePath || ! File::isDirectory($modulePath)) {
            $studlyName = Str::studly($manifest['name'] ?? $slug);
            $area = $manifest['area'] ?? 'dashboard';
            $candidates = [
                base_path("modules/{$area}/{$studlyName}"),
                base_path("modules/{$area}/{$slug}"),
                base_path("modules/shared/{$studlyName}"),
                base_path("modules/shared/{$slug}"),
            ];
            foreach ($candidates as $candidate) {
                if (File::isDirectory($candidate)) {
                    $modulePath = $candidate;
                    break;
                }
            }
        }

        if ($modulePath && File::isDirectory($modulePath.'/Database/Migrations')) {
            $relPath = str_replace('\\', '/', Str::after($modulePath.'/Database/Migrations', base_path().DIRECTORY_SEPARATOR));
            try {
                Artisan::call('migrate', [
                    '--path' => $relPath,
                    '--force' => true,
                ]);
            } catch (\Throwable $e) {
                Log::error("Module {$slug} migration error: ".$e->getMessage());
            }
        }

        $module = ModuleModel::updateOrCreate(
            ['slug' => $slug],
            [
                'name' => $manifest['name'] ?? $slug,
                'area' => $manifest['area'] ?? 'dashboard',
                'version' => $manifest['version'] ?? '1.0.0',
                'description' => $manifest['description'] ?? '',
                'is_installed' => true,
                'is_enabled' => true,
                'manifest' => $manifest,
                'settings' => $manifest['settings'] ?? [],
                'installed_at' => now(),
            ]
        );

        $this->hookManager->doAction('module.installed', $module);

        return $module;
    }

    /**
     * Enable an installed module.
     */
    public function enable(string $slug): ModuleModel
    {
        $module = ModuleModel::where('slug', $slug)->firstOrFail();
        $module->update(['is_enabled' => true]);

        $this->hookManager->doAction('module.enabled', $module);

        return $module;
    }

    /**
     * Disable an installed module.
     */
    public function disable(string $slug): ModuleModel
    {
        $module = ModuleModel::where('slug', $slug)->firstOrFail();
        $module->update(['is_enabled' => false]);

        $this->hookManager->doAction('module.disabled', $module);

        return $module;
    }

    /**
     * Uninstall a module (rollback permissions & clear status, optionally delete saved data).
     */
    public function uninstall(string $slug, bool $deleteData = false): void
    {
        $module = ModuleModel::where('slug', $slug)->first();

        if ($module) {
            $this->hookManager->doAction('module.uninstalling', $module, $deleteData);

            // 1. Remove permissions registered by this module
            $permissions = $module->manifest['permissions'] ?? [];
            if (! empty($permissions)) {
                Permission::whereIn('name', $permissions)->delete();
            }

            // 2. If deleteData is requested, rollback migrations and purge stored files
            if ($deleteData) {
                $manifest = $module->manifest ?? [];
                $modulePath = $manifest['path'] ?? null;
                if (! $modulePath || ! File::isDirectory($modulePath)) {
                    $studlyName = Str::studly($manifest['name'] ?? $slug);
                    $area = $manifest['area'] ?? $module->area ?? 'dashboard';
                    $candidates = [
                        base_path("modules/{$area}/{$studlyName}"),
                        base_path("modules/{$area}/{$slug}"),
                        base_path("modules/shared/{$studlyName}"),
                        base_path("modules/shared/{$slug}"),
                    ];
                    foreach ($candidates as $candidate) {
                        if (File::isDirectory($candidate)) {
                            $modulePath = $candidate;
                            break;
                        }
                    }
                }

                if ($modulePath && File::isDirectory($modulePath.'/Database/Migrations')) {
                    $relPath = str_replace('\\', '/', Str::after($modulePath.'/Database/Migrations', base_path().DIRECTORY_SEPARATOR));
                    try {
                        Artisan::call('migrate:reset', [
                            '--path' => $relPath,
                            '--force' => true,
                        ]);
                    } catch (\Throwable $e) {
                        Log::warning("Module {$slug} rollback failed: ".$e->getMessage());
                    }
                }

                // Purge module-specific private storage directory
                $moduleStorage = storage_path("app/private/{$slug}");
                if (File::isDirectory($moduleStorage)) {
                    File::deleteDirectory($moduleStorage);
                }
                // Also check payables specific private storage if slug matches
                if (str_contains($slug, 'payable')) {
                    $payablesStorage = storage_path('app/private/payables');
                    if (File::isDirectory($payablesStorage)) {
                        File::deleteDirectory($payablesStorage);
                    }
                }
            }

            $module->delete();
        }

        $this->hookManager->doAction('module.uninstalled', $slug, $deleteData);
    }

    /**
     * Scaffold a new module package from templates.
     *
     * @param  array<string>|null  $permissions
     * @return array<string, mixed>
     */
    public function scaffold(
        string $name,
        string $area = 'dashboard',
        ?string $description = null,
        ?string $authorName = null,
        ?array $permissions = null,
        bool $autoInstall = true
    ): array {
        if (! in_array($area, ['dashboard', 'admin', 'shared'], true)) {
            throw new \InvalidArgumentException("Invalid area: {$area}. Allowed values are 'dashboard', 'admin', or 'shared'.");
        }

        $studlyName = Str::studly($name);
        $slug = Str::kebab($name);
        $areaNamespace = Str::studly($area);
        $modulePath = base_path("modules/{$area}/{$studlyName}");

        if (File::isDirectory($modulePath)) {
            throw new \RuntimeException("Module {$studlyName} already exists at modules/{$area}/{$studlyName}!");
        }

        // Subdirectory tree
        $subdirs = [
            'Config',
            'Console',
            'Database/Migrations',
            'Database/Seeders',
            'Http/Controllers',
            'Http/Requests',
            'Http/Resources',
            'Models',
            'Mcp',
            'Providers',
            'Routes',
            'Tests',
        ];

        foreach ($subdirs as $subdir) {
            File::ensureDirectoryExists("{$modulePath}/{$subdir}");
        }

        $replacements = [
            '{{STUDLY_NAME}}' => $studlyName,
            '{{SLUG}}' => $slug,
            '{{AREA}}' => $area,
            '{{AREA_NAMESPACE}}' => $areaNamespace,
        ];

        // 1. module.json
        $moduleManifest = [
            'name' => $studlyName,
            'slug' => $slug,
            'namespace' => "Modules\\{$areaNamespace}\\{$studlyName}",
            'version' => '1.0.0',
            'description' => $description ?: "{$studlyName} Module for ARX-ERP",
            'area' => $area,
            'icon' => 'icon.png',
            'banner' => 'banner.png',
            'author' => [
                'name' => $authorName ?: 'Developer',
                'url' => '',
            ],
            'core_version' => '>=1.0.0',
            'dependencies' => [],
            'permissions' => ! empty($permissions) ? $permissions : [
                "{$slug}.view",
                "{$slug}.create",
                "{$slug}.edit",
                "{$slug}.delete",
            ],
            'menu' => [
                'label' => Str::title(str_replace(['-', '_'], ' ', $name)),
                'icon' => 'box',
                'route' => "/{$slug}",
                'position' => 50,
                'permission' => "{$slug}.view",
                'children' => [],
            ],
            'settings' => new \stdClass,
        ];

        File::put(
            "{$modulePath}/module.json",
            json_encode($moduleManifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        // 2. ServiceProvider
        $this->generateFileFromStub(
            base_path('stubs/module/ServiceProvider.stub'),
            "{$modulePath}/Providers/{$studlyName}ServiceProvider.php",
            $replacements
        );

        // 3. Controller
        $this->generateFileFromStub(
            base_path('stubs/module/Controller.stub'),
            "{$modulePath}/Http/Controllers/{$studlyName}Controller.php",
            $replacements
        );

        // 4. Routes/api.php
        $this->generateFileFromStub(
            base_path('stubs/module/RoutesApi.stub'),
            "{$modulePath}/Routes/api.php",
            $replacements
        );

        // 5. README.md
        $this->generateFileFromStub(
            base_path('stubs/module/README.md.stub'),
            "{$modulePath}/README.md",
            $replacements
        );

        // 6. Assets (icon.png & banner.png)
        if (File::exists(base_path('stubs/module/icon.png'))) {
            File::copy(base_path('stubs/module/icon.png'), "{$modulePath}/icon.png");
        }
        if (File::exists(base_path('stubs/module/banner.png'))) {
            File::copy(base_path('stubs/module/banner.png'), "{$modulePath}/banner.png");
        }

        $moduleModel = null;
        if ($autoInstall) {
            $moduleModel = $this->install($slug);
        }

        return [
            'slug' => $slug,
            'name' => $studlyName,
            'area' => $area,
            'path' => $modulePath,
            'manifest' => $moduleManifest,
            'model' => $moduleModel,
        ];
    }

    /**
     * Install a module from an uploaded ZIP archive or base64 ZIP payload.
     *
     * @return array<string, mixed>
     */
    public function installFromZip(UploadedFile|string $zipSource, bool $autoInstall = true): array
    {
        $tempDir = storage_path('app/temp/module_'.Str::random(16));
        File::ensureDirectoryExists($tempDir);

        $zipPath = $tempDir.'/package.zip';

        if ($zipSource instanceof UploadedFile) {
            $zipSource->move($tempDir, 'package.zip');
        } elseif (is_string($zipSource)) {
            if (str_starts_with($zipSource, 'data:')) {
                // Base64 data URL
                $parts = explode(',', $zipSource, 2);
                $binary = base64_decode($parts[1] ?? $parts[0]);
                File::put($zipPath, $binary);
            } elseif (File::exists($zipSource)) {
                File::copy($zipSource, $zipPath);
            } else {
                File::put($zipPath, base64_decode($zipSource));
            }
        }

        $zip = new ZipArchive;
        $openResult = $zip->open($zipPath);

        if ($openResult !== true) {
            File::deleteDirectory($tempDir);
            throw new \RuntimeException('Failed to open ZIP archive. File may be corrupted.');
        }

        $extractPath = $tempDir.'/extracted';
        File::ensureDirectoryExists($extractPath);
        $zip->extractTo($extractPath);
        $zip->close();

        // Find module.json in root or immediate subdirectory
        $manifestPath = $extractPath.'/module.json';
        $moduleRoot = $extractPath;

        if (! File::exists($manifestPath)) {
            $subdirs = File::directories($extractPath);
            foreach ($subdirs as $subdir) {
                if (File::exists($subdir.'/module.json')) {
                    $manifestPath = $subdir.'/module.json';
                    $moduleRoot = $subdir;
                    break;
                }
            }
        }

        if (! File::exists($manifestPath)) {
            File::deleteDirectory($tempDir);
            throw new \RuntimeException('Invalid module ZIP: Missing module.json manifest in archive root.');
        }

        $manifest = json_decode(File::get($manifestPath), true);
        if (! is_array($manifest) || empty($manifest['slug']) || empty($manifest['name'])) {
            File::deleteDirectory($tempDir);
            throw new \RuntimeException('Invalid module.json: missing required name or slug properties.');
        }

        $area = $manifest['area'] ?? 'dashboard';
        if (! in_array($area, ['dashboard', 'admin', 'shared'], true)) {
            $area = 'dashboard';
        }

        $studlyName = Str::studly($manifest['name']);
        $targetDir = base_path("modules/{$area}/{$studlyName}");

        if (File::isDirectory($targetDir)) {
            File::deleteDirectory($targetDir);
        }

        File::ensureDirectoryExists(base_path("modules/{$area}"));
        File::copyDirectory($moduleRoot, $targetDir);
        File::deleteDirectory($tempDir);

        $slug = $manifest['slug'];
        $moduleModel = null;
        if ($autoInstall) {
            $moduleModel = $this->install($slug);
        }

        return [
            'slug' => $slug,
            'name' => $manifest['name'],
            'area' => $area,
            'manifest' => $manifest,
            'model' => $moduleModel,
        ];
    }

    /**
     * Generate a downloadable starter ZIP package for module developers.
     *
     * @param  array<string>|null  $permissions
     */
    public function generateStarterZip(
        string $name,
        string $area = 'dashboard',
        ?string $description = null,
        ?string $authorName = null,
        ?array $permissions = null
    ): string {
        $studlyName = Str::studly($name);
        $slug = Str::kebab($name);
        $areaNamespace = Str::studly($area);

        $tempDir = storage_path('app/temp/starter_'.Str::random(16));
        $modulePath = $tempDir.'/'.$studlyName;
        File::ensureDirectoryExists($modulePath);

        $subdirs = [
            'Database/Migrations',
            'Database/Seeders',
            'Http/Controllers',
            'Http/Requests',
            'Http/Resources',
            'Models',
            'Mcp',
            'Providers',
            'Routes',
            'Tests',
        ];

        foreach ($subdirs as $subdir) {
            File::ensureDirectoryExists("{$modulePath}/{$subdir}");
        }

        $replacements = [
            '{{STUDLY_NAME}}' => $studlyName,
            '{{SLUG}}' => $slug,
            '{{AREA}}' => $area,
            '{{AREA_NAMESPACE}}' => $areaNamespace,
        ];

        // 1. module.json
        $moduleManifest = [
            'name' => $studlyName,
            'slug' => $slug,
            'namespace' => "Modules\\{$areaNamespace}\\{$studlyName}",
            'version' => '1.0.0',
            'description' => $description ?: "{$studlyName} Module for ARX-ERP",
            'area' => $area,
            'icon' => 'icon.png',
            'banner' => 'banner.png',
            'author' => [
                'name' => $authorName ?: 'Developer',
                'url' => '',
            ],
            'core_version' => '>=1.0.0',
            'dependencies' => [],
            'permissions' => ! empty($permissions) ? $permissions : [
                "{$slug}.view",
                "{$slug}.create",
                "{$slug}.edit",
                "{$slug}.delete",
            ],
            'menu' => [
                'label' => Str::title(str_replace(['-', '_'], ' ', $name)),
                'icon' => 'box',
                'route' => "/{$slug}",
                'position' => 50,
                'permission' => "{$slug}.view",
                'children' => [],
            ],
            'settings' => new \stdClass,
        ];

        File::put(
            "{$modulePath}/module.json",
            json_encode($moduleManifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        // 2. ServiceProvider
        $this->generateFileFromStub(
            base_path('stubs/module/ServiceProvider.stub'),
            "{$modulePath}/Providers/{$studlyName}ServiceProvider.php",
            $replacements
        );

        // 3. Controller
        $this->generateFileFromStub(
            base_path('stubs/module/Controller.stub'),
            "{$modulePath}/Http/Controllers/{$studlyName}Controller.php",
            $replacements
        );

        // 4. Routes/api.php
        $this->generateFileFromStub(
            base_path('stubs/module/RoutesApi.stub'),
            "{$modulePath}/Routes/api.php",
            $replacements
        );

        // 5. README.md
        $this->generateFileFromStub(
            base_path('stubs/module/README.md.stub'),
            "{$modulePath}/README.md",
            $replacements
        );

        // 6. Assets (icon.png & banner.png)
        if (File::exists(base_path('stubs/module/icon.png'))) {
            File::copy(base_path('stubs/module/icon.png'), "{$modulePath}/icon.png");
        }
        if (File::exists(base_path('stubs/module/banner.png'))) {
            File::copy(base_path('stubs/module/banner.png'), "{$modulePath}/banner.png");
        }

        // Create Zip
        $exportDir = storage_path('app/exports');
        File::ensureDirectoryExists($exportDir);

        $zipPath = $exportDir."/Starter_{$studlyName}_Module.zip";
        if (File::exists($zipPath)) {
            File::delete($zipPath);
        }

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            File::deleteDirectory($tempDir);
            throw new \RuntimeException('Failed to create starter ZIP archive.');
        }

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($modulePath, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if (! $file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($tempDir) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }

        $zip->close();
        File::deleteDirectory($tempDir);

        return $zipPath;
    }

    /**
     * Export a module to a downloadable ZIP archive.
     */
    public function exportToZip(string $slug): string
    {
        $manifest = $this->discover()->get($slug);

        if (! $manifest || empty($manifest['path'])) {
            throw new \RuntimeException("Module '{$slug}' not found on filesystem.");
        }

        $moduleDir = $manifest['path'];
        $exportDir = storage_path('app/exports');
        File::ensureDirectoryExists($exportDir);

        $zipPath = $exportDir."/module_{$slug}.zip";
        if (File::exists($zipPath)) {
            File::delete($zipPath);
        }

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Failed to create ZIP archive on server.');
        }

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($moduleDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if (! $file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($moduleDir) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }

        $zip->close();

        return $zipPath;
    }

    /**
     * Permanently delete a module from the filesystem.
     */
    public function deleteFromDisk(string $slug): void
    {
        $manifest = $this->discover()->get($slug);

        if (! $manifest || empty($manifest['path'])) {
            throw new \RuntimeException("Module '{$slug}' not found on filesystem.");
        }

        // Uninstall if registered in database
        $this->uninstall($slug);

        // Delete filesystem directory
        if (File::isDirectory($manifest['path'])) {
            File::deleteDirectory($manifest['path']);
        }
    }

    /**
     * Helper to copy from stub template.
     *
     * @param  array<string, string>  $replacements
     */
    protected function generateFileFromStub(string $stubPath, string $targetPath, array $replacements): void
    {
        if (! File::exists($stubPath)) {
            return;
        }

        $content = File::get($stubPath);

        foreach ($replacements as $search => $replace) {
            $content = str_replace($search, $replace, $content);
        }

        File::put($targetPath, $content);
    }
}
