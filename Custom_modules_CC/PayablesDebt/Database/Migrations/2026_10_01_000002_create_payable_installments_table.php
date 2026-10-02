<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payable_installments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payable_id')->constrained('payables')->cascadeOnDelete();
            $table->unsignedInteger('installment_number')->default(1);
            $table->date('due_date');
            $table->decimal('base_amount', 15, 2);
            $table->decimal('interest_amount', 15, 2)->default(0);
            $table->decimal('penalty_amount', 15, 2)->default(0);
            $table->decimal('total_due', 15, 2);
            $table->enum('status', ['scheduled', 'due_soon', 'overdue', 'paid', 'cancelled'])->default('scheduled');
            $table->dateTime('paid_at')->nullable();
            $table->unsignedBigInteger('proof_document_id')->nullable();
            $table->timestamps();

            $table->index(['payable_id', 'status']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payable_installments');
    }
};
