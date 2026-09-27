<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Mail Server Setup Configuration (Single Row)
        Schema::create('mail_configurations', function (Blueprint $table): void {
            $table->id();
            $table->boolean('is_enabled')->default(false);
            $table->string('host')->nullable();
            $table->integer('port')->default(587);
            $table->string('username')->nullable();
            $table->text('password')->nullable();
            $table->string('encryption')->default('tls'); // tls, ssl, none
            $table->string('from_address')->nullable();
            $table->string('from_name')->nullable();
            $table->timestamp('last_tested_at')->nullable();
            $table->string('last_test_status')->nullable(); // 'success', 'failed'
            $table->text('last_test_message')->nullable();
            $table->timestamps();
        });

        // 2. Feature Trigger Hooks & Custom Placeholders Configuration
        Schema::create('mail_hooks_configuration', function (Blueprint $table): void {
            $table->id();
            $table->boolean('hook_user_pwd_change')->default(true);
            $table->boolean('hook_forgot_password')->default(true);
            $table->boolean('hook_verify_email_on_created')->default(true);
            $table->boolean('hook_account_status_change')->default(true);
            $table->boolean('hook_notify_broadcast')->default(true);
            $table->jsonb('custom_placeholders')->nullable();
            $table->timestamps();
        });

        // 3. Dynamic Email Templates
        Schema::create('mail_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('subject');
            $table->text('body_html');
            $table->text('body_plain')->nullable();
            $table->string('action_button_label')->nullable();
            $table->jsonb('placeholders_schema')->nullable();
            $table->timestamps();
        });

        // 4. Secure 10-Minute Action Tokens (Password reset, Verification, etc.)
        Schema::create('secure_action_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token_hash', 64)->index();
            $table->string('token_type', 50)->index(); // 'password_reset', 'email_verification'
            $table->jsonb('payload')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('used_at')->nullable()->index();
            $table->timestamps();
        });

        // 5. Register Mail Permissions
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'mail.view',
            'mail.manage',
            'mail.test',
            'mail.templates',
        ];

        foreach ($permissions as $permName) {
            $perm = Permission::firstOrCreate(['name' => $permName]);
            $superAdmin = Role::where('name', 'super-admin')->first();
            if ($superAdmin) {
                $superAdmin->givePermissionTo($perm);
            }
            $aiAgent = Role::where('name', 'ai-agent')->first();
            if ($aiAgent) {
                $aiAgent->givePermissionTo($perm);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('secure_action_tokens');
        Schema::dropIfExists('mail_templates');
        Schema::dropIfExists('mail_hooks_configuration');
        Schema::dropIfExists('mail_configurations');

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Permission::whereIn('name', [
            'mail.view',
            'mail.manage',
            'mail.test',
            'mail.templates',
        ])->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
