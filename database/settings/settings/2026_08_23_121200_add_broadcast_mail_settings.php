<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('mail.broadcast_subject', 'Important Update');
        $this->migrator->add('mail.broadcast_body', '<p>Hello {{username}},</p><p>This is a broadcast message.</p>');
        $this->migrator->add('mail.broadcast_send_to_all', false);
        $this->migrator->add('mail.broadcast_roles', []);
        $this->migrator->add('mail.broadcast_include_users', []);
        $this->migrator->add('mail.broadcast_exclude_users', []);
    }
};
