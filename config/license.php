<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Central Licensing & Update Server
    |--------------------------------------------------------------------------
    */
    'server_url' => env('LICENSE_SERVER_URL', 'https://license.magneticx.store'),

    /*
    |--------------------------------------------------------------------------
    | License Public Key (RSA-SHA256)
    |--------------------------------------------------------------------------
    | Used to verify cryptographic seals of activation, validation, and update
    | payloads issued by the central licensing authority.
    */
    'public_key' => env('LICENSE_PUBLIC_KEY', "-----BEGIN PUBLIC KEY-----\n"
        ."MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxNYIIMUx6PU8jd1yv8rg\n"
        ."nkiCLSdDVMfNvFfaocuYSfyasfzxMtNYETrZKb6KPolz+bHzJdPX9EGY8KnykLT4\n"
        ."QP1ohK1tdCHmkONK1BhnOYYPWlVSnKcwYb3IauPaulG1K8CpeFZ64vjMRBzPvCdO\n"
        ."qcVdYt3DK4aIPQlJhY82xlITa6jLNoGcWxfI/+rDGSn4wZFowIxzF7T5hbI/NBtC\n"
        ."M+br64+oo/inD1FAfbjGdVjSr0v2A+XsLq2B53mQCWBwgfA5Q9YqjYLKvGJrdq4m\n"
        ."yr23Z2O6u5671kdq+pZRuFCjfuz8UltUMOXtPZ9mIjMcMVWfZ7m/w9DzwjtkdWI5\n"
        ."qwIDAQAB\n"
        ."-----END PUBLIC KEY-----\n"),

    /*
    |--------------------------------------------------------------------------
    | Active License Credentials & Installation ID
    |--------------------------------------------------------------------------
    */
    'key' => env('LICENSE_KEY', env('PRODUCT_LICENSE_KEY')),
    'installation_id' => env('INSTALLATION_ID'),
    'app_secret' => env('LICENSE_APP_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Update Check Interval
    |--------------------------------------------------------------------------
    | Default cadence in hours for automated update background checks.
    */
    'check_interval_hours' => (int) env('UPDATE_CHECK_INTERVAL_HOURS', 12),

    /*
    |--------------------------------------------------------------------------
    | License Validation Cache Duration (in minutes)
    |--------------------------------------------------------------------------
    | Authorized license state is cached locally to prevent downtime if central
    | server is momentarily unreachable.
    */
    'cache_ttl_minutes' => (int) env('LICENSE_CACHE_TTL_MINUTES', 720), // 12 hours
];
