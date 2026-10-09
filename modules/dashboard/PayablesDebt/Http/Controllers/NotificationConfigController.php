<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Controllers;

use App\Core\Http\Controllers\Api\V1\ThemeDashboardWidgetController;
use App\Core\Models\MailHookConfiguration;
use App\Core\Services\SettingsManager;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Modules\Dashboard\PayablesDebt\Http\Requests\UpdateNotificationConfigRequest;
use Modules\Dashboard\PayablesDebt\Models\PayableNotificationConfig;
use Modules\Dashboard\PayablesDebt\Services\NotificationTargetingService;
use Spatie\Permission\Models\Role;

class NotificationConfigController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private NotificationTargetingService $targetingService,
    ) {}

    /**
     * Get the current notification configuration along with available roles and active users.
     */
    public function show(): JsonResponse
    {
        $this->authorize('liabilities.notifications.config');

        $config = PayableNotificationConfig::instance();

        // Bidirectional sync with Theme Dashboard Widgets configuration
        try {
            $settingsManager = app(SettingsManager::class);
            $themeConfig = $settingsManager->get('theme.dashboard_widgets', null);
            if (is_array($themeConfig) && isset($themeConfig['payables_widget']['enabled'])) {
                $themeEnabled = (bool) $themeConfig['payables_widget']['enabled'];
                if ((bool) $config->widget_calendar_enabled !== $themeEnabled) {
                    $config->update(['widget_calendar_enabled' => $themeEnabled]);
                    $config->widget_calendar_enabled = $themeEnabled;
                }
            }
        } catch (\Throwable) {
        }

        // Check if dynamic mail hook trigger is enabled in SMTP triggers
        $mailHookEnabled = $this->isMailHookTriggerEnabled();

        // If the SMTP trigger is turned off, the module's email hook must be disabled
        if (! $mailHookEnabled && $config->enable_email) {
            $config->update(['enable_email' => false]);
            $config->enable_email = false;
        }

        $roles = Role::select('id', 'name')->orderBy('name')->get();
        $users = User::where('is_active', true)->select('id', 'name', 'email')->orderBy('name')->get();

        return response()->json([
            'data' => $config,
            'mail_hook_enabled' => $mailHookEnabled,
            'available_roles' => $roles,
            'available_users' => $users,
        ]);
    }

    /**
     * Update the notification configuration and synchronize mail hook status.
     */
    public function update(UpdateNotificationConfigRequest $request): JsonResponse
    {
        $config = PayableNotificationConfig::instance();
        $validated = $request->validated();

        $mailHookEnabled = $this->isMailHookTriggerEnabled();

        // If the SMTP trigger is turned off, enforce enable_email is disabled
        if (! $mailHookEnabled) {
            $validated['enable_email'] = false;
        }

        $config->update($validated);

        // Bidirectional sync with Theme Dashboard Widgets configuration
        if ($request->has('widget_calendar_enabled')) {
            $widgetEnabled = (bool) $request->boolean('widget_calendar_enabled');
            try {
                $settingsManager = app(SettingsManager::class);
                $themeConfig = $settingsManager->get('theme.dashboard_widgets', null);
                if (! is_array($themeConfig)) {
                    $themeConfig = ThemeDashboardWidgetController::getDefaultConfig();
                }

                if (! isset($themeConfig['payables_widget']) || ! is_array($themeConfig['payables_widget'])) {
                    $themeConfig['payables_widget'] = [
                        'id' => 'widget_payables_calendar',
                        'enabled' => $widgetEnabled,
                        'size' => '2/4',
                        'height' => '2/2-raw',
                    ];
                } else {
                    $themeConfig['payables_widget']['enabled'] = $widgetEnabled;
                }

                if (! isset($themeConfig['layout']) || ! is_array($themeConfig['layout'])) {
                    $themeConfig['layout'] = [];
                }

                if ($widgetEnabled) {
                    if (! in_array('widget_payables_calendar', $themeConfig['layout'], true)) {
                        $themeConfig['layout'][] = 'widget_payables_calendar';
                    }
                } else {
                    $themeConfig['layout'] = array_values(array_filter($themeConfig['layout'], fn ($id) => $id !== 'widget_payables_calendar'));
                }

                $settingsManager->set('theme.dashboard_widgets', $themeConfig, 'theme', 'json');
            } catch (\Throwable) {
            }
        }

        if ($mailHookEnabled && $request->has('enable_email')) {
            $enableEmail = (bool) $request->boolean('enable_email');
            try {
                $settingsManager = app(SettingsManager::class);
                $saved = $settingsManager->get('system.mail.module_hooks', []);
                if (is_string($saved)) {
                    $saved = json_decode($saved, true) ?: [];
                }
                $saved['hook_payable_notification'] = $enableEmail;
                $settingsManager->set('system.mail.module_hooks', json_encode($saved), 'system', 'json');
            } catch (\Throwable) {
            }
        }

        return response()->json([
            'message' => 'Notification configuration updated successfully.',
            'data' => $config->fresh(),
            'mail_hook_enabled' => $mailHookEnabled,
        ]);
    }

    /**
     * Check if the Payables & Debt Alerts mail trigger is enabled in SMTP settings.
     */
    protected function isMailHookTriggerEnabled(): bool
    {
        try {
            $saved = app(SettingsManager::class)->get('system.mail.module_hooks', []);
            if (is_string($saved)) {
                $saved = json_decode($saved, true) ?: [];
            }
            if (array_key_exists('hook_payable_notification', $saved)) {
                return (bool) $saved['hook_payable_notification'];
            }

            // Fallback check on mail_hooks_configuration table if column exists
            $hookConfig = MailHookConfiguration::instance();
            if (isset($hookConfig->hook_payable_notification)) {
                return (bool) $hookConfig->hook_payable_notification;
            }
        } catch (\Throwable) {
        }

        return false;
    }

    /**
     * Preview which users would receive notifications with current config.
     */
    public function previewRecipients(): JsonResponse
    {
        $this->authorize('liabilities.notifications.config');

        $config = PayableNotificationConfig::instance();
        $recipients = $this->targetingService->resolveRecipients($config);

        return response()->json([
            'count' => $recipients->count(),
            'recipients' => $recipients->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            }),
        ]);
    }

    /**
     * Get the overview widget configuration (accessible for dashboard overview).
     */
    public function widgetConfig(): JsonResponse
    {
        $config = PayableNotificationConfig::instance();

        return response()->json([
            'enabled' => (bool) ($config->widget_calendar_enabled ?? true),
            'size' => $config->widget_calendar_size ?? 'medium',
            'design' => $config->widget_calendar_design ?? 'modern_glass',
        ]);
    }
}
