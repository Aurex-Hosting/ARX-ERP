<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Live currency exchange rates with jsDelivr primary and Pages.dev fallback.
 */
class CurrencyRateService
{
    /**
     * Fetch exchange rates for a base currency, with caching.
     *
     * @return array<string, float>
     */
    public function getRates(string $baseCurrency = 'usd'): array
    {
        $baseCurrency = strtolower($baseCurrency);
        $cacheKey = "payables_exchange_rates_{$baseCurrency}";
        $cacheTtl = config('payables.exchange_rate.cache_ttl', 21600);

        return Cache::remember($cacheKey, $cacheTtl, function () use ($baseCurrency): array {
            return $this->fetchFromApi($baseCurrency);
        });
    }

    /**
     * Convert an amount from one currency to another.
     */
    public function convert(float $amount, string $from, string $to): float
    {
        if (strtolower($from) === strtolower($to)) {
            return $amount;
        }

        $rates = $this->getRates($from);
        $targetRate = $rates[strtolower($to)] ?? null;

        if ($targetRate === null) {
            Log::warning("Exchange rate not found for {$from} -> {$to}");

            return $amount;
        }

        return round($amount * $targetRate, 2);
    }

    /**
     * Fetch rates from API with dual-source fallback.
     *
     * @return array<string, float>
     */
    protected function fetchFromApi(string $baseCurrency): array
    {
        $primaryUrl = str_replace(
            '{currency}',
            $baseCurrency,
            config('payables.exchange_rate.primary_url', '')
        );

        $fallbackUrl = str_replace(
            '{currency}',
            $baseCurrency,
            config('payables.exchange_rate.fallback_url', '')
        );

        $supported = array_map('strtolower', config('payables.supported_currencies', ['USD', 'EUR', 'LKR', 'INR']));

        // Try primary endpoint
        try {
            $response = Http::timeout(10)->get($primaryUrl);
            if ($response->successful()) {
                $data = $response->json();
                if (isset($data[$baseCurrency])) {
                    $rates = (array) $data[$baseCurrency];
                    $filtered = [];
                    foreach ($supported as $curr) {
                        $filtered[$curr] = $curr === $baseCurrency ? 1.0 : (float) ($rates[$curr] ?? 0);
                    }

                    return $filtered;
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Currency API primary endpoint failed: {$e->getMessage()}");
        }

        // Try fallback endpoint
        try {
            $response = Http::timeout(10)->get($fallbackUrl);
            if ($response->successful()) {
                $data = $response->json();
                if (isset($data[$baseCurrency])) {
                    $rates = (array) $data[$baseCurrency];
                    $filtered = [];
                    foreach ($supported as $curr) {
                        $filtered[$curr] = $curr === $baseCurrency ? 1.0 : (float) ($rates[$curr] ?? 0);
                    }

                    return $filtered;
                }
            }
        } catch (\Throwable $e) {
            Log::error("Currency API fallback endpoint also failed: {$e->getMessage()}");
        }

        // Default self-rate if network is unreachable
        $fallbackRates = [];
        foreach ($supported as $curr) {
            $fallbackRates[$curr] = $curr === $baseCurrency ? 1.0 : 0.0;
        }

        return $fallbackRates;
    }

    /**
     * Force refresh cached rates.
     *
     * @return array<string, float>
     */
    public function refreshRates(string $baseCurrency = 'usd'): array
    {
        $baseCurrency = strtolower($baseCurrency);
        $cacheKey = "payables_exchange_rates_{$baseCurrency}";

        Cache::forget($cacheKey);

        return $this->getRates($baseCurrency);
    }
}
