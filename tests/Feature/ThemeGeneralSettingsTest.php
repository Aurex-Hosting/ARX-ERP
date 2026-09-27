<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ThemeGeneralSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        Storage::fake('public');

        $this->superAdmin = User::where('email', 'admin@arx-erp.local')->first();
        $this->regularUser = User::factory()->create(['user_type' => 'user']);
    }

    public function test_public_can_get_general_branding_settings(): void
    {
        $response = $this->getJson('/api/v1/general-settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'settings' => [
                    'company_name',
                    'logo_dark',
                    'logo_light',
                    'favicon',
                    'copyright_text',
                    'auth_bg_dark',
                    'auth_bg_light',
                    'site_title_dashboard',
                    'site_title_admin',
                ],
            ]);
    }

    public function test_super_admin_can_update_general_text_settings(): void
    {
        $payload = [
            'company_name' => 'Acme Corporation',
            'copyright_text' => '© 2026 Acme Corp. All rights reserved.',
            'site_title_dashboard' => 'Acme ERP - User Hub',
            'site_title_admin' => 'Acme ERP - Executive Center',
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->putJson('/api/v1/admin/theme/general-settings', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('settings.company_name', 'Acme Corporation')
            ->assertJsonPath('settings.copyright_text', '© 2026 Acme Corp. All rights reserved.')
            ->assertJsonPath('settings.site_title_dashboard', 'Acme ERP - User Hub')
            ->assertJsonPath('settings.site_title_admin', 'Acme ERP - Executive Center');

        // Verify public endpoint reflects the update
        $publicRes = $this->getJson('/api/v1/general-settings');
        $publicRes->assertStatus(200)
            ->assertJsonPath('settings.company_name', 'Acme Corporation');
    }

    public function test_super_admin_can_upload_and_delete_branding_assets(): void
    {
        // 1. Upload Logo Dark
        $file = UploadedFile::fake()->image('custom_logo_dark.png', 400, 400);

        $uploadResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/theme/general-settings/upload', [
                'asset_type' => 'logo_dark',
                'file' => $file,
            ]);

        $uploadResponse->assertStatus(200)
            ->assertJsonPath('asset_type', 'logo_dark');

        $logoUrl = $uploadResponse->json('url');
        $this->assertNotEmpty($logoUrl);

        // 2. Upload Login Background Light
        $bgFile = UploadedFile::fake()->image('custom_bg_light.jpg', 1920, 1080);
        $bgUploadRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/theme/general-settings/upload', [
                'asset_type' => 'auth_bg_light',
                'file' => $bgFile,
            ]);

        $bgUploadRes->assertStatus(200)
            ->assertJsonPath('asset_type', 'auth_bg_light');

        // 3. Delete Logo Dark
        $deleteResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson('/api/v1/admin/theme/general-settings/asset/logo_dark');

        $deleteResponse->assertStatus(200)
            ->assertJsonPath('settings.logo_dark', null);
    }

    public function test_super_admin_can_save_settings_with_staged_files_and_deletions_atomically(): void
    {
        $logoFile = UploadedFile::fake()->image('staged_logo.png', 300, 300);
        $bgFile = UploadedFile::fake()->image('staged_bg.jpg', 1200, 800);

        $payload = [
            'company_name' => 'Staged Global Corp',
            'copyright_text' => '© 2026 Staged Global Corp. All rights reserved.',
            'site_title_dashboard' => 'Staged Dashboard',
            'site_title_admin' => 'Staged Admin',
            'logo_dark' => $logoFile,
            'auth_bg_dark' => $bgFile,
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/theme/general-settings', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('settings.company_name', 'Staged Global Corp')
            ->assertJsonPath('settings.copyright_text', '© 2026 Staged Global Corp. All rights reserved.')
            ->assertJsonPath('settings.site_title_dashboard', 'Staged Dashboard')
            ->assertJsonPath('settings.site_title_admin', 'Staged Admin');

        $this->assertNotNull($response->json('settings.logo_dark'));
        $this->assertNotNull($response->json('settings.auth_bg_dark'));

        // Next, test removing an asset via remove_assets upon Save
        $deletePayload = [
            'company_name' => 'Staged Global Corp',
            'remove_assets' => 'logo_dark',
        ];

        $deleteSaveResponse = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/theme/general-settings', $deletePayload);

        $deleteSaveResponse->assertStatus(200)
            ->assertJsonPath('settings.logo_dark', null);
        $this->assertNotNull($deleteSaveResponse->json('settings.auth_bg_dark'));
    }

    public function test_non_super_admin_without_permissions_cannot_update_general_settings(): void
    {
        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->putJson('/api/v1/admin/theme/general-settings', [
                'company_name' => 'Hacked Name',
            ]);

        $response->assertStatus(403);
    }

    public function test_user_with_general_manage_permission_can_update_general_settings(): void
    {
        $this->regularUser->givePermissionTo('themes.general.manage');

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->putJson('/api/v1/admin/theme/general-settings', [
                'company_name' => 'Permitted Company',
                'copyright_text' => '© 2026 Permitted',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('settings.company_name', 'Permitted Company');
    }

    public function test_user_with_only_general_view_permission_cannot_update_general_settings(): void
    {
        $this->regularUser->givePermissionTo('themes.general.view');

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->putJson('/api/v1/admin/theme/general-settings', [
                'company_name' => 'Forbidden Change',
            ]);

        $response->assertStatus(403);
    }

    public function test_user_with_quick_links_manage_permission_can_update_quick_links(): void
    {
        $this->regularUser->givePermissionTo('themes.quick_links.manage');

        $payload = [
            'quick_links_topbar' => json_encode([
                [
                    'id' => 'link_1',
                    'name' => 'Docs',
                    'url' => 'https://docs.example.com',
                    'icon_url' => null,
                ],
            ]),
        ];

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/admin/theme/general-settings', $payload);

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('settings.quick_links_topbar'));
        $this->assertSame('Docs', $response->json('settings.quick_links_topbar.0.name'));
    }

    public function test_user_with_only_quick_links_view_cannot_update_quick_links(): void
    {
        $this->regularUser->givePermissionTo('themes.quick_links.view');

        $payload = [
            'quick_links_topbar' => json_encode([
                [
                    'id' => 'link_1',
                    'name' => 'Docs',
                    'url' => 'https://docs.example.com',
                    'icon_url' => null,
                ],
            ]),
        ];

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/admin/theme/general-settings', $payload);

        $response->assertStatus(403);
    }
}
