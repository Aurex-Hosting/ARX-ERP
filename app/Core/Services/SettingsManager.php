<?php

declare(strict_types=1);

namespace App\Core\Services;

use App\Core\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Service managing hierarchical system and user-scoped settings with caching.
 */
class SettingsManager
{
    /**
     * Cache TTL in seconds.
     */
    protected const CACHE_TTL = 3600;

    /**
     * Get a setting value by key.
     */
    public function get(string $key, mixed $default = null, ?int $userId = null): mixed
    {
        $cacheKey = $this->getCacheKey($key, $userId);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($key, $default, $userId): mixed {
            try {
                if ($userId !== null) {
                    $userSetting = Setting::where('key', $key)->where('user_id', $userId)->first();
                    if ($userSetting) {
                        return $userSetting->value;
                    }
                }

                $systemSetting = Setting::where('key', $key)->whereNull('user_id')->first();

                return $systemSetting ? $systemSetting->value : $default;
            } catch (\Throwable) {
                return $default;
            }
        });
    }

    /**
     * Set a setting value.
     */
    public function set(string $key, mixed $value, string $group = 'system', string $type = 'string', ?int $userId = null): Setting
    {
        $setting = Setting::updateOrCreate(
            [
                'key' => $key,
                'user_id' => $userId,
            ],
            [
                'value' => $value,
                'group' => $group,
                'type' => $type,
                'scope' => $userId ? 'user' : 'system',
            ]
        );

        Cache::forget($this->getCacheKey($key, $userId));

        return $setting;
    }

    /**
     * Get all settings in a specific group.
     *
     * @return array<string, mixed>
     */
    public function getGroup(string $group, ?int $userId = null): array
    {
        $query = Setting::where('group', $group);

        if ($userId) {
            $query->where(function ($q) use ($userId): void {
                $q->where('user_id', $userId)->orWhereNull('user_id');
            });
        } else {
            $query->whereNull('user_id');
        }

        return $query->pluck('value', 'key')->toArray();
    }

    /**
     * Generate cache key for setting.
     */
    protected function getCacheKey(string $key, ?int $userId): string
    {
        $scope = $userId ? "user:{$userId}" : 'system';

        return "arx:settings:{$scope}:{$key}";
    }
}
