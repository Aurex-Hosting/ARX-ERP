<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payables', function (Blueprint $table): void {
            if (! Schema::hasColumn('payables', 'loan_type')) {
                $table->string('loan_type', 30)->default('long_time')->nullable()->after('type');
            }
            if (! Schema::hasColumn('payables', 'target_due_date')) {
                $table->date('target_due_date')->nullable()->after('start_date');
            }
            if (! Schema::hasColumn('payables', 'interval_count')) {
                $table->unsignedInteger('interval_count')->default(1)->nullable()->after('frequency');
            }
            if (! Schema::hasColumn('payables', 'interval_unit')) {
                $table->string('interval_unit', 20)->default('months')->nullable()->after('interval_count');
            }
            if (! Schema::hasColumn('payables', 'interest_period_count')) {
                $table->unsignedInteger('interest_period_count')->default(1)->nullable()->after('interest_rate');
            }
            if (! Schema::hasColumn('payables', 'interest_period_unit')) {
                $table->string('interest_period_unit', 20)->default('years')->nullable()->after('interest_period_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payables', function (Blueprint $table): void {
            $table->dropColumn([
                'loan_type',
                'target_due_date',
                'interval_count',
                'interval_unit',
                'interest_period_count',
                'interest_period_unit',
            ]);
        });
    }
};
