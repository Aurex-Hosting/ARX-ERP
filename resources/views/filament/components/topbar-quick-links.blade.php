@php
    $theme = \Illuminate\Support\Facades\Cache::remember('active_theme', 3600, fn () => \App\Models\Theme::where('is_active', true)->first());
    $opts = $theme?->options ?? [];
    $quickLinks = $opts['topbar_quick_links'] ?? [];
@endphp

@if(!empty($quickLinks))
    <div class="hidden lg:flex items-center gap-2 mr-2">
        @foreach($quickLinks as $link)
            @php
                $url = $link['url'] ?? '#';
                $text = $link['text'] ?? '';
                $icon = !empty($link['icon']) ? asset('storage/'.$link['icon']) : null;
            @endphp
            <a 
                href="{{ $url }}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 ring-1 ring-gray-950/5 dark:ring-white/10 transition-all hover:scale-105 active:scale-95 shadow-xs"
            >
                @if($icon)
                    <img src="{{ $icon }}" alt="" class="w-3.5 h-3.5 object-contain shrink-0" />
                @else
                    <svg class="w-3.5 h-3.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                @endif
                <span>{{ $text }}</span>
            </a>
        @endforeach
    </div>
@endif
