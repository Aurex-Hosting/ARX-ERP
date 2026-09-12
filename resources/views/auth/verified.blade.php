<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Status</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        [x-cloak] { display: none !important; }
        @keyframes success-burst {
            0% { transform: rotate(var(--deg)) translateY(0) scaleY(1); opacity: 1; }
            100% { transform: rotate(var(--deg)) translateY(-40px) scaleY(0); opacity: 0; }
        }
        .animate-success-burst {
            animation: success-burst 0.6s ease-out forwards;
        }
    </style>
</head>
<body class="bg-[#0f172a] text-white font-sans antialiased flex items-center justify-center min-h-screen relative overflow-hidden">
    @php
        $settings = app(\App\Settings\CustomizationSettings::class);
        $companyName = $settings->brand_name ?? 'Our System';
        $bgImage = $settings->login_background_image ? asset('storage/'.$settings->login_background_image) : null;
    @endphp

    @if($bgImage)
        <!-- Background Image -->
        <div class="absolute inset-0 z-0">
            <img src="{{ $bgImage }}" alt="Background" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
    @endif

    <div x-data="{ state: 'loading' }" 
         x-init="setTimeout(() => { state = 'success' }, 2500)"
         class="relative z-10 max-w-[28rem] w-full mx-4 bg-[#1e293b]/90 backdrop-blur-md rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-8 border border-gray-700/50 text-center transform transition-all min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
        
        <!-- Loading State -->
        <div x-show="state === 'loading'" 
             x-transition:leave="transition ease-in duration-300"
             x-transition:leave-start="opacity-100 scale-100"
             x-transition:leave-end="opacity-0 scale-90"
             class="absolute inset-0 flex flex-col items-center justify-center p-8">
            
            <div class="relative w-24 h-24 mb-8">
                <!-- Static faint ring -->
                <div class="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                <!-- Spinning gradient ring -->
                <div class="absolute inset-0 border-4 border-[#3b82f6] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 class="text-2xl font-bold mb-3 text-gray-100 tracking-wide">Verifying Email</h2>
            <p class="text-gray-400 text-sm">Please wait while we confirm your secure token...</p>
        </div>

        <!-- Success State -->
        <div x-cloak x-show="state === 'success'" 
             x-transition:enter="transition ease-out duration-500 delay-300"
             x-transition:enter-start="opacity-0 translate-y-8"
             x-transition:enter-end="opacity-100 translate-y-0"
             class="absolute inset-0 flex flex-col items-center justify-center p-8">
             
            <!-- Success Icon with Particle Burst -->
            <div class="relative flex items-center justify-center mb-8">
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 0deg;"></div>
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 45deg;"></div>
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 90deg;"></div>
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 135deg;"></div>
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 180deg;"></div>
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 225deg;"></div>
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 270deg;"></div>
                    <div class="absolute w-1.5 h-8 bg-green-500 rounded-full animate-success-burst" style="--deg: 315deg;"></div>
                </div>
                
                <div x-show="state === 'success'"
                     x-transition:enter="transition ease-out duration-500 delay-400"
                     x-transition:enter-start="opacity-0 scale-50"
                     x-transition:enter-end="opacity-100 scale-100"
                     class="relative z-10 w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                </div>
            </div>
            
            <h2 class="text-2xl font-bold mb-3 text-white leading-tight">Your Email Address<br>Verified Successfully!</h2>
            <p class="text-gray-400 mb-8 text-md">
                Welcome to <span class="text-white font-semibold">{{ $companyName }}</span>
            </p>
            
            <a href="{{ route('filament.admin.auth.login') }}" 
               class="inline-block w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3.5 px-6 rounded-xl transition duration-300 ease-in-out shadow-lg hover:shadow-blue-500/25">
                Go Back to Login
            </a>
        </div>
    </div>

</body>
</html>
