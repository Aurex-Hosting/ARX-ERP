<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
    }

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'secret1234',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'user_type', 'roles'],
                'token',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'user_type' => 'user',
        ]);
    }

    public function test_user_can_login_and_fetch_profile(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@arx-erp.local',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'email', 'is_super_admin'],
                'token',
            ]);

        $token = $response->json('token');

        $profileResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/user');

        $profileResponse->assertStatus(200)
            ->assertJsonPath('user.email', 'admin@arx-erp.local')
            ->assertJsonPath('user.is_super_admin', true);
    }

    public function test_user_can_create_scoped_api_tokens(): void
    {
        $admin = User::where('email', 'admin@arx-erp.local')->first();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/auth/tokens', [
                'name' => 'Agent Token',
                'abilities' => ['inventory.read', 'contacts.read'],
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'token',
                'name',
                'abilities',
            ])
            ->assertJsonPath('abilities', ['inventory.read', 'contacts.read']);
    }

    public function test_user_can_upload_and_delete_avatar_via_multipart(): void
    {
        Storage::fake('public');
        $admin = User::where('email', 'admin@arx-erp.local')->first();

        $file = UploadedFile::fake()->image('avatar.jpg', 200, 200);

        $response = $this->actingAs($admin, 'sanctum')
            ->post('/api/v1/auth/profile/avatar', [
                'avatar' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Profile picture updated successfully.');

        $admin->refresh();
        $this->assertNotNull($admin->avatar_url);
        Storage::disk('public')->assertExists($admin->avatar_url);

        // Stream avatar
        $streamResponse = $this->actingAs($admin, 'sanctum')
            ->get('/api/v1/auth/profile/avatar');
        $streamResponse->assertStatus(200);

        // Delete avatar
        $deleteResponse = $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/v1/auth/profile/avatar');
        $deleteResponse->assertStatus(200);

        $admin->refresh();
        $this->assertNull($admin->avatar_url);
    }

    public function test_user_can_upload_avatar_via_base64(): void
    {
        Storage::fake('public');
        $admin = User::where('email', 'admin@arx-erp.local')->first();

        // 1x1 transparent PNG base64
        $base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/auth/profile/avatar', [
                'avatar' => $base64,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Profile picture updated successfully.');

        $admin->refresh();
        $this->assertNotNull($admin->avatar_url);
        Storage::disk('public')->assertExists($admin->avatar_url);
    }

    public function test_user_can_upload_and_delete_banner(): void
    {
        Storage::fake('public');
        $admin = User::where('email', 'admin@arx-erp.local')->first();

        $file = UploadedFile::fake()->image('banner.jpg', 1200, 400);

        $response = $this->actingAs($admin, 'sanctum')
            ->post('/api/v1/auth/profile/banner', [
                'banner' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Profile banner updated successfully.');

        $admin->refresh();
        $this->assertNotNull($admin->banner_url);
        Storage::disk('public')->assertExists($admin->banner_url);

        // Delete banner
        $deleteResponse = $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/v1/auth/profile/banner');
        $deleteResponse->assertStatus(200);

        $admin->refresh();
        $this->assertNull($admin->banner_url);
    }
}
