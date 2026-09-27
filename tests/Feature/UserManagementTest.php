<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);

        $this->admin = User::factory()->create([
            'user_type' => 'super_admin',
        ]);
        $this->admin->assignRole('super-admin');

        Sanctum::actingAs($this->admin);
    }

    public function test_can_list_and_search_users(): void
    {
        User::factory()->create([
            'name' => 'Alice Cooper',
            'email' => 'alice@arx-erp.local',
            'user_type' => 'user',
        ]);

        $response = $this->getJson('/api/v1/admin/users?search=Alice');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'user_type', 'is_active', 'roles'],
                ],
                'trash_count',
            ]);

        $this->assertEquals('Alice Cooper', $response->json('data.0.name'));
    }

    public function test_can_create_user_and_ai_agent_with_unique_identifier(): void
    {
        // 1. Create Human User with custom identifier
        $userRes = $this->postJson('/api/v1/admin/users', [
            'identifier' => 'A2C921',
            'name' => 'Saman Perera',
            'email' => 'saman@arx-erp.local',
            'password' => 'SecurePass123!',
            'user_type' => 'user',
            'roles' => ['user'],
        ]);

        $userRes->assertCreated();
        $this->assertDatabaseHas('users', ['identifier' => 'A2C921', 'email' => 'saman@arx-erp.local']);

        // 2. Can show and update user using public alphanumeric identifier (A2C921)
        $showRes = $this->getJson('/api/v1/admin/users/A2C921');
        $showRes->assertOk();
        $this->assertEquals('Saman Perera', $showRes->json('user.name'));
        $this->assertEquals('A2C921', $showRes->json('user.identifier'));

        $updateRes = $this->putJson('/api/v1/admin/users/A2C921', [
            'name' => 'Saman Updated',
        ]);
        $updateRes->assertOk();
        $this->assertEquals('Saman Updated', User::where('identifier', 'A2C921')->first()->name);

        // 3. Create AI Agent Identity with auto-generated identifier
        $agentRes = $this->postJson('/api/v1/admin/users', [
            'name' => 'Inventory Agent',
            'email' => 'inventory-agent@arx-erp.local',
            'password' => 'SecurePass123!',
            'user_type' => 'ai_agent',
            'roles' => ['ai-agent'],
        ]);

        $agentRes->assertCreated();
        $agentIdentifier = $agentRes->json('user.identifier');
        $this->assertNotEmpty($agentIdentifier);
        $this->assertEquals(6, strlen($agentIdentifier));
    }

    public function test_can_update_user_and_sync_roles(): void
    {
        $user = User::factory()->create([
            'name' => 'Charlie',
            'email' => 'charlie@arx-erp.local',
        ]);

        $response = $this->putJson("/api/v1/admin/users/{$user->id}", [
            'name' => 'Charlie Updated',
            'roles' => ['ai-agent'],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Charlie Updated',
        ]);
        $this->assertTrue($user->fresh()->hasRole('ai-agent'));
    }

    public function test_can_change_user_password(): void
    {
        $user = User::factory()->create([
            'name' => 'Dave',
            'email' => 'dave@arx-erp.local',
            'password' => Hash::make('OldPassword123!'),
        ]);

        $response = $this->putJson("/api/v1/admin/users/{$user->id}/password", [
            'password' => 'NewSecurePassword456!',
            'password_confirmation' => 'NewSecurePassword456!',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('NewSecurePassword456!', $user->fresh()->password));
    }

    public function test_can_toggle_user_status(): void
    {
        $user = User::factory()->create([
            'is_active' => true,
        ]);

        // Toggle to disabled
        $res1 = $this->putJson("/api/v1/admin/users/{$user->id}/toggle-status");
        $res1->assertOk();
        $this->assertFalse($user->fresh()->is_active);

        // Toggle back to active
        $res2 = $this->putJson("/api/v1/admin/users/{$user->id}/toggle-status");
        $res2->assertOk();
        $this->assertTrue($user->fresh()->is_active);
    }

    public function test_soft_delete_to_recycle_bin_and_restore(): void
    {
        $target = User::factory()->create([
            'name' => 'Eve In Trash',
            'email' => 'eve@arx-erp.local',
        ]);

        // 1. Move to Recycle Bin (soft delete)
        $deleteRes = $this->deleteJson("/api/v1/admin/users/{$target->id}");
        $deleteRes->assertOk();
        $this->assertSoftDeleted('users', ['id' => $target->id]);

        // 2. Query Recycle Bin
        $trashRes = $this->getJson('/api/v1/admin/users/trash');
        $trashRes->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'deleted_at', 'days_remaining'],
                ],
                'trash_count',
            ]);
        $this->assertEquals('Eve In Trash', $trashRes->json('data.0.name'));

        // 3. Restore from Recycle Bin
        $restoreRes = $this->postJson("/api/v1/admin/users/{$target->id}/restore");
        $restoreRes->assertOk();
        $this->assertNotSoftDeleted('users', ['id' => $target->id]);
    }

    public function test_force_delete_permanently(): void
    {
        $target = User::factory()->create();
        $target->delete(); // Soft delete

        $forceRes = $this->deleteJson("/api/v1/admin/users/{$target->id}/force");
        $forceRes->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_cannot_perform_self_destructive_actions(): void
    {
        // 1. Attempt deleting logged-in self
        $deleteRes = $this->deleteJson("/api/v1/admin/users/{$this->admin->id}");
        $deleteRes->assertStatus(422)
            ->assertJsonFragment(['message' => 'You cannot delete your own logged-in account.']);

        // 2. Attempt changing self password from directory
        $passwordRes = $this->putJson("/api/v1/admin/users/{$this->admin->id}/password", [
            'password' => 'NewSecretPassword123!',
            'password_confirmation' => 'NewSecretPassword123!',
        ]);
        $passwordRes->assertStatus(422)
            ->assertJsonFragment(['message' => 'You cannot change your own password from the User Management directory. Please use Profile Settings.']);

        // 3. Attempt disabling logged-in self
        $toggleRes = $this->putJson("/api/v1/admin/users/{$this->admin->id}/toggle-status");
        $toggleRes->assertStatus(422)
            ->assertJsonFragment(['message' => 'You cannot disable or modify the active status of your own account.']);

        // 4. Root admin protection
        $rootAdmin = User::where('email', 'admin@arx-erp.local')->first();
        if ($rootAdmin) {
            $rootRes = $this->deleteJson("/api/v1/admin/users/{$rootAdmin->id}");
            $rootRes->assertStatus(422);
        }
    }

    public function test_prune_trash_users_command(): void
    {
        $oldUser = User::factory()->create();
        $oldUser->delete();
        $oldUser->deleted_at = now()->subDays(31);
        $oldUser->saveQuietly();

        $recentUser = User::factory()->create();
        $recentUser->delete();
        $recentUser->deleted_at = now()->subDays(10);
        $recentUser->saveQuietly();

        $this->artisan('users:prune-trash')
            ->assertSuccessful();

        $this->assertDatabaseMissing('users', ['id' => $oldUser->id]);
        $this->assertSoftDeleted('users', ['id' => $recentUser->id]);
    }
}
