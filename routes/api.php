<?php

declare(strict_types=1);

use App\Core\Http\Controllers\Api\V1\AdminNotificationController;
use App\Core\Http\Controllers\Api\V1\ApiKeyController;
use App\Core\Http\Controllers\Api\V1\AuditLogController;
use App\Core\Http\Controllers\Api\V1\AuthActionController;
use App\Core\Http\Controllers\Api\V1\AuthController;
use App\Core\Http\Controllers\Api\V1\BackupController;
use App\Core\Http\Controllers\Api\V1\LoginHistoryController;
use App\Core\Http\Controllers\Api\V1\MailSetupController;
use App\Core\Http\Controllers\Api\V1\McpToolController;
use App\Core\Http\Controllers\Api\V1\ModuleController;
use App\Core\Http\Controllers\Api\V1\NavigationController;
use App\Core\Http\Controllers\Api\V1\NotificationController;
use App\Core\Http\Controllers\Api\V1\RolePermissionController;
use App\Core\Http\Controllers\Api\V1\SettingController;
use App\Core\Http\Controllers\Api\V1\SystemHealthController;
use App\Core\Http\Controllers\Api\V1\ThemeController;
use App\Core\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| ARX-ERP API Routes (v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function (): void {
    // 1. Public Endpoints
    Route::get('/health', [SystemHealthController::class, 'index'])->name('api.v1.health');
    Route::get('/theme/config', [ThemeController::class, 'activeConfig'])->name('api.v1.theme.config');
    Route::get('/general-settings', [SettingController::class, 'getGeneralSettings'])->name('api.v1.general_settings');

    // Auth Routes
    Route::get('/auth/mail-status', [AuthActionController::class, 'mailStatus'])->name('api.v1.auth.mail_status');
    Route::post('/auth/register', [AuthController::class, 'register'])->name('api.v1.auth.register');
    Route::post('/auth/login', [AuthController::class, 'login'])->name('api.v1.auth.login');
    Route::post('/auth/2fa/verify', [AuthController::class, 'twoFactorVerify'])->name('api.v1.auth.2fa.verify');
    Route::post('/auth/forgot-password', [AuthActionController::class, 'forgotPassword'])->name('api.v1.auth.forgot_password');
    Route::post('/auth/validate-token', [AuthActionController::class, 'validateToken'])->name('api.v1.auth.validate_token');
    Route::post('/auth/reset-password', [AuthActionController::class, 'resetPassword'])->name('api.v1.auth.reset_password');
    Route::post('/auth/verify-email', [AuthActionController::class, 'verifyEmail'])->name('api.v1.auth.verify_email');
    Route::get('/auth/profile/avatar/{identifier?}', [AuthController::class, 'streamAvatar'])->name('api.v1.auth.profile.avatar');
    Route::get('/auth/profile/banner/{identifier?}', [AuthController::class, 'streamBanner'])->name('api.v1.auth.profile.banner');

    // 2. Authenticated Endpoints (Users & AI Agents)
    Route::middleware('auth:sanctum')->group(function (): void {
        // User Profile & Media
        Route::get('/auth/user', [AuthController::class, 'user'])->name('api.v1.auth.user');
        Route::get('/auth/profile', [AuthController::class, 'profile'])->name('api.v1.auth.profile');
        Route::put('/auth/profile', [AuthController::class, 'updateProfile'])->name('api.v1.auth.profile.update');
        Route::put('/auth/password', [AuthController::class, 'changePassword'])->name('api.v1.auth.password.update');
        Route::post('/auth/profile/avatar', [AuthController::class, 'uploadAvatar'])->name('api.v1.auth.profile.avatar.upload');
        Route::delete('/auth/profile/avatar', [AuthController::class, 'removeAvatar'])->name('api.v1.auth.profile.avatar.remove');
        Route::post('/auth/profile/banner', [AuthController::class, 'uploadBanner'])->name('api.v1.auth.profile.banner.upload');
        Route::delete('/auth/profile/banner', [AuthController::class, 'removeBanner'])->name('api.v1.auth.profile.banner.remove');

        // Two-Factor Authentication (2FA) Management
        Route::get('/auth/2fa/setup', [AuthController::class, 'twoFactorSetup'])->name('api.v1.auth.2fa.setup');
        Route::post('/auth/2fa/confirm', [AuthController::class, 'twoFactorConfirm'])->name('api.v1.auth.2fa.confirm');
        Route::get('/auth/2fa/status', [AuthController::class, 'twoFactorStatus'])->name('api.v1.auth.2fa.status');
        Route::post('/auth/2fa/regenerate-recovery-codes', [AuthController::class, 'twoFactorRegenerateRecoveryCodes'])->name('api.v1.auth.2fa.regenerate');
        Route::post('/auth/2fa/disable', [AuthController::class, 'twoFactorDisable'])->name('api.v1.auth.2fa.disable');

        // User Personal Login & Session History
        Route::get('/auth/login-history', [LoginHistoryController::class, 'userHistory'])->name('api.v1.auth.login_history');
        Route::post('/auth/login-history/{id}/revoke', [LoginHistoryController::class, 'userRevoke'])->name('api.v1.auth.login_history.revoke');
        Route::post('/auth/login-history/revoke-other', [LoginHistoryController::class, 'userRevokeOther'])->name('api.v1.auth.login_history.revoke_other');

        // User In-App Notifications & Emoji Reactions
        Route::get('/notifications', [NotificationController::class, 'index'])->name('api.v1.notifications.index');
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('api.v1.notifications.unread_count');
        Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead'])->name('api.v1.notifications.mark_all_read');
        Route::delete('/notifications/clear-all', [NotificationController::class, 'clearAll'])->name('api.v1.notifications.clear_all');
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->whereNumber('id')->name('api.v1.notifications.read');
        Route::post('/notifications/{id}/react', [NotificationController::class, 'react'])->whereNumber('id')->name('api.v1.notifications.react');
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->whereNumber('id')->name('api.v1.notifications.destroy');

        Route::post('/auth/tokens', [AuthController::class, 'createToken'])->name('api.v1.auth.tokens.create');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');

        // Dynamic Navigation Tree
        Route::get('/navigation', [NavigationController::class, 'index'])->name('api.v1.navigation');

        // Settings (User/System read)
        Route::get('/settings/{key}', [SettingController::class, 'show'])->name('api.v1.settings.show');
        Route::get('/settings/group/{group}', [SettingController::class, 'getGroup'])->name('api.v1.settings.group');

        // MCP (Model Context Protocol) Endpoints
        Route::get('/mcp/tools', [McpToolController::class, 'tools'])->name('api.v1.mcp.tools');
        Route::get('/mcp/resources', [McpToolController::class, 'resources'])->name('api.v1.mcp.resources');
        Route::get('/mcp/prompts', [McpToolController::class, 'prompts'])->name('api.v1.mcp.prompts');
        Route::post('/mcp/execute', [McpToolController::class, 'execute'])->name('api.v1.mcp.execute');

        // 3. Super-Admin Protected Endpoints
        Route::prefix('admin')->middleware('super_admin')->group(function (): void {
            // Module Management
            Route::get('/modules', [ModuleController::class, 'index'])->name('api.v1.admin.modules.index');
            Route::post('/modules/create', [ModuleController::class, 'create'])->name('api.v1.admin.modules.create');
            Route::post('/modules/generate-starter', [ModuleController::class, 'generateStarter'])->name('api.v1.admin.modules.generate_starter');
            Route::post('/modules/upload', [ModuleController::class, 'upload'])->name('api.v1.admin.modules.upload');
            Route::get('/modules/{slug}/export', [ModuleController::class, 'export'])->name('api.v1.admin.modules.export');
            Route::post('/modules/{slug}/install', [ModuleController::class, 'install'])->name('api.v1.admin.modules.install');
            Route::post('/modules/{slug}/enable', [ModuleController::class, 'enable'])->name('api.v1.admin.modules.enable');
            Route::post('/modules/{slug}/disable', [ModuleController::class, 'disable'])->name('api.v1.admin.modules.disable');
            Route::delete('/modules/{slug}', [ModuleController::class, 'destroy'])->name('api.v1.admin.modules.destroy');
            Route::delete('/modules/{slug}/disk', [ModuleController::class, 'deleteFromDisk'])->name('api.v1.admin.modules.delete_disk');

            // Theme Management & General Settings
            Route::get('/themes', [ThemeController::class, 'index'])->name('api.v1.admin.themes.index');
            Route::post('/themes/{slug}/activate', [ThemeController::class, 'activate'])->name('api.v1.admin.themes.activate');
            Route::get('/theme/general-settings', [SettingController::class, 'getGeneralSettings'])->name('api.v1.admin.theme.general_settings');
            Route::match(['put', 'post'], '/theme/general-settings', [SettingController::class, 'updateGeneralSettings'])->name('api.v1.admin.theme.general_settings.update');
            Route::post('/theme/general-settings/upload', [SettingController::class, 'uploadAsset'])->name('api.v1.admin.theme.general_settings.upload');
            Route::delete('/theme/general-settings/asset/{assetType}', [SettingController::class, 'deleteAsset'])->name('api.v1.admin.theme.general_settings.delete_asset');

            // Backup & Disaster Recovery
            Route::get('/backups', [BackupController::class, 'index'])->name('api.v1.admin.backups.index');
            Route::post('/backups', [BackupController::class, 'store'])->name('api.v1.admin.backups.store');
            Route::get('/backups/config', [BackupController::class, 'getConfig'])->name('api.v1.admin.backups.config.get');
            Route::put('/backups/config', [BackupController::class, 'updateConfig'])->name('api.v1.admin.backups.config.update');
            Route::post('/backups/upload-restore', [BackupController::class, 'uploadAndRestore'])->name('api.v1.admin.backups.upload_restore');
            Route::post('/backups/batch-delete', [BackupController::class, 'batchDestroy'])->name('api.v1.admin.backups.batch_delete');
            Route::get('/backups/{filename}/download', [BackupController::class, 'download'])->name('api.v1.admin.backups.download');
            Route::post('/backups/{filename}/restore', [BackupController::class, 'restore'])->name('api.v1.admin.backups.restore');
            Route::delete('/backups/{filename}', [BackupController::class, 'destroy'])->name('api.v1.admin.backups.destroy');

            // Settings Modification
            Route::put('/settings/{key}', [SettingController::class, 'update'])->name('api.v1.admin.settings.update');

            // Audit Trail
            Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('api.v1.admin.audit_logs.index');
            Route::post('/audit-logs/export', [AuditLogController::class, 'export'])->name('api.v1.admin.audit_logs.export');
            Route::post('/audit-logs/batch-delete', [AuditLogController::class, 'batchDelete'])->name('api.v1.admin.audit_logs.batch_delete');
            Route::delete('/audit-logs', [AuditLogController::class, 'destroy'])->name('api.v1.admin.audit_logs.destroy');
            Route::delete('/audit-logs/{id}', [AuditLogController::class, 'destroySingle'])->whereNumber('id')->name('api.v1.admin.audit_logs.destroy_single');
            Route::get('/audit-logs/{id}', [AuditLogController::class, 'show'])->whereNumber('id')->name('api.v1.admin.audit_logs.show');

            // Login History & Active Sessions
            Route::get('/login-history', [LoginHistoryController::class, 'index'])->name('api.v1.admin.login_history.index');
            Route::post('/login-history/clear-older', [LoginHistoryController::class, 'clearOlder'])->name('api.v1.admin.login_history.clear_older');
            Route::post('/login-history/revoke-all', [LoginHistoryController::class, 'revokeAll'])->name('api.v1.admin.login_history.revoke_all');
            Route::post('/login-history/{id}/revoke', [LoginHistoryController::class, 'revoke'])->name('api.v1.admin.login_history.revoke');

            // User & Identity Management
            Route::get('/users', [UserController::class, 'index'])->name('api.v1.admin.users.index');
            Route::get('/users/trash', [UserController::class, 'trash'])->name('api.v1.admin.users.trash');
            Route::post('/users', [UserController::class, 'store'])->name('api.v1.admin.users.store');
            Route::get('/users/{id}', [UserController::class, 'show'])->name('api.v1.admin.users.show');
            Route::put('/users/{id}', [UserController::class, 'update'])->name('api.v1.admin.users.update');
            Route::put('/users/{id}/password', [UserController::class, 'changePassword'])->name('api.v1.admin.users.password');
            Route::put('/users/{id}/toggle-status', [UserController::class, 'toggleStatus'])->name('api.v1.admin.users.toggle_status');
            Route::post('/users/{id}/disable-2fa', [UserController::class, 'disable2fa'])->name('api.v1.admin.users.disable_2fa');
            Route::post('/users/{id}/send-reset-link', [UserController::class, 'sendResetLink'])->name('api.v1.admin.users.send_reset_link');
            Route::post('/users/{id}/resend-activation', [UserController::class, 'resendActivation'])->name('api.v1.admin.users.resend_activation');
            Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('api.v1.admin.users.destroy');
            Route::post('/users/{id}/restore', [UserController::class, 'restore'])->name('api.v1.admin.users.restore');
            Route::delete('/users/{id}/force', [UserController::class, 'forceDelete'])->name('api.v1.admin.users.force_delete');

            // Roles & Permissions RBAC
            Route::get('/roles', [RolePermissionController::class, 'roles'])->name('api.v1.admin.roles.index');
            Route::post('/roles', [RolePermissionController::class, 'storeRole'])->name('api.v1.admin.roles.store');
            Route::get('/roles/{id}', [RolePermissionController::class, 'showRole'])->name('api.v1.admin.roles.show');
            Route::put('/roles/{id}', [RolePermissionController::class, 'updateRole'])->name('api.v1.admin.roles.update');
            Route::delete('/roles/{id}', [RolePermissionController::class, 'destroyRole'])->name('api.v1.admin.roles.destroy');
            Route::get('/permissions', [RolePermissionController::class, 'permissions'])->name('api.v1.admin.permissions.index');

            // Mail Setup & SMTP Diagnostics
            Route::get('/mail/config', [MailSetupController::class, 'getConfig'])->name('api.v1.admin.mail.config.get');
            Route::put('/mail/config', [MailSetupController::class, 'updateConfig'])->name('api.v1.admin.mail.config.update');
            Route::post('/mail/test-connection', [MailSetupController::class, 'testConnection'])->name('api.v1.admin.mail.test_connection');
            Route::post('/mail/test-send', [MailSetupController::class, 'sendTestMail'])->name('api.v1.admin.mail.test_send');
            Route::get('/mail/hooks', [MailSetupController::class, 'getHooks'])->name('api.v1.admin.mail.hooks.get');
            Route::put('/mail/hooks', [MailSetupController::class, 'updateHooks'])->name('api.v1.admin.mail.hooks.update');
            Route::get('/mail/templates', [MailSetupController::class, 'getTemplates'])->name('api.v1.admin.mail.templates.index');
            Route::get('/mail/templates/{key}', [MailSetupController::class, 'getTemplate'])->name('api.v1.admin.mail.templates.show');
            Route::put('/mail/templates/{key}', [MailSetupController::class, 'updateTemplate'])->name('api.v1.admin.mail.templates.update');
            Route::post('/mail/templates/{key}/preview', [MailSetupController::class, 'previewTemplate'])->name('api.v1.admin.mail.templates.preview');

            // Application API Keys & Credentials
            Route::get('/api-keys', [ApiKeyController::class, 'index'])->name('api.v1.admin.api_keys.index');
            Route::get('/api-keys/meta', [ApiKeyController::class, 'meta'])->name('api.v1.admin.api_keys.meta');
            Route::post('/api-keys', [ApiKeyController::class, 'store'])->name('api.v1.admin.api_keys.store');
            Route::get('/api-keys/{id}', [ApiKeyController::class, 'show'])->name('api.v1.admin.api_keys.show');
            Route::put('/api-keys/{id}', [ApiKeyController::class, 'update'])->name('api.v1.admin.api_keys.update');
            Route::put('/api-keys/{id}/toggle-status', [ApiKeyController::class, 'toggleStatus'])->name('api.v1.admin.api_keys.toggle_status');
            Route::post('/api-keys/{id}/regenerate', [ApiKeyController::class, 'regenerate'])->name('api.v1.admin.api_keys.regenerate');
            Route::delete('/api-keys/{id}', [ApiKeyController::class, 'destroy'])->name('api.v1.admin.api_keys.destroy');

            // AI Human-in-the-Loop Approvals
            Route::get('/approvals', [McpToolController::class, 'approvals'])->name('api.v1.admin.approvals.index');
            Route::post('/approvals/{id}/approve', [McpToolController::class, 'approve'])->name('api.v1.admin.approvals.approve');
            Route::post('/approvals/{id}/reject', [McpToolController::class, 'reject'])->name('api.v1.admin.approvals.reject');

            // Admin Push & Broadcast Notification Dispatcher ("Notify")
            Route::get('/notifications', [AdminNotificationController::class, 'index'])->name('api.v1.admin.notifications.index');
            Route::get('/notifications/target-preview', [AdminNotificationController::class, 'targetPreview'])->name('api.v1.admin.notifications.target_preview');
            Route::post('/notifications', [AdminNotificationController::class, 'store'])->name('api.v1.admin.notifications.store');
            Route::get('/notifications/{id}', [AdminNotificationController::class, 'show'])->name('api.v1.admin.notifications.show');
            Route::put('/notifications/{id}', [AdminNotificationController::class, 'update'])->name('api.v1.admin.notifications.update');
            Route::post('/notifications/{id}/resend', [AdminNotificationController::class, 'resend'])->name('api.v1.admin.notifications.resend');
            Route::delete('/notifications/{id}', [AdminNotificationController::class, 'destroy'])->name('api.v1.admin.notifications.destroy');
        });
    });
});
