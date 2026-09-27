<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);
        Storage::fake('local');
    }

    public function test_authenticated_user_can_fetch_profile_details(): void
    {
        $user = User::factory()->create([
            'first_name' => 'Alex',
            'last_name' => 'Mercer',
            'phone_country_code_1' => '+1',
            'phone_1' => '5551234',
            'phone_country_code_2' => '+94',
            'phone_2' => '771234567',
            'country' => 'Sri Lanka',
            'city' => 'Colombo',
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/profile');

        $response->assertStatus(200)
            ->assertJsonPath('profile.identifier', $user->identifier)
            ->assertJsonPath('profile.first_name', 'Alex')
            ->assertJsonPath('profile.last_name', 'Mercer')
            ->assertJsonPath('profile.phone_2', '771234567')
            ->assertJsonPath('profile.country', 'Sri Lanka');
    }

    public function test_user_can_update_profile_and_name_is_synced(): void
    {
        $user = User::factory()->create([
            'first_name' => 'Old',
            'last_name' => 'Name',
            'phone_country_code_2' => '+1',
            'phone_2' => '111222333',
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/auth/profile', [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'phone_country_code_1' => '+44',
                'phone_1' => '2079460192',
                'phone_country_code_2' => '+1',
                'phone_2' => '4155552671',
                'country' => 'United Kingdom',
                'province_state' => 'Greater London',
                'city' => 'London',
                'postal_code' => 'SW1A 1AA',
                'address_line_1' => '10 Downing Street',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('profile.name', 'John Doe')
            ->assertJsonPath('profile.first_name', 'John')
            ->assertJsonPath('profile.last_name', 'Doe')
            ->assertJsonPath('profile.phone_2', '4155552671');

        $user->refresh();
        $this->assertEquals('John Doe', $user->name);
        $this->assertEquals('10 Downing Street', $user->address_line_1);
    }

    public function test_phone_1_and_phone_2_are_required_for_profile_update(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/auth/profile', [
                'first_name' => 'John',
                'last_name' => 'Doe',
                // phone_1 and phone_2 missing
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone_country_code_1', 'phone_1', 'phone_country_code_2', 'phone_2']);
    }

    public function test_user_can_upload_and_stream_avatar_from_private_storage(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $file = UploadedFile::fake()->image('avatar.jpg', 200, 200);

        $uploadResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/profile/avatar', [
                'avatar' => $file,
            ]);

        $uploadResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'avatar_url']);

        $user->refresh();
        $this->assertNotNull($user->avatar_url);
        Storage::disk('public')->assertExists($user->avatar_url);

        // Stream avatar with auth token
        $streamResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->get('/api/v1/auth/profile/avatar');

        $streamResponse->assertStatus(200);

        // Delete avatar
        $deleteResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/v1/auth/profile/avatar');

        $deleteResponse->assertStatus(200);
        $user->refresh();
        $this->assertNull($user->avatar_url);
    }

    public function test_user_can_upload_and_remove_banner_from_private_storage(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $file = UploadedFile::fake()->image('banner.jpg', 1200, 400);

        $uploadResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/profile/banner', [
                'image' => $file,
            ]);

        $uploadResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'banner_url']);

        $user->refresh();
        $this->assertNotNull($user->banner_url);
        Storage::disk('public')->assertExists($user->banner_url);

        // Stream banner with auth token
        $streamResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->get('/api/v1/auth/profile/banner');

        $streamResponse->assertStatus(200);

        // Delete banner
        $deleteResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/v1/auth/profile/banner');

        $deleteResponse->assertStatus(200);
        $user->refresh();
        $this->assertNull($user->banner_url);
    }
}
