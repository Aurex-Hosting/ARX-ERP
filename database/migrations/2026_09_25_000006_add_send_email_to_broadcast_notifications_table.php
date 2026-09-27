<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast_notifications', function (Blueprint $table): void {
            $table->boolean('send_email')->default(false)->after('enable_reactions');
            $table->string('email_subject')->nullable()->after('send_email');
        });
    }

    public function down(): void
    {
        Schema::table('broadcast_notifications', function (Blueprint $table): void {
            $table->dropColumn(['send_email', 'email_subject']);
        });
    }
};
