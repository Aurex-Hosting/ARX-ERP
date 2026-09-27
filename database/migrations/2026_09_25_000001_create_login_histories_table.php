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
        Schema::create('login_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('personal_access_token_id')->nullable()->index();
            $table->string('email')->index();
            $table->string('status', 30)->default('success')->index(); // success, failed, locked, suspicious
            $table->string('failure_reason')->nullable();
            $table->string('ip_address', 45)->nullable()->index();
            $table->text('user_agent')->nullable();
            $table->string('device_type', 30)->nullable(); // desktop, mobile, tablet, bot, unknown
            $table->string('device_fingerprint', 64)->nullable()->index();
            $table->string('browser', 50)->nullable();
            $table->string('browser_version', 30)->nullable();
            $table->string('platform', 50)->nullable(); // Windows, macOS, Linux, iOS, Android
            $table->string('location', 100)->nullable();
            $table->boolean('is_revoked')->default(false)->index();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_active_at')->nullable();
            $table->timestamp('login_at')->useCurrent()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('login_histories');
    }
};
