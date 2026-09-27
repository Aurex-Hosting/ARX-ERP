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
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('request_id', 36)->nullable()->index()->after('id');
            $table->string('user_identifier', 50)->nullable()->index()->after('user_type');
            $table->string('model_identifier', 50)->nullable()->index()->after('model_id');
            $table->text('description')->nullable()->after('model_identifier');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn([
                'request_id',
                'user_identifier',
                'model_identifier',
                'description',
            ]);
        });
    }
};
