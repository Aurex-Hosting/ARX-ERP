<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\AuditLog;
use App\Core\Models\MailConfiguration;
use App\Core\Models\MailHookConfiguration;
use App\Core\Models\MailTemplate;
use App\Core\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Enterprise Mail Service handling dynamic SMTP transport configuration,
 * socket connection diagnostics, template rendering, and event hook dispatches.
 */
class MailService
{
    public function __construct(
        protected SecurityTokenService $tokenService
    ) {}

    /**
     * Dynamically apply stored SMTP credentials to Laravel configuration at runtime.
     */
    public function applyDynamicTransport(?MailConfiguration $config = null): void
    {
        $config ??= MailConfiguration::instance();

        $encryption = $config->encryption === 'none' ? null : $config->encryption;

        if (! app()->environment('testing')) {
            Config::set('mail.default', 'smtp');
        }
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $config->host ?? '127.0.0.1');
        Config::set('mail.mailers.smtp.port', $config->port ?? 587);
        Config::set('mail.mailers.smtp.encryption', $encryption);
        Config::set('mail.mailers.smtp.username', $config->username);
        Config::set('mail.mailers.smtp.password', $config->password);
        Config::set('mail.mailers.smtp.timeout', 10);
        Config::set('mail.mailers.smtp.verify_peer', (bool) ($config->verify_peer ?? false));
        Config::set('mail.mailers.smtp.stream', [
            'ssl' => [
                'allow_self_signed' => true,
                'verify_peer' => (bool) ($config->verify_peer ?? false),
                'verify_peer_name' => (bool) ($config->verify_peer ?? false),
            ],
        ]);

        if (! empty($config->from_address)) {
            Config::set('mail.from.address', $config->from_address);
            Config::set('mail.from.name', $config->from_name ?? config('app.name', 'ARX-ERP'));
        }

