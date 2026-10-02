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
            if (! Schema::hasColumn('payables', 'payment_url')) {
                $table->text('payment_url')->nullable()->after('status');
            }
            if (! Schema::hasColumn('payables', 'payment_urls')) {
                $table->json('payment_urls')->nullable()->after('payment_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payables', function (Blueprint $table): void {
            if (Schema::hasColumn('payables', 'payment_url')) {
                $table->dropColumn('payment_url');
            }
            if (Schema::hasColumn('payables', 'payment_urls')) {
                $table->dropColumn('payment_urls');
            }
        });
    }
};
