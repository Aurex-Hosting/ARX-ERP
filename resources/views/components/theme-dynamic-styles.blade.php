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
$uiScale = ($options['ui_scale'] ?? 100);
$contentWidth = ($options['content_width'] ?? 1280) . 'px';
$layoutStyle = $options['layout_style'] ?? 'default';
$dashboardCardStyle = $options['dashboard_card_style'] ?? 'random';
@endphp

@if($fontFamily)
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family={{ urlencode($fontFamily) }}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" id="theme-google-font">
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
        --theme-ui-scale: {{ $uiScale / 100 }};
        --theme-content-width: {{ $contentWidth }};
    }

    /* Apply global Font Family */
    body, .fi-body, input, button, select, textarea, .fi-sidebar, .fi-topbar {
        font-family: var(--theme-font-family) !important;
    }

    /* Apply UI Scale */
    @if($uiScale < 100)
    body.fi-body {
        zoom: var(--theme-ui-scale);
    }
    @endif

    /* Apply Content Max Width */
    .fi-page-content-ctn,
    .fi-main > div,
    .fi-main-ctn {
        max-width: var(--theme-content-width) !important;
        margin-left: auto !important;
        margin-right: auto !important;
    }

    /* Apply Corner Rounding */
    .fi-section,
    .fi-card,
    .fi-widget,
    .fi-ta-ctn,
    .fi-modal-window,
    .fi-dropdown-panel,
    .fi-input-wrp,
    .fi-btn,
    .fi-badge,
    .rounded-xl,
    .rounded-lg,
    .rounded-2xl {
        border-radius: var(--theme-corner-rounding) !important;
    }

    /* Apply Dark Theme Surfaces & Fills */
    .dark body.fi-body,
    .dark .fi-body,
    .dark .fi-main {
        background-color: var(--theme-page-bg) !important;
    }

    .dark .fi-topbar {
        background-color: var(--theme-page-bg) !important;
        border-color: rgba(255,255,255,0.06) !important;
    }

    .dark .fi-sidebar {
        background-color: var(--theme-page-bg) !important;
        border-color: rgba(255,255,255,0.06) !important;
    }

    /* Cards & Panels */
    .dark .fi-section,
    .dark .fi-card,
    .dark .fi-widget > div,
    .dark .fi-ta-ctn,
    .dark .fi-modal-window,
    .dark .fi-dropdown-panel {
        background-color: var(--theme-card-bg) !important;
        border-color: rgba(255,255,255,0.06) !important;
    }

    /* Component Surface (sub-components inside card) */
    .dark .fi-input-wrp,
    .dark .fi-fo-field-wrp input,
    .dark .fi-fo-field-wrp select,
    .dark .fi-fo-field-wrp textarea,
    .dark .fi-tabs-item-active,
    .dark .fi-ta-record-checkbox {
        background-color: var(--theme-component-surface) !important;
        border-color: rgba(255,255,255,0.08) !important;
    }

    /* Neutral Fill */
    .dark .fi-btn-color-gray,
    .dark .fi-badge-color-gray,
    .dark .fi-ta-header-cell,
    .dark .fi-breadcrumbs {
        background-color: var(--theme-neutral-fill) !important;
    }

    /* Text Colors */
    .dark .fi-body,
    .dark .fi-main,
    .dark .fi-header-heading,
    .dark .fi-section-header-heading,
    .dark .fi-ta-cell,
    .dark .fi-input,
    .dark .fi-sidebar-item-label,
    .dark h1, .dark h2, .dark h3, .dark h4 {
        color: var(--theme-text) !important;
    }

    /* Muted Text */
    .dark .text-gray-500,
    .dark .text-gray-400,
    .dark .fi-color-gray,
    .dark .fi-section-header-description,
    .dark .fi-fo-field-wrp label,
    .dark .fi-fo-helper-text {
        color: var(--theme-text-muted) !important;
    }

    /* Dim Text */
    .dark .text-gray-600,
    .dark .fi-text-dim,
    .dark .fi-ta-record-description {
        color: var(--theme-text-dim) !important;
    }

    /* Primary Accent Styles */
    .fi-btn-primary,
    .bg-primary-600,
    .bg-primary-500 {
        background-color: var(--theme-accent-primary) !important;
    }
    .text-primary-600,
    .text-primary-500,
    .dark .text-primary-400 {
        color: var(--theme-accent-primary) !important;
    }
    .border-primary-600,
    .border-primary-500 {
        border-color: var(--theme-accent-primary) !important;
    }
    .dark .fi-sidebar-item-active .fi-sidebar-item-button {
        background-color: var(--theme-accent-primary) !important;
        color: #ffffff !important;
    }

    /* Layout Styles Overrides */
    @if($layoutStyle === 'floating')
        .fi-sidebar {
            margin: 1rem !important;
            border-radius: 1.5rem !important;
            height: calc(100vh - 2rem) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
        }
    @elseif($layoutStyle === 'navbar')
        .fi-sidebar {
            display: none !important;
        }
        .fi-topbar {
            position: sticky !important;
            top: 0 !important;
            z-index: 50 !important;
        }
    @elseif($layoutStyle === 'bottom_bar')
        @media (min-width: 1024px) {
            .fi-sidebar {
                top: auto !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                height: 64px !important;
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                border-top: 1px solid rgba(255,255,255,0.08) !important;
                border-right: none !important;
            }
            .fi-sidebar-nav {
                flex-direction: row !important;
                display: flex !important;
            }
            .fi-main {
                padding-bottom: 80px !important;
            }
        }
    @endif

    /* Dashboard Overview Card Styles */
    @if($dashboardCardStyle === 'stacked')
        .fi-widgets-ctn {
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5rem !important;
        }
        .fi-widgets-ctn > * {
            width: 100% !important;
            grid-column: span 12 / span 12 !important;
        }
    @elseif($dashboardCardStyle === 'two_column')
        .fi-widgets-ctn {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 1.5rem !important;
        }
    @elseif($dashboardCardStyle === 'three_column')
        .fi-widgets-ctn {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1rem !important;
        }
    @endif
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
                    } else if (key === 'ui_scale') {
                        value = (Number(value) / 100);
                        if (document.body) {
                            document.body.style.zoom = value;
                        }
                    } else if (key === 'font_family') {
                        const fontSlug = String(value).replace(/\s+/g, '-');
                        const linkId = 'theme-google-font-' + fontSlug;
                        if (!document.getElementById(linkId)) {
                            const link = document.createElement('link');
                            link.id = linkId;
                            link.rel = 'stylesheet';
                            link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(value) + ':wght@300;400;500;600;700;800&display=swap';
                            document.head.appendChild(link);
                        }
                        value = "'" + value + "', sans-serif";
                    }

                    root.style.setProperty(cssVar, String(value));
                }
            }

            // Update brand name text live if present
            if (payload.company_name) {
                const brandSpans = document.querySelectorAll('.fi-brand span, .fi-header-heading');
                brandSpans.forEach(el => {
                    if (el.textContent.includes('Aurex') || el.textContent.includes('ARX')) {
                        el.textContent = payload.company_name;
                    }
                });
            }
        }
    });
</script>
