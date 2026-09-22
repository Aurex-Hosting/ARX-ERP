@php
    $theme = \Illuminate\Support\Facades\Cache::remember('active_theme', 3600, fn () => \App\Models\Theme::where('is_active', true)->first());
    $opts = $theme?->options ?? [];

    $brandName = $opts['company_name'] ?? 'Aurex ERP';
    $favicon = asset('images/Customizations/favicon.png');
    
    $bgImage = !empty($opts['auth_background_image']) ? asset('storage/'.$opts['auth_background_image']) : asset('images/Customizations/login-bg.jpeg');
    $bgOpacity = isset($opts['auth_overlay_darkness']) ? (1 - ($opts['auth_overlay_darkness'] / 100)) : 0.8;
    $bgBlur = $opts['auth_background_blur'] ?? 0;
    
    $cardOpacity = isset($opts['auth_card_opacity']) ? ($opts['auth_card_opacity'] / 100) : 0.8;
    $cardBlur = $opts['auth_card_blur'] ?? 16;
    $fontFamily = $opts['font_family'] ?? 'Onest';
@endphp
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Login - {{ $brandName }}</title>
<link rel="icon" type="image/x-icon" href="{{ $favicon }}">
<!-- Font Setup -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family={{ urlencode($fontFamily) }}:wght@100..800&display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['{{ $fontFamily }}', 'sans-serif'],
          },
          colors: {
            obsidian: {
              background: '#12141c',
              card: '#1b2230',
              input: '#1a202d',
              inputBorder: '#354157',
              button: '#0a0d13',
              buttonHover: '#131824',
              textPrimary: '#ffffff',
              textSecondary: '#9ca3af',
              textMuted: '#6b7280',
              featureCard: '#242b38',
            }
          },
          borderRadius: {
            '4xl': '2rem',
            '5xl': '2.5rem',
          }
        }
      }
    }
  </script>
<style data-purpose="custom-utilities">
    [x-cloak] { display: none !important; }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-10px); }
        40%, 80% { transform: translateX(10px); }
    }
    .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
    
    @keyframes successBurst {
        0% { transform: rotate(var(--deg)) translateY(-20px) scale(1); opacity: 1; }
        100% { transform: rotate(var(--deg)) translateY(-70px) scale(0.2); opacity: 0; }
    }
    .animate-success-burst { animation: successBurst 0.5s ease-out forwards; }

    .glass-panel { background: linear-gradient(145deg, rgba(24, 29, 39, var(--auth-card-opacity, {{ $cardOpacity }})), rgba(19, 23, 32, var(--auth-card-opacity, {{ $cardOpacity }}))); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); backdrop-filter: blur(var(--auth-card-blur, {{ $cardBlur }}px)); -webkit-backdrop-filter: blur(var(--auth-card-blur, {{ $cardBlur }}px)); }
    .feature-panel { background: linear-gradient(145deg, rgba(40, 48, 63, 0.4), rgba(30, 36, 50, 0.4)); }
    .input-field { transition: border-color 0.2s, box-shadow 0.2s; }
    .input-field:focus { border-color: #4b5563; box-shadow: 0 0 0 2px rgba(75, 85, 99, 0.2); }
    .nav-arrow { transition: background-color 0.2s, color 0.2s; }
    .nav-arrow:hover { background-color: rgba(255, 255, 255, 0.1); }
</style>
@livewireStyles
</head>
<body class="bg-obsidian-background min-h-screen flex items-center justify-center p-4 antialiased text-obsidian-textPrimary selection:bg-blue-500 selection:text-white relative overflow-hidden">
<!-- Initial Page Loader -->
<div id="page-loader" class="fixed inset-0 z-[9999999] flex flex-col items-center justify-center bg-obsidian-background transition-opacity duration-700">
    <div class="relative w-16 h-16">
        <div class="absolute inset-0 border-4 border-obsidian-inputBorder rounded-full"></div>
        <div class="absolute inset-0 border-4 border-[#38bdf8] rounded-full border-t-transparent animate-spin"></div>
    </div>
    <div class="mt-6 text-obsidian-textSecondary text-xs font-semibold tracking-widest uppercase animate-pulse">Initializing ERP</div>
</div>

<!-- Raw Background Image -->
<div class="absolute inset-0 z-0 overflow-hidden" id="auth-bg-container" style="opacity: var(--auth-bg-opacity, {{ $bgOpacity }}); filter: blur(var(--auth-bg-blur, {{ $bgBlur }}px));">
    <div class="absolute inset-0 bg-cover bg-center bg-no-repeat" id="auth-bg-img" style="background-image: url('{{ $bgImage }}'); transform: scale({{ $bgBlur > 0 ? 1.1 : 1 }});"></div>
</div>

<!-- Top-Right Quick Links on Login Page -->
@php
    $authQuickLinks = $opts['auth_quick_links'] ?? [];
@endphp
@if(!empty($authQuickLinks))
<div class="absolute top-6 right-6 z-20 flex items-center gap-2" id="auth-quick-links-ctn">
    @foreach($authQuickLinks as $qlink)
        @if($qlink['enabled'] ?? true)
            @php
                $qurl = $qlink['url'] ?? '#';
                $qtext = $qlink['text'] ?? '';
                $qicon = !empty($qlink['icon']) ? asset('storage/'.$qlink['icon']) : null;
            @endphp
            <a href="{{ $qurl }}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-xs font-medium text-white transition-all hover:scale-105 shadow-sm">
                @if($qicon)
                    <img src="{{ $qicon }}" class="w-3.5 h-3.5 object-contain shrink-0" />
                @endif
                <span>{{ $qtext }}</span>
            </a>
        @endif
    @endforeach
</div>
@endif

{{ $slot }}

@include('components.water-splash')
@livewireScripts

<script>
    window.addEventListener('load', function() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => { loader.remove(); }, 700);
            }, 150);
        }
    });

    // Real-time postMessage listener for theme live preview
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'THEME_UPDATE') {
            const payload = event.data.payload || {};
            const root = document.documentElement;

            if (payload.auth_overlay_darkness !== undefined) {
                const op = 1 - (Number(payload.auth_overlay_darkness) / 100);
                root.style.setProperty('--auth-bg-opacity', op);
            }
            if (payload.auth_background_blur !== undefined) {
                root.style.setProperty('--auth-bg-blur', payload.auth_background_blur + 'px');
            }
            if (payload.auth_card_opacity !== undefined) {
                root.style.setProperty('--auth-card-opacity', (Number(payload.auth_card_opacity) / 100));
            }
            if (payload.auth_card_blur !== undefined) {
                root.style.setProperty('--auth-card-blur', payload.auth_card_blur + 'px');
            }
            if (payload.company_name !== undefined) {
                const brandTxt = document.getElementById('login-brand-name');
                if (brandTxt) brandTxt.textContent = payload.company_name;
            }
            if (payload.copyright_text !== undefined) {
                const copyTxt = document.getElementById('login-copyright-text');
                if (copyTxt) copyTxt.textContent = payload.copyright_text;
            }
        }
    });
</script>
</body>
</html>
