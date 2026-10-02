<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ThemeDashboardWidgetsTest extends TestCase
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

    public function test_authenticated_user_can_get_dashboard_widgets_config(): void
    {
        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/v1/theme/dashboard-widgets');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'config' => [
                    'layout',
                    'profile_widget' => [
                        'id',
                        'enabled',
                        'size',
                        'title',
                        'show_joined_date',
                        'show_user_id',
                        'show_email_spoiler',
                    ],
                    'banner_widget' => [
                        'id',
                        'enabled',
                        'size',
                        'slideshow_enabled',
                        'slides',
                    ],
                    'custom_widgets',
                    'payables_widget',
                ],
            ]);
    }

    public function test_unauthenticated_user_cannot_access_admin_dashboard_widgets(): void
    {
        $response = $this->getJson('/api/v1/admin/theme/dashboard-widgets');
        $response->assertStatus(401);
    }

    public function test_user_without_permission_cannot_access_or_modify_admin_dashboard_widgets(): void
    {
        $getResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/v1/admin/theme/dashboard-widgets');
        $getResponse->assertStatus(403);

        $postResponse = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/admin/theme/dashboard-widgets', ['config' => []]);
        $postResponse->assertStatus(403);
    }

    public function test_super_admin_can_update_dashboard_widgets_and_creates_audit_log(): void
    {
        $payload = [
            'config' => [
                'layout' => [
                    'widget_profile',
                    'widget_banner',
                    'custom_api_modular',
                    'widget_payables_calendar',
                ],
                'profile_widget' => [
                    'id' => 'widget_profile',
                    'enabled' => true,
                    'size' => '1/4',
                    'title' => 'My Account',
                    'show_joined_date' => true,
                    'show_user_id' => true,
                    'show_email_spoiler' => true,
                ],
                'banner_widget' => [
                    'id' => 'widget_banner',
                    'enabled' => true,
                    'size' => '4/4',
                    'slideshow_enabled' => true,
                    'slides' => [
                        [
                            'id' => 'slide_1',
                            'title' => 'Innovative Workspace',
                            'title_use_gradient' => true,
                            'title_color' => '#ffffff',
                            'title_gradient_from' => '#ec4899',
                            'title_gradient_to' => '#8b5cf6',
                            'title_gradient_dir' => 'to-r',
                            'subtitle' => 'Release v2.5',
                            'subtitle_use_gradient' => false,
                            'subtitle_color' => '#f59e0b',
                            'description' => 'Welcome to your optimized enterprise dashboard.',
                            'overlay_opacity' => 0.4,
                            'bg_blur' => 4,
                            'buttons' => [
                                [
                                    'id' => 'btn_test',
                                    'text' => 'Get Started',
                                    'url' => '/dashboard',
                                    'bg_color' => '#8b5cf6',
                                    'text_color' => '#ffffff',
                                    'style' => 'gradient',
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
                        'title' => 'API-First Modular Engine',
                        'description' => 'Custom description here.',
                        'icon' => 'Layers',
                        'badge' => 'Active',
                        'color' => '#7c3aed',
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/theme/dashboard-widgets', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('config.profile_widget.title', 'My Account')
            ->assertJsonPath('config.profile_widget.size', '1/4')
            ->assertJsonPath('config.banner_widget.slides.0.title', 'Innovative Workspace');

        // Verify Audit Log was recorded
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'theme.dashboard_widgets.update',
            'user_id' => $this->superAdmin->id,
        ]);
    }

    public function test_super_admin_can_upload_slide_background_and_profile_background(): void
    {
        $slideFile = UploadedFile::fake()->image('slide_bg.jpg', 800, 400);
        $profileBgFile = UploadedFile::fake()->image('profile_bg.jpg', 600, 300);

        $config = [
            'layout' => ['widget_profile', 'widget_banner'],
            'profile_widget' => [
                'enabled' => true,
                'size' => '1/4',
            ],
            'banner_widget' => [
                'enabled' => true,
                'slideshow_enabled' => true,
                'slides' => [
                    [
                        'id' => 'slide_special',
                        'title' => 'Uploaded Banner',
                    ],
                ],
            ],
            'custom_widgets' => [],
        ];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->post('/api/v1/admin/theme/dashboard-widgets', [
                'config' => json_encode($config),
                'profile_bg_file' => $profileBgFile,
                'slide_bg_file_slide_special' => $slideFile,
            ]);

        $response->assertStatus(200);

        $data = $response->json('config');
        $this->assertNotNull($data['profile_widget']['custom_bg_url']);
        $this->assertNotNull($data['banner_widget']['slides'][0]['bg_image_url']);
    }

    public function test_user_with_dashboard_manage_permission_can_update(): void
    {
        $perm = Permission::firstOrCreate(['name' => 'themes.dashboard.manage', 'guard_name' => 'web']);
        $this->regularUser->givePermissionTo($perm);

        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/admin/theme/dashboard-widgets', [
                'config' => [
                    'layout' => ['widget_profile'],
                    'profile_widget' => ['title' => 'Permitted Title'],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('config.profile_widget.title', 'Permitted Title');
    }
}
