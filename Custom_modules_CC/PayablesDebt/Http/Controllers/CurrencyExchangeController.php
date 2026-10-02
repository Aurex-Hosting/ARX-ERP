<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Dashboard\PayablesDebt\Services\CurrencyRateService;

class CurrencyExchangeController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrencyRateService $currencyService,
    ) {}

    /**
     * Get exchange rates for a base currency.
     */
    public function rates(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        $baseCurrency = $request->input('base', config('payables.base_currency', 'USD'));
        $rates = $this->currencyService->getRates($baseCurrency);

        return response()->json([
            'base' => strtoupper($baseCurrency),
            'rates' => $rates,
        ]);
    }

    /**
     * Convert an amount between two currencies.
     */
    public function convert(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'from' => ['required', 'string', 'max:10'],
            'to' => ['required', 'string', 'max:10'],
        ]);

        $converted = $this->currencyService->convert(
            amount: (float) $request->input('amount'),
            from: $request->input('from'),
            to: $request->input('to'),
        );

        return response()->json([
            'original_amount' => (float) $request->input('amount'),
            'from' => strtoupper($request->input('from')),
            'to' => strtoupper($request->input('to')),
            'converted_amount' => $converted,
        ]);
    }

    /**
     * Force refresh cached exchange rates.
     */
    public function refresh(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        $baseCurrency = $request->input('base', config('payables.base_currency', 'USD'));
        $rates = $this->currencyService->refreshRates($baseCurrency);

        return response()->json([
            'message' => 'Exchange rates refreshed.',
            'base' => strtoupper($baseCurrency),
            'rates' => $rates,
        ]);
    }

    /**
     * Get list of supported currencies.
     */
    public function supportedCurrencies(): JsonResponse
    {
        $this->authorize('liabilities.view');

        return response()->json([
            'currencies' => config('payables.supported_currencies', []),
        ]);
    }
}
