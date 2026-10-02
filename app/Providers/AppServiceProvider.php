<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 1. Implicitly grant Super-Admins all current and upcoming abilities via Gate
        Gate::before(function ($user, $ability): ?bool {
            if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
                return true;
            }

            return null;
        });

        // 2. Automatically sync any newly created permission directly to the super-admin role
        Permission::created(function (Permission $permission): void {
            $superAdminRoleName = config('arx.roles.super_admin', 'super-admin');
            $superAdminRole = Role::where('name', $superAdminRoleName)
                ->where('guard_name', $permission->guard_name)
                ->first();

            if ($superAdminRole && ! $superAdminRole->hasPermissionTo($permission, $permission->guard_name)) {
                $superAdminRole->givePermissionTo($permission);
            }
        });

        // 3. Track real scheduler heartbeat and task execution metrics
        Event::listen(ScheduledTaskFinished::class, function (ScheduledTaskFinished $event): void {
            Cache::put('arx:scheduler_last_tick', time(), now()->addDays(7));
            Cache::increment('arx:scheduler_ticks_count');

            $name = $event->task->command ? preg_replace('/^.*?artisan["\']?\s+/i', '', $event->task->command) : ($event->task->description ?: $event->task->getSummaryForDisplay());
            $name = trim((string) $name, " \t\n\r\0\x0B\"'");
            $runtime = round($event->runtime * 1000, 1).'ms';

            Cache::put('arx:task_last_run:'.md5($name), [
                'timestamp' => time(),
                'duration' => $runtime,
                'status' => 'healthy',
            ], now()->addDays(7));
        });

        Event::listen(ScheduledTaskFailed::class, function (ScheduledTaskFailed $event): void {
            Cache::put('arx:scheduler_last_tick', time(), now()->addDays(7));

            $name = $event->task->command ? preg_replace('/^.*?artisan["\']?\s+/i', '', $event->task->command) : ($event->task->description ?: $event->task->getSummaryForDisplay());
            $name = trim((string) $name, " \t\n\r\0\x0B\"'");

            Cache::put('arx:task_last_run:'.md5($name), [
                'timestamp' => time(),
                'duration' => 'failed',
                'status' => 'failing',
            ], now()->addDays(7));
        });
    }
}
