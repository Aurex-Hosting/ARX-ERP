<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payables', function (Blueprint $table): void {
            $table->id();
            $table->enum('type', ['invoice', 'subscription', 'loan']);
            $table->string('title');
            $table->string('vendor_name');
            $table->string('category')->default('General');
            $table->string('reference_no')->nullable();
            $table->string('currency', 10)->default('USD');
            $table->decimal('total_amount', 15, 2);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->enum('status', ['pending', 'due_soon', 'overdue', 'paid', 'cancelled'])->default('pending');

            // Recurring Settings
            $table->boolean('is_recurring')->default(false);
            $table->enum('frequency', ['monthly', 'quarterly', 'yearly'])->nullable();
            $table->unsignedInteger('interval_count')->default(1)->nullable();
            $table->string('interval_unit', 20)->default('months')->nullable();
            $table->date('start_date')->nullable();
            $table->date('target_due_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('repeat_indefinitely')->default(false);
            $table->unsignedInteger('pregeneration_days')->default(7);

            // Subscription Specific
            $table->string('plan_tier')->nullable();
            $table->string('payment_method_info')->nullable();
            $table->boolean('auto_renew')->default(false);
            $table->unsignedInteger('notice_period_days')->default(14);

            // Loan Specific
            $table->string('loan_type', 30)->default('long_time')->nullable();
            $table->decimal('principal_amount', 15, 2)->nullable();
            $table->decimal('interest_rate', 6, 3)->nullable();
            $table->enum('interest_frequency', ['daily', 'monthly', 'yearly'])->nullable();
            $table->unsignedInteger('interest_period_count')->default(1)->nullable();
            $table->string('interest_period_unit', 20)->default('years')->nullable();
            $table->enum('calculation_method', ['flat', 'simple', 'compounding'])->nullable();
            $table->unsignedInteger('tenure_months')->nullable();
            $table->unsignedInteger('grace_period_days')->default(0);
            $table->enum('penalty_type', ['fixed_fee', 'daily_percentage'])->nullable();
            $table->decimal('penalty_rate', 8, 2)->default(0);
            $table->unsignedTinyInteger('payment_day_of_month')->nullable();

            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index('vendor_name');
            $table->index('start_date');
            $table->index('end_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payables');
    }
};
