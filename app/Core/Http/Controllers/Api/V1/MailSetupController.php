<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\MailConfiguration;
use App\Core\Models\MailHookConfiguration;
use App\Core\Models\MailTemplate;
use App\Core\Services\MailService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller managing Mail Setup, SMTP Server credentials, Diagnostics,
 * Feature Trigger Hooks, and Email Templates.
 */
class MailSetupController extends Controller
{
    public function __construct(
        protected MailService $mailService
    ) {}

    /**
     * Get the current Mail Setup & SMTP server settings.
     */
    public function getConfig(): JsonResponse
    {
        $config = MailConfiguration::instance();

        return response()->json([
            'config' => [
                'id' => $config->id,
                'is_enabled' => (bool) $config->is_enabled,
                'host' => $config->host ?? '',
                'port' => (int) ($config->port ?: 587),
                'username' => $config->username ?? '',
                'encryption' => $config->encryption ?? 'tls',
                'verify_peer' => (bool) ($config->verify_peer ?? false),
                'from_address' => $config->from_address ?? '',
                'from_name' => $config->from_name ?? '',
                'has_password' => ! empty($config->password),
                'last_tested_at' => $config->last_tested_at,
                'last_test_status' => $config->last_test_status,
                'last_test_message' => $config->last_test_message,
                'updated_at' => $config->updated_at,
            ],
        ]);
    }

