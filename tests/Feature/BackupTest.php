<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\AuditLog;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class BackupTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Clean up any existing backups in storage/app/backups
        $backupDir = storage_path('app/backups');
        if (File::isDirectory($backupDir)) {
            $files = File::glob("{$backupDir}/*.zip");
            foreach ($files as $f) {
                File::delete($f);
            }
        }

        $this->seed(CoreSeeder::class);

        $this->superAdmin = User::where('email', 'admin@arx-erp.local')->first();
        $this->regularUser = User::factory()->create(['user_type' => 'user']);
    }

    protected function tearDown(): void
    {
        // Clean up any test backups created in storage/app/backups
        $backupDir = storage_path('app/backups');
        if (File::isDirectory($backupDir)) {
            $files = File::glob("{$backupDir}/*.zip");
            foreach ($files as $f) {
                File::delete($f);
            }
        }

        parent::tearDown();
    }

    public function test_super_admin_can_create_and_list_backups(): void
    {
        // 1. Create a Full Backup
        $createRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/backups', [
                'type' => 'full',
                'notes' => 'Initial full system snapshot',
            ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('backup.type', 'full')
            ->assertJsonPath('backup.notes', 'Initial full system snapshot');

        $filename = $createRes->json('backup.filename');
        $this->assertNotEmpty($filename);
        $this->assertFileExists(storage_path("app/backups/{$filename}"));

        // 2. List Backups
        $listRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/backups');

        $listRes->assertStatus(200)
            ->assertJsonPath('total_count', 1)
            ->assertJsonPath('backups.0.filename', $filename);

        // 3. Verify Audit Log was recorded
        $audit = AuditLog::where('action', 'backup.create')->first();
        $this->assertNotNull($audit);
        $this->assertSame($filename, $audit->metadata['filename']);
    }

    public function test_super_admin_can_download_and_delete_backup(): void
    {
        // 1. Create a database-only backup
        $createRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/backups', [
                'type' => 'db',
                'notes' => 'DB only backup for download test',
            ]);

        $filename = $createRes->json('backup.filename');

        // 2. Download Backup
        $downloadRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->get("/api/v1/admin/backups/{$filename}/download");

        $downloadRes->assertStatus(200);

        // Verify Download Audit Log
        $downloadAudit = AuditLog::where('action', 'backup.download')->first();
        $this->assertNotNull($downloadAudit);

        // 3. Delete Backup
        $deleteRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/backups/{$filename}");

        $deleteRes->assertStatus(200);
        $this->assertFileDoesNotExist(storage_path("app/backups/{$filename}"));

        // Verify Delete Audit Log
        $deleteAudit = AuditLog::where('action', 'backup.delete')->first();
        $this->assertNotNull($deleteAudit);
    }

    public function test_super_admin_can_restore_system_from_backup(): void
    {
        // 1. Create a test user before taking backup
        $preUser = User::factory()->create(['name' => 'Pre Backup Person', 'email' => 'pre@example.com']);

        // 2. Create full backup
        $createRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/backups', [
                'type' => 'full',
                'notes' => 'Restore test baseline',
            ]);

        $filename = $createRes->json('backup.filename');

        // 3. Make modifications after backup
        $preUser->name = 'Modified Post Backup Name';
        $preUser->save();

        $this->assertSame('Modified Post Backup Name', User::find($preUser->id)->name);

        // 4. Trigger Restore
        $restoreRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/admin/backups/{$filename}/restore");

        $restoreRes->assertStatus(200)
            ->assertJsonPath('result.success', true);

        // 5. Verify Database data was restored to baseline
        $restoredUser = User::find($preUser->id);
        $this->assertNotNull($restoredUser);
        $this->assertSame('Pre Backup Person', $restoredUser->name);

        // Verify Restore Audit Log
        $restoreAudit = AuditLog::where('action', 'backup.restore')->first();
        $this->assertNotNull($restoreAudit);
    }

    public function test_upload_and_restore_external_backup_archive(): void
    {
        // Create a valid dummy backup zip in temp memory
        $tempZipPath = tempnam(sys_get_temp_dir(), 'test_zip_').'.zip';
        $zip = new ZipArchive;
        $zip->open($tempZipPath, ZipArchive::CREATE);
        $zip->addFromString('manifest.json', json_encode([
            'type' => 'files',
            'created_at' => now()->toISOString(),
            'created_by' => 'Tester',
        ]));
        $zip->addFromString('storage/test_restored_asset.txt', 'Hello Restored Asset Content');
        $zip->close();

        $uploadedFile = new UploadedFile($tempZipPath, 'external_backup.zip', 'application/zip', null, true);

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/backups/upload-restore', [
                'file' => $uploadedFile,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('result.success', true);

        // Verify the storage file was extracted and synced
        $this->assertFileExists(storage_path('app/public/test_restored_asset.txt'));
        $this->assertSame('Hello Restored Asset Content', File::get(storage_path('app/public/test_restored_asset.txt')));

        // Cleanup
        if (File::exists(storage_path('app/public/test_restored_asset.txt'))) {
            File::delete(storage_path('app/public/test_restored_asset.txt'));
        }
        if (File::exists($tempZipPath)) {
            File::delete($tempZipPath);
        }
    }

    public function test_granular_rbac_permissions_for_backups(): void
    {
        // 1. Unprivileged user gets 403
        $listRes = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/v1/admin/backups');
        $listRes->assertStatus(403);

        $createRes = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/admin/backups', ['type' => 'full']);
        $createRes->assertStatus(403);

        // 2. Give backups.view permission
        $this->regularUser->givePermissionTo('backups.view');

        $permittedListRes = $this->actingAs($this->regularUser, 'sanctum')
            ->getJson('/api/v1/admin/backups');
        $permittedListRes->assertStatus(200);

        // Still cannot create without backups.create
        $forbiddenCreateRes = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/admin/backups', ['type' => 'full']);
        $forbiddenCreateRes->assertStatus(403);

        // 3. Give backups.create permission
        $this->regularUser->givePermissionTo('backups.create');
        $permittedCreateRes = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson('/api/v1/admin/backups', ['type' => 'db']);
        $permittedCreateRes->assertStatus(201);
    }
}
