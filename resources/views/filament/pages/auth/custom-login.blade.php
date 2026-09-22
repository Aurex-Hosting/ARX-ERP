@php
    $theme = \Illuminate\Support\Facades\Cache::remember('active_theme', 3600, fn () => \App\Models\Theme::where('is_active', true)->first());
    $opts = $theme?->options ?? [];

    $brandLogo = !empty($opts['company_logo_dark']) ? asset('storage/'.$opts['company_logo_dark']) : (!empty($opts['topbar_logo_dark']) ? asset('storage/'.$opts['topbar_logo_dark']) : asset('images/Customizations/logo.png'));
    $brandName = $opts['company_name'] ?? 'Aurex ERP';
    $copyrightText = $opts['copyright_text'] ?? ('© ' . date('Y') . ' Aurex Technologies');
    $slideshowDelay = ($opts['auth_slideshow_delay'] ?? 5) * 1000;

    $defaultSlides = [
        [
            'image' => asset('images/Customizations/login-graphic.png'),
            'title' => 'Flexible by Design',
            'description' => 'Customize workflows, modules, roles, and experiences around your business.'
        ],
        [
            'image' => asset('images/Customizations/login-graphic2.png'),
            'title' => 'Secure by Default',
            'description' => 'Protect your business with role-based access, authentication, and centralized control.'
        ]
    ];
    $dynamicSlides = $opts['auth_slides'] ?? [];
    $slides = !empty($dynamicSlides) ? array_map(function($slide) {
        return [
            'image' => !empty($slide['image']) ? asset('storage/'.$slide['image']) : asset('images/Customizations/login-graphic.png'),
            'title' => $slide['title'] ?? 'Welcome',
            'description' => $slide['description'] ?? '',
        ];
    }, $dynamicSlides) : $defaultSlides;
@endphp

<main class="glass-panel relative z-10 w-full max-w-[1000px] rounded-5xl border border-gray-800 flex flex-col md:flex-row overflow-hidden min-h-[600px] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
<!-- BEGIN: Left Column - Login Form -->
<section class="flex-1 p-10 md:p-16 flex flex-col justify-center relative">
<div class="max-w-sm w-full mx-auto flex flex-col justify-between h-full">
<div>
<!-- Logo Area -->
<div class="flex items-center gap-3 mb-10">
    <img src="{{ $brandLogo }}" alt="{{ $brandName }}" id="login-brand-logo" class="h-8 w-auto object-contain" />
    <span class="text-xl font-bold tracking-wide text-white" id="login-brand-name">{{ $brandName }}</span>
</div>

<!-- Header Area -->
<header class="mb-10">
<h1 class="text-3xl font-bold mb-2 tracking-tight">Login</h1>
<p class="text-obsidian-textSecondary text-sm font-light">Access your enterprise workspace</p>
</header>
<!-- Form Area -->
<div x-data="{
        status: 'idle',
        shake: false,
        useBackup: false,
        otp: ['', '', '', '', '', ''],
        backupCode: '',
        submitLogin() {
            this.status = 'loading';
            this.$wire.authenticate();
        },
        submitTwoFactor() {
            this.status = 'loading_2fa';
            let code = this.useBackup ? this.backupCode : this.otp.join('');
            this.$wire.verifyTwoFactor(code, this.useBackup);
        },
        handlePaste(e) {
            let paste = (e.clipboardData || window.clipboardData).getData('text');
            if (paste && paste.length === 6 && !this.useBackup) {
                for (let i = 0; i < 6; i++) {
                    this.otp[i] = paste[i];
                }
                setTimeout(() => { if(this.$refs.box5) this.$refs.box5.focus(); }, 10);
            }
        },
        focusNext(index, e) {
            if (e.key === 'Backspace' && !this.otp[index] && index > 0) {
                this.$refs['box' + (index - 1)].focus();
            } else if (e.key !== 'Backspace' && this.otp[index] && index < 5) {
                this.$refs['box' + (index + 1)].focus();
            }
        }
    }"
    @two-factor-prompt.window="
        status = 'two_factor';
        otp = ['', '', '', '', '', ''];
        backupCode = '';
        useBackup = false;
        setTimeout(() => { if($refs.box0) $refs.box0.focus(); }, 100);
    "
    @two-factor-failed.window="
        status = 'error_2fa';
        shake = true;
        setTimeout(() => shake = false, 500);
        setTimeout(() => {
            status = 'two_factor';
            otp = ['', '', '', '', '', ''];
            setTimeout(() => { if($refs.box0 && !useBackup) $refs.box0.focus(); }, 100);
        }, 2000);
    "
    @two-factor-success.window="
        status = 'success_2fa';
        setTimeout(() => window.location.href = $event.detail.url, 2000);
    "
    @login-failed.window="
        status = 'error';
        shake = true;
        setTimeout(() => shake = false, 500);
        setTimeout(() => status = 'idle', 2000);
    "
    @login-success.window="
        status = 'success';
        setTimeout(() => window.location.href = $event.detail.url, 2000);
    "
    :class="{ 'animate-shake': shake }"
    class="relative min-h-[250px] flex flex-col justify-center w-full"
