<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payable_notification_configs', function (Blueprint $table): void {
            if (! Schema::hasColumn('payable_notification_configs', 'widget_calendar_enabled')) {
                $table->boolean('widget_calendar_enabled')->default(true)->after('enable_email');
            }
            if (! Schema::hasColumn('payable_notification_configs', 'widget_calendar_size')) {
                $table->string('widget_calendar_size', 20)->default('medium')->after('widget_calendar_enabled');
            }
            if (! Schema::hasColumn('payable_notification_configs', 'widget_calendar_design')) {
                $table->string('widget_calendar_design', 30)->default('modern_glass')->after('widget_calendar_size');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payable_notification_configs', function (Blueprint $table): void {
            $table->dropColumn([
                'widget_calendar_enabled',
                'widget_calendar_size',
                'widget_calendar_design',
            ]);
        });
    }
};
