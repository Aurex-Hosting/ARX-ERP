@php
use App\Models\Theme;
use Illuminate\Support\Facades\Cache;

$activeTheme = Cache::remember('active_theme', 3600, function () {
    return Theme::where('is_active', true)->first();
});

$options = $activeTheme ? ($activeTheme->options ?? []) : [];

$pageBg = $options['color_page_bg'] ?? '#030712';
$cardBg = $options['color_card_bg'] ?? '#111827';
$componentSurface = $options['color_component_surface'] ?? '#1f2937';
$neutralFill = $options['color_neutral_fill'] ?? '#374151';
$text = $options['color_text'] ?? '#f9fafb';
$textMuted = $options['color_text_muted'] ?? '#9ca3af';
$textDim = $options['color_text_dim'] ?? '#6b7280';
$accentPrimary = $options['color_accent_primary'] ?? '#8b5cf6';
$accentSecondary = $options['color_accent_secondary'] ?? '#a78bfa';
$cornerRounding = ($options['corner_rounding'] ?? 12) . 'px';
$fontFamily = $options['font_family'] ?? 'Onest';
$uiScale = $options['ui_scale'] ?? 65;
$contentWidth = ($options['content_width'] ?? 1280) . 'px';
@endphp

@if($fontFamily)
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family={{ urlencode($fontFamily) }}:wght@400;500;600;700&display=swap" rel="stylesheet" id="theme-google-font">
@endif

<style id="theme-dynamic-styles">
    :root {
        --theme-page-bg: {{ $pageBg }};
        --theme-card-bg: {{ $cardBg }};
        --theme-component-surface: {{ $componentSurface }};
        --theme-neutral-fill: {{ $neutralFill }};
        --theme-text: {{ $text }};
        --theme-text-muted: {{ $textMuted }};
        --theme-text-dim: {{ $textDim }};
        --theme-accent-primary: {{ $accentPrimary }};
        --theme-accent-secondary: {{ $accentSecondary }};
        --theme-corner-rounding: {{ $cornerRounding }};
        --theme-font-family: '{{ $fontFamily }}', sans-serif;
        --theme-ui-scale: {{ $uiScale }};
        --theme-content-width: {{ $contentWidth }};
    }
</style>

<script>
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'THEME_UPDATE') {
            const payload = event.data.payload || {};
            const root = document.documentElement;

            const mappings = {
                'color_page_bg': '--theme-page-bg',
                'color_card_bg': '--theme-card-bg',
                'color_component_surface': '--theme-component-surface',
                'color_neutral_fill': '--theme-neutral-fill',
                'color_text': '--theme-text',
                'color_text_muted': '--theme-text-muted',
                'color_text_dim': '--theme-text-dim',
                'color_accent_primary': '--theme-accent-primary',
                'color_accent_secondary': '--theme-accent-secondary',
                'corner_rounding': '--theme-corner-rounding',
                'font_family': '--theme-font-family',
                'ui_scale': '--theme-ui-scale',
                'content_width': '--theme-content-width'
            };

            for (const [key, cssVar] of Object.entries(mappings)) {
                if (payload[key] !== undefined && payload[key] !== null) {
                    let value = payload[key];

                    if (key === 'corner_rounding') {
                        value = value + 'px';
                    } else if (key === 'content_width') {
                        value = value + 'px';
                    } else if (key === 'font_family') {
                        // Dynamically inject the new Google Font if changed
                        const fontSlug = String(value).replace(/\s+/g, '-');
                        const linkId = 'theme-google-font-' + fontSlug;
                        if (!document.getElementById(linkId)) {
                            const link = document.createElement('link');
                            link.id = linkId;
                            link.rel = 'stylesheet';
                            link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(value) + ':wght@400;500;600;700&display=swap';
                            document.head.appendChild(link);
                        }
                        value = "'" + value + "', sans-serif";
                    }

                    root.style.setProperty(cssVar, String(value));
                }
            }
        }
    });
</script>