        // Purge cached mailer instance so new credentials are picked up immediately
        if (! app()->environment('testing')) {
            try {
                Mail::purge('smtp');
            } catch (Throwable) {
                // Ignore if mail manager not bound yet
            }
        }
    }

    /**
     * Perform real-time socket connection handshake test with SMTP server.
     *
     * @return array{success: bool, message: string, latency_ms: float}
     */
    public function testConnection(?MailConfiguration $config = null): array
    {
        $config ??= MailConfiguration::instance();

        $host = $config->host;
        $port = $config->port ?: 587;

        if (empty($host)) {
            return [
                'success' => false,
                'message' => 'SMTP Host is not configured.',
                'latency_ms' => 0.0,
            ];
        }

        $startTime = microtime(true);
        $errno = 0;
        $errstr = '';

        $target = ($config->encryption === 'ssl' ? 'ssl://' : '').$host;
        $connection = @fsockopen($target, $port, $errno, $errstr, 5);

        $latencyMs = round((microtime(true) - $startTime) * 1000, 2);

        if (! is_resource($connection)) {
            $msg = "Connection failed to {$host}:{$port} ({$errstr} [{$errno}])";
            $config->update([
                'last_tested_at' => now(),
                'last_test_status' => 'failed',
                'last_test_message' => $msg,
            ]);

            AuditLog::record(
                action: 'smtp_test_failed',
                description: "SMTP connection test failed to {$host}:{$port} - {$msg}",
                model: $config,
                metadata: ['host' => $host, 'port' => $port, 'latency_ms' => $latencyMs, 'error' => $msg]
            );

            return [
                'success' => false,
                'message' => $msg,
                'latency_ms' => $latencyMs,
            ];
        }

        // Read initial server banner (e.g. 220 smtp.example.com ESMTP)
        $banner = fgets($connection, 512);
        fclose($connection);

        $successMsg = "Successfully connected to {$host}:{$port} ({$latencyMs}ms). Response: ".(trim($banner ?: 'OK'));

        $config->update([
            'last_tested_at' => now(),
            'last_test_status' => 'success',
            'last_test_message' => $successMsg,
        ]);

        AuditLog::record(
            action: 'smtp_test_success',
            description: "SMTP connection test succeeded to {$host}:{$port} ({$latencyMs}ms)",
            model: $config,
            metadata: ['host' => $host, 'port' => $port, 'latency_ms' => $latencyMs]
        );

        return [
            'success' => true,
            'message' => $successMsg,
            'latency_ms' => $latencyMs,
        ];
    }

    /**
     * Dispatch an end-to-end test email to a designated recipient.
     *
     * @return array{success: bool, message: string}
     */
    public function sendTestMail(string $recipientEmail, ?MailConfiguration $config = null): array
    {
        $config ??= MailConfiguration::instance();
        $this->applyDynamicTransport($config);

        $appName = Setting::where('key', 'theme.company_name')->value('value')
            ?? Setting::where('key', 'system.app_name')->value('value')
            ?? config('app.name', 'ARX-ERP');

        $htmlBody = <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 8px; border: 1px solid #334155;">
    <h2 style="color: #10b981; margin-top: 0;">&#10004; ARX-ERP SMTP Diagnostics Test Passed</h2>
    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
        This is an automated test message dispatched by <strong>{$appName}</strong> Mail Setup Manager to verify outbound email capabilities.
    </p>
    <div style="background: #1e293b; padding: 16px; border-radius: 6px; border: 1px solid #334155; font-size: 13px; color: #94a3b8; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Host:</strong> {$config->host}</p>
        <p style="margin: 4px 0;"><strong>Port:</strong> {$config->port}</p>
        <p style="margin: 4px 0;"><strong>Encryption:</strong> {$config->encryption}</p>
        <p style="margin: 4px 0;"><strong>From:</strong> {$config->from_name} &lt;{$config->from_address}&gt;</p>
        <p style="margin: 4px 0;"><strong>Timestamp:</strong> UTC </p>
    </div>
    <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
        If you received this message, outbound email delivery is fully operational.
    </p>
</div>
HTML;

        try {
            Mail::html($htmlBody, function ($message) use ($recipientEmail, $appName, $config): void {
                $message->to($recipientEmail)
                    ->subject("[Test Delivery] {$appName} Mail Diagnostic");

                if (! empty($config->from_address)) {
                    $message->from($config->from_address, $config->from_name ?? $appName);
                }
            });

            AuditLog::record(
                action: 'mail_test_dispatched',
                description: "Diagnostic test email dispatched to {$recipientEmail}",
                model: $config,
                metadata: ['recipient' => $recipientEmail, 'from' => $config->from_address]
            );

            return [
                'success' => true,
                'message' => "Test email successfully dispatched to {$recipientEmail}.",
            ];
        } catch (Throwable $e) {
            Log::error('SMTP Test Mail Dispatch Failed: '.$e->getMessage(), [
                'recipient' => $recipientEmail,
                'trace' => $e->getTraceAsString(),
            ]);

            AuditLog::record(
                action: 'mail_test_failed',
                description: "Diagnostic test email dispatch to {$recipientEmail} failed: {$e->getMessage()}",
                model: $config,
                metadata: ['recipient' => $recipientEmail, 'error' => $e->getMessage()]
            );

            return [
                'success' => false,
                'message' => 'Failed to dispatch email: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Render template and substitute placeholders.
     *
     * @param  array<string, string>  $contextPlaceholders
     * @return array{subject: string, html: string, plain: string, button_label: string|null}
     */
    public function renderTemplate(string $templateKey, array $contextPlaceholders = []): array
    {
        $template = MailTemplate::where('key', $templateKey)->first();

        $appName = Setting::where('key', 'theme.company_name')->value('value')
            ?? Setting::where('key', 'system.app_name')->value('value')
            ?? config('app.name', 'ARX-ERP');
        $hooks = MailHookConfiguration::instance();

        // Base dictionary
        $placeholders = [
            '{app_name}' => $appName,
            '{current_year}' => (string) date('Y'),
            '{expires_in_minutes}' => '10',
            '{support_email}' => 'support@arx-erp.local',
        ];

        // Global Custom Placeholders from hook configuration
        if (! empty($hooks->custom_placeholders) && is_array($hooks->custom_placeholders)) {
            foreach ($hooks->custom_placeholders as $item) {
                if (! empty($item['key'])) {
                    $key = '{'.trim($item['key'], '{}').'}';
                    $placeholders[$key] = (string) ($item['value'] ?? '');
                }
            }
        }

        // Context Specific Placeholders (Override defaults)
        foreach ($contextPlaceholders as $k => $v) {
            $key = '{'.trim($k, '{}').'}';
            $placeholders[$key] = (string) $v;
        }

        if (! $template) {
            // Fallback generic rendering
            $subject = strtr('Notification from {app_name}', $placeholders);
            $html = strtr('<p>{content}</p>', $placeholders);
            $plain = strtr('{content}', $placeholders);

            return [
                'subject' => $subject,
                'html' => $html,
                'plain' => $plain,
                'button_label' => null,
            ];
        }

        $subject = strtr($template->subject, $placeholders);
        $html = strtr($template->body_html, $placeholders);
        $plain = strtr($template->body_plain ?? strip_tags($template->body_html), $placeholders);

        return [
            'subject' => $subject,
            'html' => $html,
            'plain' => $plain,
            'button_label' => $template->action_button_label,
        ];
    }

    /**
     * Dispatch an email using the active configuration and template.
     */
    public function sendRaw(string $recipientEmail, string $subject, string $htmlBody, ?string $plainBody = null): bool
    {
        $config = MailConfiguration::instance();
        if (! $config->is_enabled) {
            Log::info("Mail delivery skipped for {$recipientEmail} because Mail System is disabled.");

            return false;
        }

        $this->applyDynamicTransport($config);

        try {
            Mail::html($htmlBody, function ($message) use ($recipientEmail, $subject, $config): void {
                $message->to($recipientEmail)->subject($subject);
                if (! empty($config->from_address)) {
                    $message->from($config->from_address, $config->from_name ?? config('app.name', 'ARX-ERP'));
                }
            });

            return true;
        } catch (Throwable $e) {
            Log::error("Failed to send email to {$recipientEmail}: ".$e->getMessage());

            return false;
        }
    }

    /**
     * Hook: Send 10-minute secure Password Reset Email.
     */
    public function sendPasswordResetMail(User $user): bool
    {
        $config = MailConfiguration::instance();
        $hooks = MailHookConfiguration::instance();

        if (! $config->is_enabled || (! $hooks->hook_forgot_password && ! $hooks->hook_user_pwd_change)) {
            return false;
        }

        // Generate 10-minute token
        $token = $this->tokenService->generateToken($user, 'password_reset', [], 10);

        // Build Frontend Landing Page Reset URL
        $baseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
        $resetUrl = "{$baseUrl}/reset-password?token={$token}";

        $nameParts = explode(' ', $user->name, 2);
        $firstName = $nameParts[0] ?? $user->name;
        $lastName = $nameParts[1] ?? '';

        $rendered = $this->renderTemplate('password_reset', [
            '{full_name}' => $user->name,
            '{first_name}' => $firstName,
            '{last_name}' => $lastName,
            '{email}' => $user->email,
            '{password_reset_link}' => $resetUrl,
            '{expires_in_minutes}' => '10',
        ]);

        return $this->sendRaw($user->email, $rendered['subject'], $rendered['html'], $rendered['plain']);
    }

    /**
     * Hook: Send 10-minute secure Account Verification / Activation Email.
     */
    public function sendVerificationMail(User $user): bool
    {
        $config = MailConfiguration::instance();
        $hooks = MailHookConfiguration::instance();

        if (! $config->is_enabled || ! $hooks->hook_verify_email_on_created) {
            return false;
        }

        // Generate 10-minute token
        $token = $this->tokenService->generateToken($user, 'email_verification', [], 10);

        $baseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
        $activationUrl = "{$baseUrl}/verify-email?token={$token}";

        $nameParts = explode(' ', $user->name, 2);
        $firstName = $nameParts[0] ?? $user->name;
        $lastName = $nameParts[1] ?? '';

        $rendered = $this->renderTemplate('email_verification', [
            '{full_name}' => $user->name,
            '{first_name}' => $firstName,
            '{last_name}' => $lastName,
            '{email}' => $user->email,
            '{account_activation_link}' => $activationUrl,
            '{expires_in_minutes}' => '10',
        ]);

        return $this->sendRaw($user->email, $rendered['subject'], $rendered['html'], $rendered['plain']);
    }

    /**
     * Hook: Send Account Status Change (Disabled / Reactivated) Email.
     */
    public function sendAccountStatusMail(User $user, bool $isActive, string $reason = 'Administrative policy update'): bool
    {
        $config = MailConfiguration::instance();
        $hooks = MailHookConfiguration::instance();

        if (! $config->is_enabled || ! $hooks->hook_account_status_change) {
            return false;
        }

        $baseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
        $loginUrl = "{$baseUrl}/login";

        $templateKey = $isActive ? 'account_reenabled' : 'account_disabled';

        $rendered = $this->renderTemplate($templateKey, [
            '{full_name}' => $user->name,
            '{email}' => $user->email,
            '{reason}' => $reason,
            '{login_link}' => $loginUrl,
            '{support_email}' => 'support@arx-erp.local',
        ]);

        return $this->sendRaw($user->email, $rendered['subject'], $rendered['html'], $rendered['plain']);
    }

    /**
     * Hook: Send Broadcast Notification Announcement via Email.
     */
    public function sendBroadcastNoticeMail(User $user, string $title, string $content, ?string $actionUrl = null, ?string $actionLabel = null): bool
    {
        $config = MailConfiguration::instance();
        $hooks = MailHookConfiguration::instance();

        if (! $config->is_enabled || ! $hooks->hook_notify_broadcast) {
            return false;
        }

        $baseUrl = rtrim(config('app.url', 'http://localhost:8000'), '/');
        $resolvedUrl = $actionUrl ?: $baseUrl;
        $resolvedLabel = $actionLabel ?: 'View Notification';

        $rendered = $this->renderTemplate('broadcast_notice', [
            '{full_name}' => $user->name,
            '{broadcast_title}' => $title,
            '{broadcast_content}' => $content,
            '{action_url}' => $resolvedUrl,
            '{action_button_label}' => $resolvedLabel,
        ]);

        return $this->sendRaw($user->email, $rendered['subject'], $rendered['html'], $rendered['plain']);
    }
}
