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
        Schema::create('pending_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('users')->onDelete('cascade');
            $table->string('tool_name')->index();
            $table->jsonb('parameters');
            $table->string('status')->default('pending')->index(); // 'pending' | 'approved' | 'rejected'
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->jsonb('execution_result')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pending_approvals');
    }
};
