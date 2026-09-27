<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Broadcast / System dispatched notifications master table
        Schema::create('broadcast_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->string('type')->default('info'); // info, success, warning, danger, announcement, security, system
            $table->json('action_buttons')->nullable(); // Array of { label, url, style, external }
            $table->boolean('enable_reactions')->default(true);
            $table->string('target_type')->default('all'); // all, users, roles, all_except_users, all_except_roles
            $table->json('target_user_ids')->nullable();
            $table->json('target_role_ids')->nullable();
            $table->json('excluded_user_ids')->nullable();
            $table->json('excluded_role_ids')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->string('repeat_interval')->nullable(); // daily, weekly, monthly, null
            $table->string('status')->default('sent'); // draft, scheduled, sent, cancelled
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('recipients_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'scheduled_at']);
            $table->index('created_at');
        });

        // Individual user notification inboxes
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('broadcast_notification_id')->nullable()->constrained('broadcast_notifications')->nullOnDelete();
            $table->string('title');
            $table->text('body');
            $table->string('type')->default('info'); // info, success, warning, danger, announcement, security, system
            $table->string('category')->default('system'); // login_alert, security_alert, announcement, system, manual
            $table->json('action_buttons')->nullable();
            $table->boolean('enable_reactions')->default(false);
            $table->json('metadata')->nullable(); // ip, device, extra details
            $table->timestamp('read_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index(['user_id', 'category']);
            $table->index(['user_id', 'created_at']);
        });

        // Emoji reactions on notifications
        Schema::create('user_notification_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_notification_id')->constrained('user_notifications')->cascadeOnDelete();
            $table->foreignId('broadcast_notification_id')->nullable()->constrained('broadcast_notifications')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reaction'); // fire, thumbs_up, smile, laugh, handshake, cry, angry
            $table->timestamps();

            $table->unique(['user_notification_id', 'user_id'], 'unique_user_notification_reaction');
            $table->index(['broadcast_notification_id', 'reaction']);
            $table->index(['user_notification_id', 'reaction']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_notification_reactions');
        Schema::dropIfExists('user_notifications');
        Schema::dropIfExists('broadcast_notifications');
    }
};
