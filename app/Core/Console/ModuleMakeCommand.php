<?php

declare(strict_types=1);

namespace App\Core\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ModuleMakeCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'module:make 
                            {name : The name of the module (e.g. ContactsCRM)}
                            {--area=dashboard : Target area: dashboard, admin, or shared}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scaffold a new modular ERP package for ARX-ERP';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $name = (string) $this->argument('name');
        $area = (string) $this->option('area');

        if (! in_array($area, ['dashboard', 'admin', 'shared'], true)) {
            $this->error("Invalid area: {$area}. Allowed values are 'dashboard', 'admin', or 'shared'.");

            return self::FAILURE;
        }

        $studlyName = Str::studly($name);
        $slug = Str::kebab($name);
        $areaNamespace = Str::studly($area);

        $modulePath = base_path("modules/{$area}/{$studlyName}");

        if (File::isDirectory($modulePath)) {
            $this->error("Module {$studlyName} already exists at {$modulePath}!");

            return self::FAILURE;
        }

        $this->info("Scaffolding module [{$studlyName}] in area [{$area}]...");

        // Create directory structure
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
        $this->generateFileFromStub(
            base_path('stubs/module/module.json.stub'),
            "{$modulePath}/module.json",
            $replacements
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

        $this->info("Module [{$studlyName}] scaffolded successfully at modules/{$area}/{$studlyName}!");
        $this->line("Run: <comment>php artisan module:install {$slug}</comment> via API or CLI to activate.");

        return self::SUCCESS;
    }

    /**
     * Generate file from stub template with variable replacements.
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
