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
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('area')->default('dashboard')->index(); // 'dashboard' | 'admin' | 'both'
            $table->string('version')->default('1.0.0');
            $table->text('description')->nullable();
            $table->boolean('is_installed')->default(false)->index();
            $table->boolean('is_enabled')->default(false)->index();
            $table->jsonb('manifest')->nullable();
            $table->jsonb('settings')->nullable();
            $table->timestamp('installed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
