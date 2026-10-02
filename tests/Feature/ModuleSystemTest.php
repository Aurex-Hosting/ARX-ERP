<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;
use ZipArchive;

class ModuleSystemTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        $this->admin = User::where('email', 'admin@arx-erp.local')->first();
    }

    protected function tearDown(): void
    {
        // Cleanup test module folders
        $testDirs = [
            base_path('modules/dashboard/TestCrm'),
            base_path('modules/dashboard/ApiCreatedModule'),
            base_path('modules/dashboard/ZipUploadedModule'),
            storage_path('app/temp'),
            storage_path('app/exports'),
        ];

        foreach ($testDirs as $dir) {
            if (File::isDirectory($dir)) {
                File::deleteDirectory($dir);
            }
        }

        parent::tearDown();
    }

    public function test_can_scaffold_module_via_artisan_command(): void
    {
        $this->artisan('module:make', [
            'name' => 'TestCrm',
            '--area' => 'dashboard',
        ])->assertSuccessful();

        $this->assertDirectoryExists(base_path('modules/dashboard/TestCrm'));
        $this->assertFileExists(base_path('modules/dashboard/TestCrm/module.json'));
        $this->assertFileExists(base_path('modules/dashboard/TestCrm/Providers/TestCrmServiceProvider.php'));
        $this->assertFileExists(base_path('modules/dashboard/TestCrm/Routes/api.php'));
    }

    public function test_admin_can_create_module_via_api(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/modules/create', [
                'name' => 'ApiCreatedModule',
                'area' => 'dashboard',
                'description' => 'Test module created via API endpoint',
                'author' => 'Test Author',
                'auto_install' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('module.slug', 'api-created-module');

        $this->assertDirectoryExists(base_path('modules/dashboard/ApiCreatedModule'));
        $this->assertFileExists(base_path('modules/dashboard/ApiCreatedModule/module.json'));
        $this->assertDatabaseHas('modules', ['slug' => 'api-created-module', 'is_installed' => true]);
    }

    public function test_admin_can_upload_and_install_module_zip(): void
    {
        // Create temporary zip archive
        $tempDir = storage_path('app/temp/test_pack');
        File::ensureDirectoryExists($tempDir);

        $manifest = [
            'name' => 'ZipUploadedModule',
            'slug' => 'zip-uploaded-module',
            'version' => '1.0.0',
            'area' => 'dashboard',
            'description' => 'Zip uploaded package',
            'permissions' => ['zip-uploaded-module.view'],
        ];

        File::put($tempDir.'/module.json', json_encode($manifest));

        $zipFile = storage_path('app/temp/test_module.zip');
        $zip = new ZipArchive;
        $zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFile($tempDir.'/module.json', 'module.json');
        $zip->close();

        $uploadedFile = new UploadedFile(
            $zipFile,
            'test_module.zip',
            'application/zip',
            null,
            true
        );

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/modules/upload', [
                'module_zip' => $uploadedFile,
                'auto_install' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('module.slug', 'zip-uploaded-module');

        $this->assertDirectoryExists(base_path('modules/dashboard/ZipUploadedModule'));
        $this->assertDatabaseHas('modules', ['slug' => 'zip-uploaded-module', 'is_installed' => true]);
    }

    public function test_admin_can_install_enable_disable_and_delete_module(): void
    {
        $this->artisan('module:make', [
            'name' => 'TestCrm',
            '--area' => 'dashboard',
        ])->assertSuccessful();

        // 1. List modules
        $listResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/modules?area=dashboard');

        $listResponse->assertStatus(200)
            ->assertJsonFragment(['slug' => 'test-crm', 'is_installed' => false]);

        // 2. Install module
        $installResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/modules/test-crm/install');

        $installResponse->assertStatus(200)
            ->assertJsonPath('module.is_installed', true)
            ->assertJsonPath('module.is_enabled', true);

        // Verify permissions
        $this->assertDatabaseHas('permissions', ['name' => 'test-crm.view']);

        // 3. Disable module
        $disableResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/modules/test-crm/disable');

        $disableResponse->assertStatus(200)
            ->assertJsonPath('module.is_enabled', false);

        // 4. Enable module
        $enableResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/modules/test-crm/enable');

        $enableResponse->assertStatus(200)
            ->assertJsonPath('module.is_enabled', true);

        // 5. Export module as ZIP
        $exportResponse = $this->actingAs($this->admin, 'sanctum')
            ->get('/api/v1/admin/modules/test-crm/export');

        $exportResponse->assertStatus(200);

        // 6. Delete from disk
        $diskDeleteResponse = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson('/api/v1/admin/modules/test-crm/disk');

        $diskDeleteResponse->assertStatus(200);

        $this->assertDirectoryDoesNotExist(base_path('modules/dashboard/TestCrm'));
        $this->assertDatabaseMissing('modules', ['slug' => 'test-crm']);
    }

    public function test_admin_can_generate_and_download_starter_module_zip(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/modules/generate-starter', [
                'name' => 'StarterInventory',
                'area' => 'dashboard',
                'description' => 'A downloadable starter kit for Inventory',
                'author' => 'Starter Dev',
            ]);

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/zip');
    }

    public function test_can_stream_module_icon_and_banner_and_readme(): void
    {
        // 1. Icon stream
        $iconResponse = $this->get('/api/v1/modules/payables-debt/icon');
        $iconResponse->assertStatus(200)
            ->assertHeader('Content-Type', 'image/png');

        // 2. Banner stream
        $bannerResponse = $this->get('/api/v1/modules/payables-debt/banner');
        $bannerResponse->assertStatus(200)
            ->assertHeader('Content-Type', 'image/png');

        // 3. Readme preview endpoint
        $readmeResponse = $this->getJson('/api/v1/modules/payables-debt/readme');
        $readmeResponse->assertStatus(200)
            ->assertJsonPath('slug', 'payables-debt')
            ->assertJsonPath('has_readme', true)
            ->assertJsonStructure(['slug', 'name', 'has_readme', 'content', 'icon_url', 'banner_url']);

        $this->assertStringContainsString('Payables & Debt', $readmeResponse->json('content'));

        // 4. Admin modules list includes icon_url, banner_url, and has_readme
        $listResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/modules?area=dashboard');

        $listResponse->assertStatus(200);
        $modules = collect($listResponse->json('modules'));
        $payables = $modules->firstWhere('slug', 'payables-debt');

        $this->assertNotNull($payables);
        $this->assertTrue($payables['has_readme']);
        $this->assertNotNull($payables['icon_url']);
        $this->assertNotNull($payables['banner_url']);
    }
}