    /**
     * Update Mail Setup & SMTP server credentials.
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['required', 'string', 'in:tls,ssl,none'],
            'verify_peer' => ['nullable', 'boolean'],
            'from_address' => ['nullable', 'email', 'max:255'],
            'from_name' => ['nullable', 'string', 'max:255'],
        ]);

        $config = MailConfiguration::instance();

        $data = [
            'is_enabled' => $validated['is_enabled'],
            'host' => $validated['host'] ?? null,
            'port' => $validated['port'],
            'username' => $validated['username'] ?? null,
            'encryption' => $validated['encryption'],
            'verify_peer' => $validated['verify_peer'] ?? false,
            'from_address' => $validated['from_address'] ?? null,
            'from_name' => $validated['from_name'] ?? null,
        ];

        if (! empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        $config->update($data);

        return response()->json([
            'message' => 'Mail configuration updated successfully.',
            'config' => [
                'id' => $config->id,
                'is_enabled' => (bool) $config->is_enabled,
                'host' => $config->host ?? '',
                'port' => (int) $config->port,
                'username' => $config->username ?? '',
                'encryption' => $config->encryption,
                'verify_peer' => (bool) ($config->verify_peer ?? false),
                'from_address' => $config->from_address ?? '',
                'from_name' => $config->from_name ?? '',
                'has_password' => ! empty($config->password),
                'last_tested_at' => $config->last_tested_at,
                'last_test_status' => $config->last_test_status,
                'last_test_message' => $config->last_test_message,
            ],
        ]);
    }

    /**
     * Check socket connectivity to the configured SMTP server.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $request->validate([
            'auto_enable' => ['nullable', 'boolean'],
            'host' => ['nullable', 'string'],
            'port' => ['nullable', 'integer'],
            'encryption' => ['nullable', 'string', 'in:tls,ssl,none'],
            'verify_peer' => ['nullable', 'boolean'],
            'username' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
        ]);

        $config = MailConfiguration::instance();

        // If transient test params supplied, temporarily apply them
        if ($request->filled('host')) {
            $config->host = $request->input('host');
            $config->port = (int) $request->input('port', 587);
            $config->encryption = $request->input('encryption', 'tls');
            if ($request->has('verify_peer')) {
                $config->verify_peer = $request->boolean('verify_peer');
            }
            if ($request->filled('username')) {
                $config->username = $request->input('username');
            }
            if ($request->filled('password')) {
                $config->password = $request->input('password');
            }
        }

        $result = $this->mailService->testConnection($config);

        if ($result['success'] && $request->boolean('auto_enable')) {
            $config->is_enabled = true;
            $config->save();
        }

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'latency_ms' => $result['latency_ms'],
            'is_enabled' => (bool) $config->is_enabled,
        ], $result['success'] ? 200 : 422);
    }

    /**
     * Send diagnostic test email to recipient.
     */
    public function sendTestMail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $result = $this->mailService->sendTestMail($validated['email']);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
        ], $result['success'] ? 200 : 422);
    }

    /**
     * Get Feature Trigger Hooks and Custom Placeholders dictionary.
     */
    public function getHooks(): JsonResponse
    {
        $hooks = MailHookConfiguration::instance();
        $config = MailConfiguration::instance();

        return response()->json([
            'is_mail_enabled' => (bool) $config->is_enabled,
            'hooks' => [
                'id' => $hooks->id,
                'is_mail_enabled' => (bool) $config->is_enabled,
                'hook_user_pwd_change' => (bool) $hooks->hook_user_pwd_change,
                'hook_forgot_password' => (bool) $hooks->hook_forgot_password,
                'hook_verify_email_on_created' => (bool) $hooks->hook_verify_email_on_created,
                'hook_account_status_change' => (bool) $hooks->hook_account_status_change,
                'hook_notify_broadcast' => (bool) $hooks->hook_notify_broadcast,
                'custom_placeholders' => $hooks->custom_placeholders ?? [],
            ],
        ]);
    }

    /**
     * Update Feature Trigger Hooks and Custom Placeholders dictionary.
     */
    public function updateHooks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hook_user_pwd_change' => ['required', 'boolean'],
            'hook_forgot_password' => ['required', 'boolean'],
            'hook_verify_email_on_created' => ['required', 'boolean'],
            'hook_account_status_change' => ['required', 'boolean'],
            'hook_notify_broadcast' => ['required', 'boolean'],
            'custom_placeholders' => ['nullable', 'array'],
            'custom_placeholders.*.key' => ['required_with:custom_placeholders', 'string', 'max:64'],
            'custom_placeholders.*.value' => ['nullable', 'string', 'max:255'],
            'custom_placeholders.*.description' => ['nullable', 'string', 'max:255'],
        ]);

        $hooks = MailHookConfiguration::instance();
        $hooks->update([
            'hook_user_pwd_change' => $validated['hook_user_pwd_change'],
            'hook_forgot_password' => $validated['hook_forgot_password'],
            'hook_verify_email_on_created' => $validated['hook_verify_email_on_created'],
            'hook_account_status_change' => $validated['hook_account_status_change'],
            'hook_notify_broadcast' => $validated['hook_notify_broadcast'],
            'custom_placeholders' => $validated['custom_placeholders'] ?? [],
        ]);

        return response()->json([
            'message' => 'Trigger hooks and placeholders updated successfully.',
            'hooks' => $hooks,
        ]);
    }

    /**
     * Get list of all Dynamic Mail Templates.
     */
    public function getTemplates(): JsonResponse
    {
        $templates = MailTemplate::orderBy('id')->get();

        return response()->json([
            'templates' => $templates,
        ]);
    }

    /**
     * Get a specific template by key.
     */
    public function getTemplate(string $key): JsonResponse
    {
        $template = MailTemplate::where('key', $key)->firstOrFail();

        return response()->json([
            'template' => $template,
        ]);
    }

    /**
     * Update an email template.
     */
    public function updateTemplate(Request $request, string $key): JsonResponse
    {
        $template = MailTemplate::where('key', $key)->firstOrFail();

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body_html' => ['required', 'string'],
            'body_plain' => ['nullable', 'string'],
            'action_button_label' => ['nullable', 'string', 'max:100'],
        ]);

        $template->update($validated);

        return response()->json([
            'message' => 'Email template updated successfully.',
            'template' => $template,
        ]);
    }

    /**
     * Render live HTML preview for a template using dummy/context placeholders.
     */
    public function previewTemplate(Request $request, string $key): JsonResponse
    {
        $sampleContext = [
            '{full_name}' => 'Alexander Vance',
            '{first_name}' => 'Alexander',
            '{last_name}' => 'Vance',
            '{email}' => 'alexander.vance@example.com',
            '{password_reset_link}' => url('/reset-password?token=sample_token_hash_preview_only'),
            '{account_activation_link}' => url('/verify-email?token=sample_token_hash_preview_only'),
            '{login_link}' => url('/login'),
            '{reason}' => 'Suspicious authentication anomalies detected.',
            '{broadcast_title}' => 'Scheduled Maintenance Window - Q3 Upgrades',
            '{broadcast_content}' => "Please be advised that the ERP system will undergo scheduled infrastructure maintenance this Sunday from 02:00 to 04:00 UTC.\nAll active sessions will be preserved.",
            '{action_url}' => url('/dashboard'),
            '{action_button_label}' => 'View Announcement Details',
            '{expires_in_minutes}' => '10',
        ];

        $rendered = $this->mailService->renderTemplate($key, $sampleContext);

        return response()->json([
            'preview' => $rendered,
        ]);
    }
}
