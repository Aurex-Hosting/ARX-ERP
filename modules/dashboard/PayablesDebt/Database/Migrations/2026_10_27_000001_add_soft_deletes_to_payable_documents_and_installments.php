<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payable_documents', function (Blueprint $table): void {
            if (! Schema::hasColumn('payable_documents', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('payable_installments', function (Blueprint $table): void {
            if (! Schema::hasColumn('payable_installments', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payable_documents', function (Blueprint $table): void {
            if (Schema::hasColumn('payable_documents', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('payable_installments', function (Blueprint $table): void {
            if (Schema::hasColumn('payable_installments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
