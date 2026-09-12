@php
    $settings = app(\App\Settings\CustomizationSettings::class);
    $brandName = rescue(fn () => $settings->brand_name, 'Aurex ERP', false);
    $favicon = rescue(fn () => $settings->brand_favicon ? asset('storage/'.$settings->brand_favicon) : asset('images/Customizations/favicon.png'), asset('images/Customizations/favicon.png'), false);
    
    $bgImage = rescue(fn () => $settings->login_background_image ? asset('storage/'.$settings->login_background_image) : asset('images/Customizations/login-bg.jpeg'), asset('images/Customizations/login-bg.jpeg'), false);
    $bgOpacity = rescue(fn () => $settings->login_background_opacity / 100, 1.0, false);
    $bgBlur = rescue(fn () => $settings->login_background_blur, 0, false);
    
    $cardOpacity = rescue(fn () => $settings->login_card_opacity / 100, 0.8, false);
    $cardBlur = rescue(fn () => $settings->login_card_blur, 16, false);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Login - {{ $brandName }}</title>
<link rel="icon" type="image/x-icon" href="{{ $favicon }}">
<!-- Font Setup -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@100..800&display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Sora', 'sans-serif'],
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

    .glass-panel { background: linear-gradient(145deg, rgba(24, 29, 39, {{ $cardOpacity }}), rgba(19, 23, 32, {{ $cardOpacity }})); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); backdrop-filter: blur({{ $cardBlur }}px); -webkit-backdrop-filter: blur({{ $cardBlur }}px); }
    .feature-panel { background: linear-gradient(145deg, rgba(40, 48, 63, 0.4), rgba(30, 36, 50, 0.4)); }
    .input-field { transition: border-color 0.2s, box-shadow 0.2s; }
    .input-field:focus { border-color: #4b5563; box-shadow: 0 0 0 2px rgba(75, 85, 99, 0.2); }
    .nav-arrow { transition: background-color 0.2s, color 0.2s; }
    .nav-arrow:hover { background-color: rgba(255, 255, 255, 0.1); }
</style>
@livewireStyles
</head>
<body class="min-h-screen flex items-center justify-center p-4 antialiased text-obsidian-textPrimary selection:bg-blue-500 selection:text-white relative overflow-hidden">
<!-- Initial Page Loader -->
<div id="page-loader" class="fixed inset-0 z-[9999999] flex flex-col items-center justify-center bg-obsidian-background transition-opacity duration-700">
    <div class="relative w-16 h-16">
        <div class="absolute inset-0 border-4 border-obsidian-inputBorder rounded-full"></div>
        <div class="absolute inset-0 border-4 border-[#38bdf8] rounded-full border-t-transparent animate-spin"></div>
    </div>
    <div class="mt-6 text-obsidian-textSecondary text-xs font-semibold tracking-widest uppercase animate-pulse">Initializing ERP</div>
</div>

<!-- Raw Background Image -->
<div class="absolute inset-0 z-0 overflow-hidden" style="opacity: {{ $bgOpacity }}; filter: blur({{ $bgBlur }}px);">
    <div class="absolute inset-0 bg-cover bg-center bg-no-repeat" style="background-image: url('{{ $bgImage }}'); transform: scale({{ $bgBlur > 0 ? 1.1 : 1 }});"></div>
</div>

{{ $slot }}

@include('components.water-splash')
@livewireScripts

<script>
    window.addEventListener('load', function() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            // Short delay to ensure a smooth transition
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.remove();
                }, 700);
            }, 150);
        }
    });
</script>
</body>
</html>
