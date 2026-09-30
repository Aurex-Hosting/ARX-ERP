<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Core\Models\MailConfiguration;
use App\Core\Models\MailHookConfiguration;
use App\Core\Models\MailTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

/**
 * Seeds default Mail Configuration, Feature Hooks, and rich HTML Email Templates.
 */
class MailSetupSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('mail_configurations')) {
            return;
        }

        // 1. Initialize default mail configuration
        MailConfiguration::instance();

        // 2. Initialize default mail hooks & global custom placeholders
        MailHookConfiguration::instance();

        // 3. Initialize default dynamic email templates
        $templates = [
            [
                'key' => 'password_reset',
                'name' => 'Password Reset Link',
                'subject' => 'Reset Your {app_name} Password',
                'action_button_label' => 'Reset Password',
                'placeholders_schema' => [
                    '{full_name}' => 'Recipient full name',
                    '{first_name}' => 'Recipient first name',
                    '{last_name}' => 'Recipient last name',
                    '{email}' => 'Recipient email address',
                    '{password_reset_link}' => '10-minute one-time password reset URL',
                    '{expires_in_minutes}' => 'Token expiration duration (e.g. 10)',
                    '{app_name}' => 'System application name',
                    '{current_year}' => 'Current calendar year',
                ],
                'body_html' => <<<'HTML'
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">{app_name}</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Security & Account Services</p>
    </div>
    <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Hello <strong>{full_name}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">We received a request to reset the password associated with your account (<code>{email}</code>). Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{password_reset_link}" style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);">Reset My Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; border-left: 3px solid #f59e0b; padding-left: 12px; margin: 20px 0;">
            <strong>Note:</strong> This link is cryptographically signed, valid for <strong>{expires_in_minutes} minutes</strong>, and can only be used once. If you did not request this change, please disregard this email.
        </p>
        <p style="color: #64748b; font-size: 12px; word-break: break-all; margin-top: 20px;">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <a href="{password_reset_link}" style="color: #818cf8;">{password_reset_link}</a>
        </p>
    </div>
    <div style="text-align: center; color: #64748b; font-size: 12px;">
        &copy; {current_year} {app_name}. All rights reserved.
    </div>
</div>
HTML,
                'body_plain' => "Hello {full_name},\n\nWe received a request to reset your password. Use the following link within {expires_in_minutes} minutes:\n{password_reset_link}\n\nIf you did not request this, please ignore this email.\n\n{app_name}",
            ],
            [
                'key' => 'email_verification',
                'name' => 'Account Activation / Email Verification',
                'subject' => 'Activate Your {app_name} Account',
                'action_button_label' => 'Activate Account',
                'placeholders_schema' => [
                    '{full_name}' => 'Recipient full name',
                    '{first_name}' => 'Recipient first name',
                    '{last_name}' => 'Recipient last name',
                    '{email}' => 'Recipient email address',
                    '{account_activation_link}' => '10-minute one-time account activation URL',
                    '{expires_in_minutes}' => 'Token expiration duration (e.g. 10)',
                    '{app_name}' => 'System application name',
                    '{current_year}' => 'Current calendar year',
                ],
                'body_html' => <<<'HTML'
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 700;">{app_name}</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Welcome to the Platform</p>
    </div>
    <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Verify Your Email Address</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Hello <strong>{full_name}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Your enterprise account (<code>{email}</code>) has been provisioned. Please activate your account and verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{account_activation_link}" style="background-color: #10b981; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);">Activate My Account</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; border-left: 3px solid #10b981; padding-left: 12px; margin: 20px 0;">
            <strong>Time Sensitive:</strong> This activation link is valid for <strong>{expires_in_minutes} minutes</strong>.
        </p>
        <p style="color: #64748b; font-size: 12px; word-break: break-all; margin-top: 20px;">
            Direct link: <a href="{account_activation_link}" style="color: #34d399;">{account_activation_link}</a>
        </p>
    </div>
    <div style="text-align: center; color: #64748b; font-size: 12px;">
        &copy; {current_year} {app_name}. All rights reserved.
    </div>
</div>
HTML,
                'body_plain' => "Hello {full_name},\n\nWelcome to {app_name}. Please activate your account within {expires_in_minutes} minutes using the link below:\n{account_activation_link}\n\n{app_name}",
            ],
            [
                'key' => 'account_disabled',
                'name' => 'Account Deactivated Notice',
                'subject' => 'Notice: Your {app_name} Account Has Been Deactivated',
                'action_button_label' => 'Contact Support',
                'placeholders_schema' => [
                    '{full_name}' => 'Recipient full name',
                    '{email}' => 'Recipient email address',
                    '{reason}' => 'Deactivation reason or policy notice',
                    '{support_email}' => 'Support contact email address',
                    '{app_name}' => 'System application name',
                    '{current_year}' => 'Current calendar year',
                ],
                'body_html' => <<<'HTML'
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ef4444; margin: 0; font-size: 26px; font-weight: 700;">{app_name}</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Account Status Notification</p>
    </div>
    <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Account Deactivated</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Hello <strong>{full_name}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Your account (<code>{email}</code>) access has been suspended or deactivated by an administrator.</p>
        <p style="color: #fca5a5; font-size: 14px; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 12px; border-radius: 4px; margin: 20px 0;">
            <strong>Status Notice:</strong> {reason}
        </p>
        <p style="color: #94a3b8; font-size: 14px;">If you believe this is an error or need your access restored, please contact your workspace administrator or reach out at <a href="mailto:{support_email}" style="color: #818cf8;">{support_email}</a>.</p>
    </div>
    <div style="text-align: center; color: #64748b; font-size: 12px;">
        &copy; {current_year} {app_name}. All rights reserved.
    </div>
</div>
HTML,
                'body_plain' => "Hello {full_name},\n\nYour account ({email}) access has been suspended.\nNotice: {reason}\n\nPlease contact {support_email} if you need assistance.\n\n{app_name}",
            ],
            [
                'key' => 'account_reenabled',
                'name' => 'Account Reactivated Notice',
                'subject' => 'Your {app_name} Account Access Has Been Restored',
                'action_button_label' => 'Log In to Account',
                'placeholders_schema' => [
                    '{full_name}' => 'Recipient full name',
                    '{email}' => 'Recipient email address',
                    '{login_link}' => 'System login URL',
                    '{app_name}' => 'System application name',
                    '{current_year}' => 'Current calendar year',
                ],
                'body_html' => <<<'HTML'
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
    <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #10b981; margin: 0; font-size: 26px; font-weight: 700;">{app_name}</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Account Status Restored</p>
    </div>
    <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
        <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Welcome Back</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Hello <strong>{full_name}</strong>,</p>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Your account (<code>{email}</code>) has been successfully reactivated. You can now log back into the system and access your workspace.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{login_link}" style="background-color: #10b981; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Go to Login</a>
        </div>
    </div>
    <div style="text-align: center; color: #64748b; font-size: 12px;">
        &copy; {current_year} {app_name}. All rights reserved.
    </div>
</div>
HTML,
                'body_plain' => "Hello {full_name},\n\nYour account ({email}) has been reactivated. You may log in here:\n{login_link}\n\n{app_name}",
            ],
        ];

        foreach ($templates as $tmpl) {
            MailTemplate::updateOrCreate(
                ['key' => $tmpl['key']],
                $tmpl
            );
        }
    }
}
