<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_request_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('system_application_id')->nullable()->constrained()->nullOnDelete();
            $table->string('endpoint');
            $table->string('method');
            $table->string('ip_address')->nullable();
            $table->integer('status_code');
            $table->text('status_message')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_request_logs');
    }
};
