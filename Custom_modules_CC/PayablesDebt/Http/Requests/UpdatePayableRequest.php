<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePayableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('liabilities.edit');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'vendor_name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:100'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'currency' => ['sometimes', 'string', 'max:10'],
            'total_amount' => ['sometimes', 'numeric', 'min:0'],
            'payment_url' => ['nullable', 'url', 'max:2000'],
            'payment_urls' => ['nullable', 'array'],
            'payment_urls.*.url' => ['nullable', 'url', 'max:2000'],
            'payment_urls.*.label' => ['nullable', 'string', 'max:100'],
            'plan_tier' => ['nullable', 'string', 'max:100'],
            'payment_method_info' => ['nullable', 'string', 'max:255'],
            'auto_renew' => ['sometimes', 'boolean'],
            'notice_period_days' => ['sometimes', 'integer', 'min:0'],
            'pregeneration_days' => ['sometimes', 'integer', 'min:1', 'max:90'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
