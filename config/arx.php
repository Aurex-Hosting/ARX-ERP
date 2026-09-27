<?php

declare(strict_types=1);

return [
    'name' => env('ARX_APP_NAME', 'ARX-ERP'),
    'author' => 'ItzSD',
    'version' => '1.0.0',

    /*
    |--------------------------------------------------------------------------
    | Application Areas
    |--------------------------------------------------------------------------
    |
    | ARX-ERP splits functionality into two distinct application surfaces:
    | - dashboard: End-user business interfaces (CRM, POS, Inventory, etc.)
    | - admin: System configuration interfaces (AWS, Backups, Modules, etc.)
    |
    */
    'areas' => [
        'dashboard' => [
            'name' => 'Dashboard',
            'prefix' => '',
            'route_prefix' => 'api/v1',
            'module_path' => base_path('modules/dashboard'),
            'theme_path' => base_path('themes/dashboard'),
            'default_theme' => 'default',
        ],
        'admin' => [
            'name' => 'Admin Panel',
            'prefix' => 'admin',
            'route_prefix' => 'api/v1/admin',
            'module_path' => base_path('modules/admin'),
            'theme_path' => base_path('themes/admin'),
            'default_theme' => 'default',
        ],
        'shared' => [
            'name' => 'Shared Modules',
            'module_path' => base_path('modules/shared'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Core Roles
    |--------------------------------------------------------------------------
    |
    | Built-in immutable core roles for authentication & authorization.
    |
    */
    'roles' => [
        'super_admin' => 'super-admin',
        'user' => 'user',
        'ai_agent' => 'ai-agent',
    ],

    /*
    |--------------------------------------------------------------------------
    | Model Context Protocol (MCP) & AI Gateway Settings
    |--------------------------------------------------------------------------
    */
    'mcp' => [
        'enabled' => env('ARX_MCP_ENABLED', true),
        'server_name' => 'arx-erp',
        'server_version' => '1.0.0',
        'require_approval_by_default' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Audit Logging Settings
    |--------------------------------------------------------------------------
    */
    'audit' => [
        'enabled' => env('ARX_AUDIT_ENABLED', true),
        'retention_days' => (int) env('AUDIT_LOG_RETENTION_DAYS', env('ARX_AUDIT_RETENTION_DAYS', 90)),
    ],
];
