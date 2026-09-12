<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class MailSettings extends Settings
{
    public string $mail_mailer;
    public string $mail_host;
    public int $mail_port;
    public string $mail_username;
    public string $mail_password;
    public string $mail_encryption;
    public bool $mail_verify_peer;
    public string $mail_from_address;
    public string $mail_from_name;

    public string $mail_active_template;
    public string $mail_template_email_verification;
    public string $mail_template_2fa;
    public string $mail_template_password_reset;
    public string $mail_template_login_detection;

    public array $mail_placeholders;

    public string $broadcast_subject;
    public string $broadcast_body;
    public bool $broadcast_send_to_all;
    public array $broadcast_roles;
    public array $broadcast_include_users;
    public array $broadcast_exclude_users;

    public static function group(): string
    {
        return 'mail';
    }
}
