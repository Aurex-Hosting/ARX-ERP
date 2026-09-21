<style>
@php
    use App\Models\Theme;
    use Illuminate\Support\Facades\Cache;
    $activeTheme = Cache::remember('active_theme', 3600, function () {
        return Theme::where('is_active', true)->first();
    });
    $options = $activeTheme ? $activeTheme->options : [];
    $colorPrimary = $options['color_primary'] ?? '#8b5cf6';
@endphp
:root {
    --theme-primary: {{ $colorPrimary }};
    /* You can also map this to Filament's Tailwind color palette dynamically using JS */
}
</style>

<script>
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'THEME_UPDATE') {
        const payload = event.data.payload;
        if (payload.color_primary) {
            document.documentElement.style.setProperty('--theme-primary', payload.color_primary);
            // Optionally update Filament CSS variables here as well
            // E.g., converting HEX to RGB for Filament's --primary-500 etc.
            
            // Very simple mapping to Filament primary color (assuming --primary-600 is used widely)
            // A true theme engine would use a JS color library to generate the 50-950 shades.
            // For now, setting a core variable is enough to demonstrate the live bridge!
            console.log('Live preview updated color:', payload.color_primary);
        }
    }
});
</script>
