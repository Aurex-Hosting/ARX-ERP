<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payable_notification_configs', function (Blueprint $table): void {
            $table->id();
            $table->enum('audience_type', [
                'all_users',
                'specific_roles',
                'all_except_roles',
                'all_except_users',
                'selected_users_and_roles',
                'selected_roles_except_users',
            ])->default('all_users');
            $table->json('selected_user_ids')->nullable();
            $table->json('selected_role_ids')->nullable();
            $table->json('excluded_user_ids')->nullable();
            $table->json('excluded_role_ids')->nullable();
            $table->unsignedInteger('notify_due_soon_days')->default(5);
            $table->boolean('notify_overdue')->default(true);
            $table->boolean('enable_in_app')->default(true);
            $table->boolean('enable_email')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payable_notification_configs');
    }
};
