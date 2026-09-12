<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->json('allowed_ips')->nullable()->after('rate_limit');
            $table->json('blocked_ips')->nullable()->after('allowed_ips');
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn(['allowed_ips', 'blocked_ips']);
        });
    }
};
