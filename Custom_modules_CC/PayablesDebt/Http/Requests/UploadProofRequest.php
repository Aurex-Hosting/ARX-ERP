<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('liabilities.doc.upload');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'document' => ['required', 'file', 'max:20480', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx'],
            'document_type' => ['required', 'in:receipt,bank_slip,transfer_confirmation,other'],
            'installment_id' => ['nullable', 'integer', 'exists:payable_installments,id'],
            'custom_filename' => ['nullable', 'string', 'max:255'],
        ];
    }
}