>
<form x-show="status === 'idle'"
      x-transition:enter="transition ease-out duration-300"
      x-transition:enter-start="opacity-0 scale-95"
      x-transition:enter-end="opacity-100 scale-100"
      class="space-y-5 w-full" 
      @submit.prevent="submitLogin">
<!-- Email Input -->
<div>
<label class="block text-sm font-medium text-obsidian-textPrimary mb-2" for="email">Email</label>
<input wire:model="data.email" class="input-field w-full bg-obsidian-input border border-obsidian-inputBorder rounded-full py-3 px-5 text-sm text-obsidian-textPrimary placeholder-gray-500 focus:outline-none focus:ring-0" id="email" placeholder="you@example.com" required type="email"/>
@error('data.email') <span class="text-red-500 text-xs mt-1">{{ $message }}</span> @enderror
</div>
<!-- Password Input -->
<div x-data="{ showPassword: false }">
<label class="block text-sm font-medium text-obsidian-textPrimary mb-2" for="password">Password</label>
<div class="relative">
<input wire:model="data.password" :type="showPassword ? 'text' : 'password'" class="input-field w-full bg-obsidian-input border border-obsidian-inputBorder rounded-full py-3 pl-5 pr-12 text-sm text-obsidian-textPrimary placeholder-gray-500 tracking-widest focus:outline-none focus:ring-0" id="password" placeholder="*********" required />
<button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors focus:outline-none">
<svg x-show="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
<svg x-cloak x-show="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.978 9.978 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
</button>
</div>
@error('data.password') <span class="text-red-500 text-xs mt-1">{{ $message }}</span> @enderror
</div>

<!-- Remember Me Checkbox -->
<div class="flex items-center justify-between">
    <label class="flex items-center gap-2 cursor-pointer group">
        <div class="relative flex items-center justify-center w-4 h-4">
            <input wire:model="data.remember" type="checkbox" class="peer appearance-none w-4 h-4 border border-obsidian-inputBorder rounded bg-obsidian-input checked:bg-gray-400 checked:border-gray-400 focus:outline-none focus:ring-0 transition-colors cursor-pointer" />
            <svg class="absolute w-3 h-3 text-obsidian-background opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <span class="text-sm text-obsidian-textSecondary group-hover:text-white transition-colors">Keep me signed in</span>
    </label>
</div>
<!-- Submit Button -->
<div class="pt-4">
<button class="w-full bg-obsidian-button hover:bg-obsidian-buttonHover text-white font-medium py-3 px-4 rounded-full transition-colors duration-200 border border-gray-900 shadow-sm" type="submit">
                Login
              </button>
</div>
</form>

<!-- 2FA Form -->
<form x-cloak x-show="status === 'two_factor'"
      x-transition:enter="transition ease-out duration-300"
      x-transition:enter-start="opacity-0 scale-95"
      x-transition:enter-end="opacity-100 scale-100"
      class="space-y-6 w-full flex flex-col items-center"
      @submit.prevent="submitTwoFactor">
    
    <div class="text-center w-full">
        <p class="text-white text-lg font-medium mb-1" x-text="useBackup ? 'Emergency Recovery Code' : 'Two-Factor Authentication'"></p>
        <p class="text-obsidian-textSecondary text-sm" x-text="useBackup ? 'Enter one of your 10-digit recovery codes' : 'Enter the 6-digit code from your authenticator app'"></p>
    </div>

    <!-- 6 Boxes for TOTP -->
    <div x-show="!useBackup" class="flex gap-2 justify-center w-full" @paste="handlePaste">
        <template x-for="(digit, index) in otp" :key="index">
            <input type="text" maxlength="1" 
                   x-model="otp[index]"
                   :ref="'box' + index"
                   @keyup="focusNext(index, $event)"
                   :disabled="status !== 'two_factor' && status !== 'error_2fa'"
                   :class="{'border-red-500 text-red-500': status === 'error_2fa', 'border-[#34d399] text-[#34d399]': status === 'success_2fa'}"
                   class="w-12 h-14 text-center text-2xl font-bold bg-obsidian-input border border-obsidian-inputBorder rounded-lg text-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors disabled:opacity-50">
        </template>
    </div>

    <!-- 1 Text Input for Backup -->
    <div x-show="useBackup" class="w-full">
        <input type="text" x-model="backupCode"
               :disabled="status !== 'two_factor' && status !== 'error_2fa'"
               :class="{'border-red-500 text-red-500': status === 'error_2fa', 'border-[#34d399] text-[#34d399]': status === 'success_2fa'}"
               class="w-full h-14 text-center tracking-widest text-xl font-bold bg-obsidian-input border border-obsidian-inputBorder rounded-lg text-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors disabled:opacity-50" placeholder="xxxxxxxxx-xxxxxxxxx">
    </div>

    <button class="w-full bg-obsidian-button hover:bg-obsidian-buttonHover text-white font-medium py-3 px-4 rounded-full transition-colors duration-200 border border-gray-900 shadow-sm mt-4 disabled:opacity-50" type="submit" :disabled="status !== 'two_factor' && status !== 'error_2fa'">
        Verify Code
    </button>
    
    <button type="button" @click="useBackup = !useBackup; otp = ['', '', '', '', '', '']; backupCode = ''; setTimeout(() => { if($refs.box0 && !useBackup) $refs.box0.focus(); }, 100);" class="text-obsidian-textSecondary text-sm hover:text-white mt-2 transition-colors focus:outline-none">
        <span x-text="useBackup ? 'Use Authenticator App instead' : 'Use Backup code instead'"></span>
    </button>
