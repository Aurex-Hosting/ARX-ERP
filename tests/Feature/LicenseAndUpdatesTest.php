<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Services\BackupManager;
use App\Core\Services\LicenseManager;
use App\Core\Services\SettingsManager;
use App\Core\Services\UpdateManager;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LicenseAndUpdatesTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $regularUser;

    protected LicenseManager $licenseManager;

    protected UpdateManager $updateManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CoreSeeder::class);

        $this->superAdmin = User::where('email', 'admin@arx-erp.local')->first();
        $this->regularUser = User::factory()->create(['user_type' => 'user']);

        $this->licenseManager = app(LicenseManager::class);
        $this->updateManager = app(UpdateManager::class);
    }

    protected function tearDown(): void
    {
        // Clean up test updates directory if created
        $updatesDir = storage_path('app/updates');
        if (File::isDirectory($updatesDir)) {
            File::deleteDirectory($updatesDir);
        }

        parent::tearDown();
    }

    public function test_hardware_device_fingerprint_is_non_empty_and_consistent(): void
    {
        $id1 = $this->licenseManager->getInstallationId();
        $id2 = $this->licenseManager->getInstallationId();

        $this->assertNotEmpty($id1);
        $this->assertSame($id1, $id2);
        $this->assertSame(23, strlen($id1));
        $this->assertMatchesRegularExpression('/^ARX-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/', $id1);
    }

    public function test_signature_verification_detects_tampering_or_invalid_signature(): void
    {
        $data = [
            'success' => true,
            'message' => 'License activated successfully',
            'expiresAt' => '2026-09-28T06:29:04.565Z',
            'appSecret' => '1cbc0cf74ca7214a615fe9ab992b2f94',
        ];

        // A fake signature will fail validation against the RSA public key
        $fakeSignature = base64_encode('fake-signature-bytes');
        $isValid = $this->licenseManager->verifySignature($data, $fakeSignature);

        $this->assertFalse($isValid);
    }

    public function test_status_endpoint_requires_super_admin(): void
    {
        // Unauthenticated
        $this->getJson('/api/v1/admin/updates/status')->assertStatus(401);

        // Regular User
        $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/v1/admin/updates/status')
            ->assertStatus(403);

        // Super Admin
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/updates/status')
            ->assertStatus(200)
            ->assertJsonStructure([
                'current_version',
                'installation_id',
                'license',
                'backup_status',
            ]);

        $this->assertSame(
            $this->licenseManager->getInstallationId(),
            $response->json('installation_id')
        );
    }

    public function test_1_hour_backup_safety_gatekeeper_blocks_updates_if_no_recent_backup(): void
    {
        // Clean out any backups
        $backupDir = storage_path('app/backups');
        if (File::isDirectory($backupDir)) {
            File::deleteDirectory($backupDir);
        }

        $eligibility = $this->updateManager->checkBackupEligibility();
        $this->assertFalse($eligibility['eligible']);
        $this->assertSame('backup_required', $eligibility['reason']);

        // Attempting to apply an update without a fresh backup returns 422
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/updates/apply', [
                'release_name' => 'ARX-ERP 1.1.0',
                'version' => '1.1.0',
                'zip_hash' => 'dummy-hash',
            ])
            ->assertStatus(422)
            ->assertJson([
                'success' => false,
                'backup_required' => true,
            ]);
    }

    public function test_1_hour_backup_safety_gatekeeper_passes_with_fresh_backup(): void
    {
        $backupManager = app(BackupManager::class);
        $backupResult = $backupManager->createBackup('db', 'Safety gatekeeper test');

        $this->assertFileExists($backupResult['path']);

        $eligibility = $this->updateManager->checkBackupEligibility();
        $this->assertTrue($eligibility['eligible']);
        $this->assertSame($backupResult['filename'], $eligibility['recent_backup']['filename']);
    }

    public function test_check_updates_artisan_command_executes(): void
    {
        $this->artisan('updates:check')
            ->assertSuccessful();
    }

    public function test_rollback_endpoint_restores_from_snapshot(): void
    {
        $updatesDir = storage_path('app/updates');
        $rollbackDir = "{$updatesDir}/rollback_0.9.9";
        if (! File::isDirectory($rollbackDir)) {
            File::makeDirectory($rollbackDir, 0755, true, true);
        }

        File::put("{$rollbackDir}/rollback_manifest.json", json_encode([
            'version' => '0.9.9',
            'created_at' => now()->toIso8601String(),
        ]));

        $info = $this->updateManager->getRollbackInfo();
        $this->assertNotNull($info);
        $this->assertTrue($info['available']);
        $this->assertSame('0.9.9', $info['version']);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/updates/rollback')
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'restored_version' => '0.9.9',
            ]);
    }

    public function test_check_updates_api_rejects_invalid_cryptographic_signature(): void
    {
        $settingsManager = app(SettingsManager::class);
        $settingsManager->set('system.license.key', 'TEST-LICENSE-KEY', 'system', 'string');

        Http::fake([
            '*/api/v1/license/update' => Http::response([
                'data' => [
                    'latest_version' => '2.0.0',
                    'name' => 'ARX-ERP 2.0.0',
                    'notes' => 'Major release',
                ],
                'signature' => base64_encode('invalid-seal'),
            ], 200),
        ]);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/updates/check')
            ->assertStatus(200);

        $data = $response->json('data');
        $this->assertFalse($data['update_available']);
        $this->assertStringContainsString('signature could not be verified', $data['message']);

        // Assert audit log was recorded for check
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'update_checked',
            'user_id' => $this->superAdmin->id,
        ]);
    }

    public function test_user_with_updates_check_permission_can_view_status_but_not_apply(): void
    {
        $viewerUser = User::factory()->create(['user_type' => 'user']);
        $viewerUser->givePermissionTo('updates.check');

        // Can view status
        $this->actingAs($viewerUser, 'sanctum')
            ->getJson('/api/v1/admin/updates/status')
            ->assertStatus(200);

        // Cannot apply update (requires updates.apply)
        $this->actingAs($viewerUser, 'sanctum')
            ->postJson('/api/v1/admin/updates/apply', [
                'release_name' => 'v1.1.0',
                'version' => '1.1.0',
            ])
            ->assertStatus(403)
            ->assertJson([
                'message' => 'You do not have permission to download and apply system updates.',
            ]);

        // Cannot execute rollback (requires updates.revoke)
        $this->actingAs($viewerUser, 'sanctum')
            ->postJson('/api/v1/admin/updates/rollback')
            ->assertStatus(403);
    }

    public function test_audit_log_recorded_on_rollback(): void
    {
        $updatesDir = storage_path('app/updates');
        $rollbackDir = "{$updatesDir}/rollback_0.9.8";
        if (! File::isDirectory($rollbackDir)) {
            File::makeDirectory($rollbackDir, 0755, true, true);
        }

        File::put("{$rollbackDir}/rollback_manifest.json", json_encode([
            'version' => '0.9.8',
            'created_at' => now()->toIso8601String(),
        ]));

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/updates/rollback')
            ->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'update_rollback',
            'user_id' => $this->superAdmin->id,
        ]);
    }
}
