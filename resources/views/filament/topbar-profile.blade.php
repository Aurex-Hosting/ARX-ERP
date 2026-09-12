@php
    $user = auth()->user();
    if (!$user) return;
    
    $avatarUrl = $user->avatar_url ? asset('storage/'.$user->avatar_url) : 'https://ui-avatars.com/api/?name='.urlencode($user->getFilamentName()).'&color=FFFFFF&background=111827';
@endphp

<div class="flex items-center gap-4 me-4">
    <!-- Custom Safe Theme Switcher -->
    <button 
        x-data="{ 
            theme: localStorage.getItem('theme') || 'light',
            toggleTheme() {
                this.theme = this.theme === 'light' ? 'dark' : 'light';
                localStorage.setItem('theme', this.theme);
                if (this.theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                
                // Dispatch event safely without looping
                window.dispatchEvent(new CustomEvent('theme-changed', { detail: this.theme }));
            }
        }"
        x-init="
            window.addEventListener('theme-changed', (e) => {
                if(e.detail !== theme) theme = e.detail;
            });
        "
        x-on:click="toggleTheme()"
        type="button"
        class="fi-icon-btn relative flex items-center justify-center rounded-lg outline-none transition duration-75 hover:bg-gray-50 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-70 dark:hover:bg-white/5 h-9 w-9 text-gray-400 hover:text-gray-500 focus-visible:ring-primary-600 dark:text-gray-500 dark:hover:text-gray-400 dark:focus-visible:ring-primary-500"
    >
        <span class="sr-only">Toggle theme</span>
        <svg x-show="theme === 'light'" class="fi-icon-btn-icon h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
        <svg x-show="theme === 'dark'" style="display: none;" class="fi-icon-btn-icon h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-2.727-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
    </button>
    
    <!-- Profile Button -->
    <a href="{{ \App\Filament\Pages\ManageProfile::getUrl() }}" 
       class="flex items-center gap-3 py-1.5 px-2 rounded-full transition-all w-auto cursor-pointer"
       style="background-color: rgba(var(--primary-500), 0.1); border: 1px solid rgba(var(--primary-500), 0.5); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"
       onmouseover="this.style.backgroundColor='rgba(var(--primary-500), 0.2)'"
       onmouseout="this.style.backgroundColor='rgba(var(--primary-500), 0.1)'"
    >
        <!-- Avatar -->
        <img src="{{ $avatarUrl }}" class="w-9 h-9 rounded-full object-cover shrink-0" style="border: 2px solid rgba(var(--primary-500), 0.5);">
        
        <!-- Text -->
        <div class="flex flex-col pr-3 justify-center">
            <span class="text-sm font-bold leading-tight text-gray-900 dark:text-white truncate">
                {{ $user->getFilamentName() }}
            </span>
            <span class="font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5" style="font-size: 9px; line-height: 1;">
                ID: {{ $user->profile_id ?? 'N/A' }}
            </span>
        </div>
    </a>
</div>
