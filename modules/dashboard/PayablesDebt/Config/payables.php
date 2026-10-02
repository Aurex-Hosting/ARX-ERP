<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Default Company Currency
    |--------------------------------------------------------------------------
    */
    'base_currency' => env('PAYABLES_BASE_CURRENCY', 'USD'),

    /*
    |--------------------------------------------------------------------------
    | Exchange Rate API Endpoints
    |--------------------------------------------------------------------------
    */
    'exchange_rate' => [
        'primary_url' => 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{currency}.json',
        'fallback_url' => 'https://latest.currency-api.pages.dev/v1/currencies/{currency}.json',
        'cache_ttl' => 21600, // 6 hours in seconds
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Grace Period (days)
    |--------------------------------------------------------------------------
    */
    'default_grace_period_days' => 0,

    /*
    |--------------------------------------------------------------------------
    | Pre-generation Trigger Days
    |--------------------------------------------------------------------------
    */
    'default_pregeneration_days' => 7,

    /*
    |--------------------------------------------------------------------------
    | Due Soon Notification Window (days before due date)
    |--------------------------------------------------------------------------
    */
    'due_soon_days' => 5,

    /*
    |--------------------------------------------------------------------------
    | Document Storage Path (private, non-public)
    |--------------------------------------------------------------------------
    */
    'document_storage_path' => 'private/payables',

    /*
    |--------------------------------------------------------------------------
    | Temporary Document Token TTL (seconds)
    |--------------------------------------------------------------------------
    */
    'document_token_ttl' => 60,

    /*
    |--------------------------------------------------------------------------
    | Supported Currencies for Selection Dropdown
    |--------------------------------------------------------------------------
    */
    'supported_currencies' => [
        'USD', 'EUR', 'LKR', 'INR',
    ],
];
