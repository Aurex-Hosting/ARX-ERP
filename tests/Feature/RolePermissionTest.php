<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionTest extends TestCase
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

    public function test_can_list_roles_and_permissions(): void
    {
        $rolesRes = $this->getJson('/api/v1/admin/roles');
        $rolesRes->assertOk()
            ->assertJsonStructure([
                'roles' => [
                    '*' => ['id', 'name', 'is_system', 'users_count', 'permissions'],
                ],
            ]);

        $permsRes = $this->getJson('/api/v1/admin/permissions');
        $permsRes->assertOk()
            ->assertJsonStructure([
                'groups' => [
                    '*' => ['key', 'label', 'permissions'],
                ],
                'total_count',
            ]);
    }

    public function test_can_create_update_and_delete_custom_role(): void
    {
        // 1. Create Role
        $createRes = $this->postJson('/api/v1/admin/roles', [
            'name' => 'Finance Clerk',
            'permissions' => ['users.view', 'updates.check'],
        ]);

        $createRes->assertCreated()
            ->assertJson(['role' => ['name' => 'finance-clerk']]);

        $roleId = $createRes->json('role.id');

        // 2. Update Role Permissions
        $updateRes = $this->putJson("/api/v1/admin/roles/{$roleId}", [
            'permissions' => ['users.view', 'updates.check', 'audit_logs.view'],
        ]);

        $updateRes->assertOk();
        $role = Role::findById($roleId, 'web');
        $this->assertTrue($role->hasPermissionTo('audit_logs.view', 'web'));

        // 3. Delete Custom Role
        $deleteRes = $this->deleteJson("/api/v1/admin/roles/{$roleId}");
        $deleteRes->assertOk();
        $this->assertDatabaseMissing('roles', ['id' => $roleId]);
    }

    public function test_cannot_edit_or_delete_super_admin_role(): void
    {
        $superAdminRole = Role::findByName('super-admin', 'web');

        // Attempt update
        $updateResponse = $this->putJson("/api/v1/admin/roles/{$superAdminRole->id}", [
            'name' => 'super-admin-renamed',
            'permissions' => [],
        ]);
        $updateResponse->assertStatus(403)
            ->assertJson(['message' => "The 'super-admin' role is immutable and strictly cannot be edited or modified."]);

        // Attempt delete
        $deleteResponse = $this->deleteJson("/api/v1/admin/roles/{$superAdminRole->id}");
        $deleteResponse->assertStatus(403)
            ->assertJson(['message' => "The 'super-admin' role is immutable and strictly cannot be deleted."]);

        $this->assertDatabaseHas('roles', ['name' => 'super-admin']);
    }

    public function test_upcoming_permissions_automatically_applied_to_super_admin(): void
    {
        // 1. Create a brand new upcoming permission in the database (e.g. from newly installed module)
        $newPerm = Permission::create([
            'name' => 'future_crm.quantum_action',
            'guard_name' => 'web',
        ]);

        // 2. Super admin role must automatically have this permission in DB
        $superAdminRole = Role::findByName('super-admin', 'web');
        $this->assertTrue($superAdminRole->hasPermissionTo('future_crm.quantum_action', 'web'));

        // 3. Super admin user must pass Gate::allows / can checks automatically
        $this->assertTrue($this->admin->can('future_crm.quantum_action'));
        $this->assertTrue(Gate::forUser($this->admin)->allows('future_crm.quantum_action'));
        $this->assertTrue(Gate::forUser($this->admin)->allows('non_existent_yet_future_ability'));
    }
}
