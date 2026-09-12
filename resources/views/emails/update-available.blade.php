@component("mail::message")
# New System Update Available ({{ $version }})

A new system update has been detected and is ready to install.

**Release Notes:**
{{ Str::limit($notes, 500) }}

@component("mail::button", ["url" => url("/admin/system-updater")])
View & Install Update
@endcomponent

Thanks,<br>
{{ config("app.name") }}
@endcomponent
