<x-filament-panels::page.simple>
    <style>
        /* Hide all scrollbars in the wizard header */
        .fi-fo-wizard-header {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
        }
        .fi-fo-wizard-header::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
        }
    </style>

    <form wire:submit="submit">
        {{ $this->form }}
    </form>
</x-filament-panels::page.simple>
