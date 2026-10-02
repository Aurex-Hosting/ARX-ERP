<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Providers;

use App\Core\Models\MailHookConfiguration;
use App\Core\Services\HookManager;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Modules\Dashboard\PayablesDebt\Console\CalculateOverduePenaltiesCommand;
use Modules\Dashboard\PayablesDebt\Console\ProcessRecurringPayablesCommand;
use Modules\Dashboard\PayablesDebt\Services\CurrencyRateService;
use Modules\Dashboard\PayablesDebt\Services\DocumentSecurityService;
use Modules\Dashboard\PayablesDebt\Services\LoanCalculationEngine;
use Modules\Dashboard\PayablesDebt\Services\NotificationTargetingService;
use Modules\Dashboard\PayablesDebt\Services\RecurringScheduleGenerator;

class PayablesDebtServiceProvider extends ServiceProvider
{
    /**
     * Register module services into the container.
     */
    public function register(): void
    {
        // Merge module config
        $configPath = dirname(__DIR__).'/Config/payables.php';
        if (file_exists($configPath)) {
            $this->mergeConfigFrom($configPath, 'payables');
        }

        // Bind services as singletons
        $this->app->singleton(LoanCalculationEngine::class);
        $this->app->singleton(RecurringScheduleGenerator::class);
        $this->app->singleton(CurrencyRateService::class);
        $this->app->singleton(DocumentSecurityService::class);
        $this->app->singleton(NotificationTargetingService::class);
    }

    /**
     * Bootstrap module services: commands, scheduler, and hook registration.
     */
    public function boot(): void
    {
        // Register artisan commands
        if ($this->app->runningInConsole()) {
            $this->commands([
                ProcessRecurringPayablesCommand::class,
                CalculateOverduePenaltiesCommand::class,
            ]);
        }

        // Register scheduled tasks
        $this->app->booted(function (): void {
            $schedule = $this->app->make(Schedule::class);
            $schedule->command('payables:process-recurring')->daily()->at('01:00');
            $schedule->command('payables:calculate-penalties')->daily()->at('02:00');
        });

        // Register Mail Hook for payable notifications
        $this->registerMailHook();

        // Register uninstall data cleanup hook
        $this->registerUninstallHook();
    }

    /**
     * Register the `hook_payable_notification` trigger with the Mail Setup system.
     */
    protected function registerMailHook(): void
    {
        try {
            /** @var HookManager $hookManager */
            $hookManager = $this->app->make(HookManager::class);

            $hookManager->registerAction('mail.hooks.register', function (): void {
                // Add the hook_payable_notification column to mail_hooks_configuration
                // if it doesn't already exist (handled gracefully)
                try {
                    $hookConfig = MailHookConfiguration::instance();

                    if (! isset($hookConfig->hook_payable_notification)) {
                        // Column may not exist yet — the module migration should add it
                        // or it can be handled dynamically via settings
                    }
                } catch (\Throwable) {
                    // Gracefully ignore if mail hooks table isn't ready
                }
            });

            // Register a filter to extend the available mail hooks list
            $hookManager->registerFilter('mail.hooks.available', function (array $hooks): array {
                $hooks['hook_payable_notification'] = [
                    'label' => 'Payables & Debt Notifications',
                    'description' => 'Send email alerts for due-soon and overdue payables',
                    'module' => 'payables-debt',
                    'module_name' => 'Payables & Debt',
                ];

                return $hooks;
            });
        } catch (\Throwable) {
            // HookManager may not be available during early boot
        }
    }

    /**
     * Register hook to clean up module data when uninstalled with delete_data flag.
     */
    protected function registerUninstallHook(): void
    {
        try {
            /** @var HookManager $hookManager */
            $hookManager = $this->app->make(HookManager::class);

            $hookManager->registerAction('module.uninstalling', function ($module, bool $deleteData = false): void {
                if (! is_object($module) || ($module->slug ?? '') !== 'payables-debt') {
                    return;
                }

                // Always remove the mail hook column when uninstalling
                try {
                    if (Schema::hasColumn('mail_hooks_configuration', 'hook_payable_notification')) {
                        Schema::table('mail_hooks_configuration', function (Blueprint $table): void {
                            $table->dropColumn('hook_payable_notification');
                        });
                    }
                } catch (\Throwable) {
                    // Gracefully ignore
                }

                if (! $deleteData) {
                    return;
                }

                // Purge all module data when delete_data is true
                try {
                    // Delete stored documents from disk
                    $storagePath = storage_path('app/'.config('payables.document_storage_path', 'private/payables'));
                    if (is_dir($storagePath)) {
                        File::deleteDirectory($storagePath);
                    }

                    // Drop module tables in reverse order
                    Schema::dropIfExists('payable_notification_configs');
                    Schema::dropIfExists('payable_audit_logs');
                    Schema::dropIfExists('payable_documents');
                    Schema::dropIfExists('payable_installments');
                    Schema::dropIfExists('payables');
                } catch (\Throwable) {
                    // Gracefully ignore if tables don't exist
                }
            });
        } catch (\Throwable) {
            // HookManager may not be available during early boot
        }
    }
}
