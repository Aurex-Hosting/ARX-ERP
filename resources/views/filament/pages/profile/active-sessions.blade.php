<div>
    @php
        $sessions = \DB::table('sessions')
            ->where('user_id', auth()->id())
            ->orderBy('last_activity', 'desc')
            ->get();
    @endphp

    <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold leading-6 text-gray-950 dark:text-white">Active Sessions</h3>
        <x-filament::button color="danger" wire:click="revokeAllSessions" wire:confirm="Are you sure you want to revoke all sessions, including your current one? You will be logged out.">
            Revoke All
        </x-filament::button>
    </div>

    <div class="space-y-4 mt-4">
        @foreach($sessions as $session)
            <div class="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl ring-1 ring-gray-950/5 dark:ring-white/10">
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 mt-1">
                        @if(str_contains(strtolower($session->user_agent), 'mobile'))
                            <x-heroicon-o-device-phone-mobile class="w-6 h-6 text-gray-400 dark:text-gray-500"/>
                        @else
                            <x-heroicon-o-computer-desktop class="w-6 h-6 text-gray-400 dark:text-gray-500"/>
                        @endif
                    </div>
                    <div>
                        <div class="font-medium text-gray-950 dark:text-white flex items-center gap-2">
                            {{ $session->ip_address }}
                            @if($session->id === request()->session()->getId())
                                <x-filament::badge color="success" size="sm">This Device</x-filament::badge>
                            @endif
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {{ $session->user_agent }}
                        </div>
                        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Last active: {{ \Carbon\Carbon::createFromTimestamp($session->last_activity)->diffForHumans() }}
                        </div>
                    </div>
                </div>
                
                @if($session->id !== request()->session()->getId())
                    <x-filament::button color="danger" size="sm" variant="outlined" wire:click="revokeSession('{{ $session->id }}')" wire:confirm="Are you sure you want to revoke this session?">
                        Revoke
                    </x-filament::button>
                @endif
            </div>
        @endforeach
    </div>
</div>
