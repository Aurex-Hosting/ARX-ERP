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
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_confirmed_at');
            }
            if (! Schema::hasColumn('users', 'failed_login_attempts')) {
                $table->unsignedTinyInteger('failed_login_attempts')->default(0)->after('is_active');
            }
            if (! Schema::hasColumn('users', 'failed_2fa_attempts')) {
                $table->unsignedTinyInteger('failed_2fa_attempts')->default(0)->after('failed_login_attempts');
            }
            if (! Schema::hasColumn('users', 'lockout_level')) {
                $table->unsignedTinyInteger('lockout_level')->default(0)->after('failed_2fa_attempts');
            }
            if (! Schema::hasColumn('users', 'locked_until')) {
                $table->timestamp('locked_until')->nullable()->after('lockout_level');
            }
            if (! Schema::hasColumn('users', 'locked_reason')) {
                $table->string('locked_reason')->nullable()->after('locked_until');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'two_factor_recovery_codes',
                'failed_login_attempts',
                'failed_2fa_attempts',
                'lockout_level',
                'locked_until',
                'locked_reason',
            ]);
        });
    }
};
