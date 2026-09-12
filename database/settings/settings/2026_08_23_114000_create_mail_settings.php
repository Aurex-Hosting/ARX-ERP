<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('mail.mail_mailer', 'smtp');
        $this->migrator->add('mail.mail_host', '127.0.0.1');
        $this->migrator->add('mail.mail_port', 1025);
        $this->migrator->add('mail.mail_username', '');
        $this->migrator->add('mail.mail_password', '');
        $this->migrator->add('mail.mail_encryption', 'tls');
        $this->migrator->add('mail.mail_from_address', 'hello@example.com');
        $this->migrator->add('mail.mail_from_name', 'Example');
    }
};
