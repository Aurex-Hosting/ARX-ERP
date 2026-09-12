<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class StorageSettings extends Settings
{
    public string $provider;
    public string $s3_key;
    public string $s3_secret;
    public string $s3_region;
    public string $s3_bucket;
    public string $s3_endpoint;
    public string $s3_url;
    public bool $s3_use_path_style_endpoint;
    public bool $s3_enabled;

    public static function group(): string
    {
        return 'storage';
    }
}

