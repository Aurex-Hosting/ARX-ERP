<div>
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold leading-6 text-gray-950 dark:text-white">Login History</h3>
        <x-filament::button color="warning" wire:click="$parent.clearOldLoginHistory" wire:confirm="This will permanently delete all login history older than 30 days.">
            Clear > 30 Days
        </x-filament::button>
    </div>

    {{ $this->table }}
</div>