</form>

<!-- Status Overlays -->
<div x-cloak x-show="['loading', 'success', 'error', 'loading_2fa', 'success_2fa', 'error_2fa'].includes(status)" class="absolute inset-0 flex items-center justify-center z-10">
    <div x-show="['loading', 'loading_2fa'].includes(status)" class="relative w-16 h-16">
        <div class="absolute inset-0 border-4 border-obsidian-inputBorder rounded-full"></div>
        <div class="absolute inset-0 border-4 border-[#34d399] rounded-full border-t-transparent animate-spin"></div>
    </div>

    <div x-show="['success', 'success_2fa'].includes(status)" class="relative flex items-center justify-center">
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 0deg;"></div>
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 45deg;"></div>
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 90deg;"></div>
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 135deg;"></div>
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 180deg;"></div>
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 225deg;"></div>
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 270deg;"></div>
            <div class="absolute w-1.5 h-6 bg-[#34d399] rounded-full animate-success-burst" style="--deg: 315deg;"></div>
        </div>
        
        <div x-transition:enter="transition ease-out duration-300 transform"
             x-transition:enter-start="opacity-0 scale-50"
             x-transition:enter-end="opacity-100 scale-100"
             class="relative z-10 w-20 h-20 bg-[#34d399] rounded-full flex items-center justify-center text-white">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
        </div>
    </div>

    <div x-show="['error', 'error_2fa'].includes(status)"
         x-transition:enter="transition ease-out duration-300 transform"
         x-transition:enter-start="opacity-0 scale-50"
         x-transition:enter-end="opacity-100 scale-100"
         class="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M6 18L18 6M6 6l12 12"></path></svg>
    </div>
</div>
</div>
</div>

<!-- Footer Area -->
<footer class="mt-16 text-center">
<p class="text-xs text-obsidian-textMuted" id="login-copyright-text">
    {{ $copyrightText }}
</p>
</footer>
</div>
</section>
<!-- END: Left Column - Login Form -->
<!-- BEGIN: Right Column - Feature Showcase -->
<section class="flex-1 p-4 md:p-6 hidden md:block">
<div x-data='{ 
        activeSlide: 0, 
        slides: @json($slides),
        next() {
            this.activeSlide = this.activeSlide === this.slides.length - 1 ? 0 : this.activeSlide + 1;
        },
        prev() {
            this.activeSlide = this.activeSlide === 0 ? this.slides.length - 1 : this.activeSlide - 1;
        }
    }' 
    x-init="setInterval(() => next(), {{ $slideshowDelay }})"
    class="feature-panel w-full h-full rounded-4xl border border-gray-700/50 flex flex-col items-center justify-center text-center p-10 relative overflow-hidden shadow-inner">
<!-- Top decorative element -->
<div class="absolute top-8 left-8 flex items-center gap-2 z-10">
<div class="w-1 h-1 rounded-full bg-gray-500"></div>
<div class="w-6 h-1 rounded-full bg-gray-500"></div>
</div>

<template x-for="(slide, index) in slides" :key="index">
    <div x-show="activeSlide === index" 
         x-transition:enter="transition ease-out duration-700"
         x-transition:enter-start="opacity-0 translate-x-4"
         x-transition:enter-end="opacity-100 translate-x-0"
         x-transition:leave="transition ease-in duration-300"
         x-transition:leave-start="opacity-100 translate-x-0"
         x-transition:leave-end="opacity-0 -translate-x-4"
         class="absolute inset-0 flex flex-col items-center justify-center p-10">
        <!-- 3D Graphic Area -->
        <div class="mb-12 relative w-64 h-64 flex items-center justify-center">
            <img :alt="slide.title" class="w-full h-full object-contain" :src="slide.image"/>
        </div>
        <!-- Feature Text -->
        <div class="max-w-sm px-4">
            <h2 class="text-2xl font-bold mb-4 leading-tight" x-html="slide.title"></h2>
            <p class="text-sm text-obsidian-textSecondary leading-relaxed" x-text="slide.description"></p>
        </div>
    </div>
</template>

<!-- Navigation Arrows -->
<div class="absolute bottom-8 right-8 flex gap-2 z-10">
<button @click="prev()" aria-label="Previous feature" class="nav-arrow w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</button>
<button @click="next()" aria-label="Next feature" class="nav-arrow w-8 h-8 rounded-full bg-gray-600/30 border border-gray-500 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-600/50">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
</button>
</div>
</div>
</section>
<!-- END: Right Column - Feature Showcase -->
</main>
