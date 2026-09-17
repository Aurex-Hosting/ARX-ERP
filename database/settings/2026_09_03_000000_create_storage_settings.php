<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('storage.provider', 'local');
        $this->migrator->add('storage.s3_key', '');
        $this->migrator->add('storage.s3_secret', '');
        $this->migrator->add('storage.s3_region', 'us-east-1');
        $this->migrator->add('storage.s3_bucket', '');
        $this->migrator->add('storage.s3_endpoint', '');
        $this->migrator->add('storage.s3_url', '');
        $this->migrator->add('storage.s3_use_path_style_endpoint', false);
    }
};