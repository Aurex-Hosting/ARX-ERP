<?php

use App\Core\Models\MailTemplate;
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
        if (Schema::hasTable('mail_hooks_configuration')) {
            Schema::table('mail_hooks_configuration', function (Blueprint $table): void {
                if (! Schema::hasColumn('mail_hooks_configuration', 'hook_system_update_available')) {
                    $table->boolean('hook_system_update_available')->default(true)->after('hook_notify_broadcast');
                }
            });
        }

        if (Schema::hasTable('mail_templates')) {
            MailTemplate::firstOrCreate(
                ['key' => 'system_update_available'],
                [
                    'name' => 'System Update Available Alert',
                    'subject' => '[{app_name}] New Core System Update Available: v{version}',
                    'action_button_label' => 'View & Apply Update',
                    'placeholders_schema' => [
                        '{full_name}' => 'Recipient full name',
                        '{app_name}' => 'System application name',
                        '{version}' => 'New release version (e.g. 1.2.0)',
                        '{package_name}' => 'Update package release title',
                        '{published_at}' => 'Release publication date',
                        '{notes}' => 'Release changelog notes and security notices',
                        '{updates_url}' => 'Direct URL to Admin Updates portal',
                        '{current_year}' => 'Current calendar year',
                    ],
                    'body_html' => <<<'HTML'
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">{app_name}</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">System Release & Update Notifications</p>
    </div>
    <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 4px 10px; background-color: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 11px; font-weight: 600; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Core Update Alert</span>
        <h2 style="color: #f8fafc; font-size: 18px; margin: 0 0 12px 0;">New Release Available: v{version}</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Hello <strong>{full_name}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">A new verified release package (<strong>{package_name}</strong>) has been discovered for {app_name}. The release has passed RSA cryptographic integrity verification.</p>
        
        <div style="background-color: #0f172a; border-radius: 8px; padding: 14px; margin: 16px 0; border: 1px solid #334155; font-size: 13px;">
            <p style="margin: 4px 0; color: #94a3b8;"><strong>Version:</strong> <span style="color: #818cf8; font-family: monospace;">v{version}</span></p>
            <p style="margin: 4px 0; color: #94a3b8;"><strong>Published Date:</strong> <span style="color: #f8fafc;">{published_at}</span></p>
            <p style="margin: 8px 0 4px 0; color: #94a3b8;"><strong>Changelog Summary:</strong></p>
            <div style="color: #cbd5e1; font-size: 12px; line-height: 1.5; white-space: pre-wrap; margin-top: 4px;">{notes}</div>
        </div>

        <div style="text-align: center; margin: 28px 0;">
            <a href="{updates_url}" style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);">View & Apply Update</a>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; border-left: 3px solid #6366f1; padding-left: 12px; margin: 16px 0;">
            <strong>Safety Recommendation:</strong> It is recommended to perform a system backup snapshot prior to applying any system updates.
        </p>
    </div>
    <div style="text-align: center; color: #64748b; font-size: 12px;">
        &copy; {current_year} {app_name}. All rights reserved. • Sent to Super Administrators
    </div>
</div>
HTML,
                    'body_plain' => "Hello {full_name},\n\nA new system update (v{version} - {package_name}) is available for {app_name}.\nPublished: {published_at}\n\nChangelog:\n{notes}\n\nReview and apply update:\n{updates_url}\n\n{app_name}",
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('mail_hooks_configuration') && Schema::hasColumn('mail_hooks_configuration', 'hook_system_update_available')) {
            Schema::table('mail_hooks_configuration', function (Blueprint $table): void {
                $table->dropColumn('hook_system_update_available');
            });
        }

        if (Schema::hasTable('mail_templates')) {
            MailTemplate::where('key', 'system_update_available')->delete();
        }
    }
};
