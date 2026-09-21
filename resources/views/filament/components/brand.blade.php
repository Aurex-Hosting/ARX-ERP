<div class="flex items-center gap-2">
    @php
        $settings = app(\App\Settings\CustomizationSettings::class);
        $brandLogo = rescue(fn () => $settings->brand_logo ? asset('storage/'.$settings->brand_logo) : asset('images/Customizations/logo.png'), asset('images/Customizations/logo.png'), false);
        $brandName = rescue(fn () => $settings->brand_name, 'Aurex ERP', false);
    @endphp
    
    @if($brandLogo)
        <img src="{{ $brandLogo }}" alt="{{ $brandName }} Logo" class="h-8 w-auto object-contain" />
    @endif
    <span class="text-xl font-bold tracking-wide text-obsidian-textPrimary dark:text-white">{{ $brandName }}</span>
</div>