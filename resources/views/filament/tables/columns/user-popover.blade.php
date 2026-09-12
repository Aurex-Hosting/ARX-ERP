@php
    $causer = $getRecord()->causer;
    $primaryColor = app(\App\Settings\CustomizationSettings::class)->color_primary ?? '#3b82f6';
@endphp

@if($causer)
    <div x-data="{ open: false }" @mouseleave="open = false" class="inline-block">
        <span x-ref="trigger" 
              @mouseenter="open = true" 
              class="inline-flex items-center gap-x-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 cursor-help transition hover:bg-gray-200 dark:hover:bg-gray-700">
            <x-filament::icon icon="heroicon-o-user" class="h-3.5 w-3.5 text-gray-500" />
            {{ $causer->profile_id ?? $causer->id }}
        </span>

        <template x-teleport="body">
            <div x-show="open" 
                 @mouseenter="open = true"
                 @mouseleave="open = false"
                 x-anchor.bottom-start.offset.5="$refs.trigger"
                 x-transition.opacity.duration.200ms
                 class="w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl ring-1 ring-gray-950/5 dark:ring-white/10 z-[9999]"
                 style="display: none;">
                
                <!-- Banner -->
                <div class="h-16 rounded-t-xl" style="background-color: {{ $primaryColor }}; opacity: 0.85;"></div>
                
                <!-- Profile Info -->
                <div class="px-4 pb-4 relative">
                    @php
                        $avatarUrl = $causer->avatar_url ? asset('storage/'.$causer->avatar_url) : 'https://ui-avatars.com/api/?name='.urlencode($causer->getFilamentName()).'&color=FFFFFF&background=111827';
                    @endphp
                    <img src="{{ $avatarUrl }}" 
                         class="rounded-full absolute border-[3px] border-white dark:border-gray-900 shadow-sm object-cover bg-white dark:bg-gray-900"
                         style="width: 64px; height: 64px; top: -32px; left: 16px;">
                    
                    <div style="padding-top: 40px;">
                        <h4 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">{{ $causer->getFilamentName() }}</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ $causer->email }}</p>
                        <div class="mt-3 flex gap-1 flex-wrap">
                            @foreach($causer->roles as $role)
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" style="background-color: {{ $primaryColor }}20; color: {{ $primaryColor }};">
                                {{ $role->name }}
                            </span>
                            @endforeach
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
@else
    <span class="inline-flex items-center gap-x-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
        <x-filament::icon icon="heroicon-o-cpu-chip" class="h-3.5 w-3.5 text-gray-500" />
        System
    </span>
@endif
