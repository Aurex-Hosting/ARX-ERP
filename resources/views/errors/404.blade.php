<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Not Found</title>
    @php
        $theme = \Illuminate\Support\Facades\Cache::remember('active_theme', 3600, fn () => \App\Models\Theme::where('is_active', true)->first());
        $opts = $theme?->options ?? [];

        $primaryColor = $opts['color_accent_primary'] ?? '#38bdf8';
        $bgColor = $opts['color_page_bg'] ?? '#12141c';
        $textPrimary = $opts['color_text'] ?? '#ffffff';
        $textMuted = $opts['color_text_muted'] ?? '#9ca3af';
        
        $bgImage = !empty($opts['error_404_background_image']) ? asset('storage/'.$opts['error_404_background_image']) : asset('images/Customizations/404-backgroun.png');
        $bgOpacity = isset($opts['error_404_overlay_darkness']) ? (1 - ($opts['error_404_overlay_darkness'] / 100)) : 0.7;
        $bgBlur = $opts['error_404_background_blur'] ?? 0;
        $floatingElement = !empty($opts['error_404_floating_element']) ? asset('storage/'.$opts['error_404_floating_element']) : asset('images/Customizations/astronot.png');
        $quickLinks = $opts['error_404_quick_links'] ?? [];
    @endphp
    <style>
        :root {
            --primary: {{ $primaryColor }};
            --bg: {{ $bgColor }};
            --text: {{ $textPrimary }};
            --muted: {{ $textMuted }};
            --bg-image: url('{{ $bgImage }}');
            --bg-opacity: {{ $bgOpacity }};
            --bg-blur: blur({{ $bgBlur }}px);
        }
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg);
            overflow: hidden;
        }
        .bg-image {
            position: absolute;
            top: -5%;
            left: -5%;
            width: 110%;
            height: 110%;
            background-image: var(--bg-image);
            background-size: cover;
            background-position: center;
            opacity: var(--bg-opacity);
            filter: var(--bg-blur);
            z-index: 1;
            transition: transform 0.1s ease-out; 
        }
        .quick-links-bar {
            position: absolute;
            top: 1.5rem;
            right: 1.5rem;
            z-index: 20;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .quick-link-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.4rem 0.9rem;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            font-size: 0.75rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
        }
        .quick-link-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
        }
        .container {
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            padding: 2rem;
        }
        .title-404 {
            font-size: clamp(6rem, 15vw, 12rem);
            font-weight: 900;
            color: var(--primary);
            margin: 0;
            line-height: 1;
            text-shadow: 0 0 40px var(--primary);
            letter-spacing: 0.05em;
        }
        .subtitle {
            font-size: clamp(1.8rem, 4vw, 3rem);
            font-weight: 800;
            color: var(--text);
            margin: 1rem 0;
            letter-spacing: 0.02em;
        }
        .description {
            font-size: clamp(1rem, 2vw, 1.2rem);
            color: var(--muted);
            max-width: 450px;
            margin-bottom: 3rem;
            line-height: 1.6;
        }
        .btn {
            background-color: var(--primary);
            color: #fff;
            padding: 1rem 2.5rem;
            border-radius: 9999px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
            letter-spacing: 0.05em;
            transition: all 0.2s ease-in-out;
            border: none;
            cursor: pointer;
            box-shadow: 0 10px 25px -5px var(--primary);
        }
        .btn:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 15px 35px -5px var(--primary);
        }
        .btn:active {
            transform: translateY(1px) scale(0.98);
        }
        
        /* Floating Element */
        .astronaut-container {
            position: absolute;
            right: 15%;
            top: 20%;
            z-index: 5;
            transition: transform 0.1s ease-out;
        }
        .astronaut {
            width: clamp(150px, 20vw, 300px);
            animation: float 6s ease-in-out infinite;
            filter: drop-shadow(0 20px 30px rgba(0,0,0,0.5));
        }
        
        @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }
        
        @media (max-width: 768px) {
            .astronaut-container { right: 5%; top: 10%; opacity: 0.5; }
        }
    </style>
</head>
<body>
    <!-- Parallax Background -->
    <div class="bg-image" id="parallax-bg"></div>

    <!-- Quick Links Bar in top right -->
    @if(!empty($quickLinks))
    <div class="quick-links-bar">
        @foreach($quickLinks as $qlink)
            @if($qlink['enabled'] ?? true)
                @php
                    $qurl = $qlink['url'] ?? '#';
                    $qtext = $qlink['text'] ?? '';
                    $qicon = !empty($qlink['icon']) ? asset('storage/'.$qlink['icon']) : null;
                @endphp
                <a href="{{ $qurl }}" target="_blank" rel="noopener noreferrer" class="quick-link-btn">
                    @if($qicon)
                        <img src="{{ $qicon }}" style="width: 14px; height: 14px; object-fit: contain;" />
                    @endif
                    <span>{{ $qtext }}</span>
                </a>
            @endif
        @endforeach
    </div>
    @endif
    
    <!-- Floating Element -->
    <div class="astronaut-container" id="parallax-astronaut">
        <img src="{{ $floatingElement }}" alt="Floating Element" id="floating-elem-img" class="astronaut">
    </div>
    
    <!-- Content -->
    <div class="container">
        <h1 class="title-404">404</h1>
        <h2 class="subtitle">UH OH!</h2>
        <p class="description">The page you're looking for does not exist or cannot be found!</p>
        <a href="/" class="btn">GO TO HOME PAGE</a>
    </div>

    <!-- Mouse Parallax Script -->
    <script>
        document.addEventListener('mousemove', function(e) {
            const bg = document.getElementById('parallax-bg');
            const astronaut = document.getElementById('parallax-astronaut');
            
            const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
            
            if(bg) bg.style.transform = `translate(${xAxis}px, ${yAxis}px)`;
            if(astronaut) astronaut.style.transform = `translate(${xAxis * -1.5}px, ${yAxis * -1.5}px)`;
        });

        // Real-time postMessage listener
        window.addEventListener('message', function (event) {
            if (event.data && event.data.type === 'THEME_UPDATE') {
                const payload = event.data.payload || {};
                const root = document.documentElement;

                if (payload.color_accent_primary) root.style.setProperty('--primary', payload.color_accent_primary);
                if (payload.color_page_bg) root.style.setProperty('--bg', payload.color_page_bg);
                if (payload.color_text) root.style.setProperty('--text', payload.color_text);
                if (payload.color_text_muted) root.style.setProperty('--muted', payload.color_text_muted);
                if (payload.error_404_overlay_darkness !== undefined) {
                    root.style.setProperty('--bg-opacity', 1 - (Number(payload.error_404_overlay_darkness) / 100));
                }
                if (payload.error_404_background_blur !== undefined) {
                    root.style.setProperty('--bg-blur', 'blur(' + payload.error_404_background_blur + 'px)');
                }
            }
        });
    </script>
</body>
</html>
