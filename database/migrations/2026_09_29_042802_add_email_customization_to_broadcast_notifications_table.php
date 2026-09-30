<?php

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
        Schema::table('broadcast_notifications', function (Blueprint $table): void {
            $table->longText('email_body_html')->nullable()->after('email_subject');
            $table->string('email_action_label')->nullable()->after('email_body_html');
            $table->string('email_action_url', 500)->nullable()->after('email_action_label');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('broadcast_notifications', function (Blueprint $table): void {
            $table->dropColumn(['email_body_html', 'email_action_label', 'email_action_url']);
        });
    }
};
