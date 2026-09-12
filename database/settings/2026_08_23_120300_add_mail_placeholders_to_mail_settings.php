<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('mail.mail_placeholders', [
            'company_name' => 'Aurex ERP',
            'support_email' => 'support@example.com',
            'website_url' => 'https://example.com'
        ]);
    }
};
