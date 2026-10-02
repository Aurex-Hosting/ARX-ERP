<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePayableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('liabilities.create');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'in:invoice,subscription,loan'],
            'title' => ['required', 'string', 'max:255'],
            'vendor_name' => ['required', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:100'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'currency' => ['required', 'string', 'in:USD,EUR,LKR,INR,usd,eur,lkr,inr'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'payment_url' => ['nullable', 'url', 'max:2000'],
            'payment_urls' => ['nullable', 'array'],
            'payment_urls.*.url' => ['nullable', 'url', 'max:2000'],
            'payment_urls.*.label' => ['nullable', 'string', 'max:100'],

            // Flexible interval & recurring settings
            'is_recurring' => ['sometimes', 'boolean'],
            'frequency' => ['nullable', 'string', 'max:50'],
            'interval_count' => ['nullable', 'integer', 'min:1'],
            'interval_unit' => ['nullable', 'in:days,months,years'],
            'start_date' => ['nullable', 'date'],
            'target_due_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'repeat_indefinitely' => ['sometimes', 'boolean'],
            'pregeneration_days' => ['sometimes', 'integer', 'min:1', 'max:90'],

            // Subscription
            'plan_tier' => ['nullable', 'string', 'max:100'],
            'payment_method_info' => ['nullable', 'string', 'max:255'],
            'auto_renew' => ['sometimes', 'boolean'],
            'notice_period_days' => ['sometimes', 'integer', 'min:0'],

            // Loan
            'loan_type' => ['nullable', 'in:single_time,long_time'],
            'principal_amount' => ['required_if:type,loan', 'nullable', 'numeric', 'min:0'],
            'interest_rate' => ['required_if:type,loan', 'nullable', 'numeric', 'min:0', 'max:100'],
            'interest_frequency' => ['nullable', 'in:daily,monthly,yearly'],
            'interest_period_count' => ['nullable', 'integer', 'min:1'],
            'interest_period_unit' => ['nullable', 'in:days,months,years'],
            'calculation_method' => ['nullable', 'in:flat,simple,compounding'],
            'tenure_months' => ['nullable', 'integer', 'min:1'],
            'grace_period_days' => ['sometimes', 'integer', 'min:0'],
            'penalty_type' => ['nullable', 'in:fixed_fee,daily_percentage'],
            'penalty_rate' => ['nullable', 'numeric', 'min:0'],
            'payment_day_of_month' => ['nullable', 'integer', 'min:1', 'max:31'],

            'metadata' => ['nullable', 'array'],
        ];
    }
}
