<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('mail.mail_active_template', 'email_verification');
        
        $this->migrator->add('mail.mail_template_email_verification', '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome, {{name}}!</h2>
            <p>Please click the button below to verify your email address and complete your signup:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{verify_url}}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Verify Email</a>
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
        </div>');

        $this->migrator->add('mail.mail_template_2fa', '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Security Verification</h2>
            <p>Hello {{name}},</p>
            <p>Your two-factor authentication code is:</p>
            <div style="background-color: #f4f4f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">{{code}}</div>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">This code will expire shortly.</p>
        </div>');

        $this->migrator->add('mail.mail_template_password_reset', '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello {{name}},</p>
            <p>You recently requested to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{link}}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">If the button does not work, copy and paste this link into your browser: <br><a href="{{link}}">{{link}}</a></p>
        </div>');

        $this->migrator->add('mail.mail_template_login_detection', '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">New Login Detected</h2>
            <p>Hello {{name}},</p>
            <p>We detected a new login to your account from a new device or location.</p>
            <ul style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; list-style-type: none;">
                <li style="margin-bottom: 10px;"><strong>IP Address:</strong> {{ip}}</li>
                <li style="margin-bottom: 10px;"><strong>Device:</strong> {{device}}</li>
                <li><strong>Time:</strong> {{time}}</li>
            </ul>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">If this was you, you can ignore this email. If this wasn\'t you, please reset your password immediately!</p>
        </div>');
    }
};
