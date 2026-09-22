<div class="flex items-center gap-2">
    @php
        $theme = \Illuminate\Support\Facades\Cache::remember('active_theme', 3600, fn () => \App\Models\Theme::where('is_active', true)->first());
        $opts = $theme?->options ?? [];
        
        $topbarLogoDark = !empty($opts['topbar_logo_dark']) ? asset('storage/'.$opts['topbar_logo_dark']) : (!empty($opts['company_logo_dark']) ? asset('storage/'.$opts['company_logo_dark']) : asset('images/Customizations/logo.png'));
        $topbarLogoLight = !empty($opts['topbar_logo_light']) ? asset('storage/'.$opts['topbar_logo_light']) : (!empty($opts['company_logo_light']) ? asset('storage/'.$opts['company_logo_light']) : $topbarLogoDark);
        
        $brandName = $opts['company_name'] ?? 'Aurex ERP';
    @endphp
    
    <!-- Dark Mode Logo -->
    <img src="{{ $topbarLogoDark }}" alt="{{ $brandName }} Logo" class="h-8 w-auto object-contain hidden dark:block" />
    
    <!-- Light Mode Logo -->
    <img src="{{ $topbarLogoLight }}" alt="{{ $brandName }} Logo" class="h-8 w-auto object-contain block dark:hidden" />
    
    <span class="text-xl font-bold tracking-wide text-gray-900 dark:text-white">{{ $brandName }}</span>
</div>