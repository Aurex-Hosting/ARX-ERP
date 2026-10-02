<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payable_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payable_id')->constrained('payables')->cascadeOnDelete();
            $table->unsignedBigInteger('installment_id')->nullable();
            $table->string('original_filename');
            $table->string('stored_filename');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size');
            $table->string('mime_type', 100);
            $table->enum('document_type', ['receipt', 'bank_slip', 'transfer_confirmation', 'other'])->default('receipt');
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['payable_id', 'is_active']);
            $table->index('installment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payable_documents');
    }
};
