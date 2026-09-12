<style>
    @php
        $settings = app(\App\Settings\CustomizationSettings::class);
        $primaryText = rescue(fn () => $settings->color_text_primary, '#ffffff', false);
        $mutedText = rescue(fn () => $settings->color_text_secondary, '#9ca3af', false);
    @endphp

    :root {
        --custom-text-primary: {{ $primaryText }};
        --custom-text-muted: {{ $mutedText }};
    }

    /* Override Filament default text colors globally ONLY IN DARK MODE */
    .dark .fi-main, 
    .dark .fi-sidebar, 
    .dark .fi-topbar,
    .dark .fi-body {
        color: var(--custom-text-primary) !important;
    }

    /* Muted text and icons ONLY IN DARK MODE */
    .dark .text-gray-500, 
    .dark .text-gray-400,
    .dark .fi-color-gray {
        color: var(--custom-text-muted) !important;
    }
    
    /* Input text specifically ONLY IN DARK MODE */
    .dark .fi-input {
        color: var(--custom-text-primary) !important;
    }
    
    /* Specific icon overwrites ONLY IN DARK MODE */
    .dark .fi-icon-btn-icon,
    .dark svg.fi-topbar-icon {
        color: var(--custom-text-muted) !important;
    }


    /* Hide the default Filament top-right User Menu */
    .fi-topbar .fi-dropdown,
    .fi-topbar .fi-user-avatar {
        display: none !important;
    }
</style>
