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
        Schema::create('api_keys', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('key_id', 64)->unique();
            $table->string('key_hash', 128);
            $table->string('secret_preview', 32);
            $table->json('permissions')->nullable();
            $table->json('allowed_endpoints')->nullable();
            $table->unsignedInteger('rate_limit')->default(60); // req/min
            $table->string('ip_restriction_type', 20)->default('none'); // none, whitelist, blacklist
            $table->json('ip_addresses')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->string('last_used_ip', 45)->nullable();
            $table->unsignedBigInteger('total_requests')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['key_id', 'is_active']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};
