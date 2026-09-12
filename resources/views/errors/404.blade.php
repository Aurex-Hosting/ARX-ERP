<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Not Found</title>
    @php
        $settings = app(\App\Settings\CustomizationSettings::class);
        $primaryColor = rescue(fn () => $settings->color_primary, '#38bdf8', false);
        $bgColor = rescue(fn () => $settings->color_background, '#12141c', false);
        $textPrimary = rescue(fn () => $settings->color_text_primary, '#ffffff', false);
        $textMuted = rescue(fn () => $settings->color_text_secondary, '#9ca3af', false);
        
        $bgImage = rescue(fn () => $settings->error_404_background_image ? asset('storage/'.$settings->error_404_background_image) : '/images/Customizations/404-backgroun.png', '/images/Customizations/404-backgroun.png', false);
        $bgOpacity = rescue(fn () => $settings->error_404_background_opacity / 100, 0.7, false);
        $bgBlur = rescue(fn () => $settings->error_404_background_blur, 0, false);
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
            /* smooth transition for parallax */
            transition: transform 0.1s ease-out; 
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
        
        /* Floating Astronaut */
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
    
    <!-- Floating Astronaut -->
    <div class="astronaut-container" id="parallax-astronaut">
        <img src="/images/Customizations/astronot.png" alt="Lost Astronaut" class="astronaut">
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
            
            // Calculate mouse position relative to center of screen
            const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
            
            // Move background and astronaut in opposite directions for depth
            if(bg) bg.style.transform = `translate(${xAxis}px, ${yAxis}px)`;
            if(astronaut) astronaut.style.transform = `translate(${xAxis * -1.5}px, ${yAxis * -1.5}px)`;
        });
    </script>
</body>
</html>
