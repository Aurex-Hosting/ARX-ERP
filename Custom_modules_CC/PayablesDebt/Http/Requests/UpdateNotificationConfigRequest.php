<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('liabilities.notifications.config');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'audience_type' => ['required', 'in:all_users,specific_roles,all_except_roles,all_except_users,selected_users_and_roles,selected_roles_except_users'],
            'selected_user_ids' => ['nullable', 'array'],
            'selected_user_ids.*' => ['integer', 'exists:users,id'],
            'selected_role_ids' => ['nullable', 'array'],
            'selected_role_ids.*' => ['integer', 'exists:roles,id'],
            'excluded_user_ids' => ['nullable', 'array'],
            'excluded_user_ids.*' => ['integer', 'exists:users,id'],
            'excluded_role_ids' => ['nullable', 'array'],
            'excluded_role_ids.*' => ['integer', 'exists:roles,id'],
            'notify_due_soon_days' => ['sometimes', 'integer', 'min:1', 'max:30'],
            'notify_overdue' => ['sometimes', 'boolean'],
            'enable_in_app' => ['sometimes', 'boolean'],
            'enable_email' => ['sometimes', 'boolean'],
            'widget_calendar_enabled' => ['sometimes', 'boolean'],
            'widget_calendar_size' => ['sometimes', 'string', 'in:small,medium,large'],
            'widget_calendar_design' => ['sometimes', 'string', 'in:modern_glass,minimal,compact_agenda,modern_slate'],
        ];
    }
}
