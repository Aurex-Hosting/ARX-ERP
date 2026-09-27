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
        Schema::table('roles', function (Blueprint $table): void {
            if (! Schema::hasColumn('roles', 'display_name')) {
                $table->string('display_name')->nullable()->after('name');
            }
            if (! Schema::hasColumn('roles', 'description')) {
                $table->text('description')->nullable()->after('display_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $columnsToDrop = [];
            if (Schema::hasColumn('roles', 'display_name')) {
                $columnsToDrop[] = 'display_name';
            }
            if (Schema::hasColumn('roles', 'description')) {
                $columnsToDrop[] = 'description';
            }
            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
