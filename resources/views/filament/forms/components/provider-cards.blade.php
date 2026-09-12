<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem;" x-data="{ state: $wire.$entangle('{{ $getStatePath() }}') }">
        @foreach ($getOptions() as $value => $label)
            <label
                class="relative flex flex-col cursor-pointer rounded-xl border h-full transition-all" style="padding: 0.75rem;"
                x-bind:class="{
                    'bg-primary-600 border-primary-600 shadow-md': state === '{{ $value }}',
                    'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50': state !== '{{ $value }}'
                }"
            >
                <input
                    type="radio"
                    name="{{ $getId() }}"
                    value="{{ $value }}"
                    wire:model.live="{{ $getStatePath() }}" x-on:click="state = '{{ $value }}'"
                    class="sr-only"
                >
                <div class="flex items-center" style="gap: 0.5rem; margin-bottom: 0.25rem;">
                    <x-filament::icon
                        icon="heroicon-o-circle-stack"
                        class="h-5 w-5"
                        x-bind:class="{
                            'text-white': state === '{{ $value }}',
                            'text-gray-500 dark:text-gray-400': state !== '{{ $value }}'
                        }"
                    />
                    <span
                        class="font-semibold text-sm"
                        x-bind:class="{
                            'text-white': state === '{{ $value }}',
                            'text-gray-900 dark:text-gray-100': state !== '{{ $value }}'
                        }"
                    >
                        {{ $label }}
                    </span>
                </div>
                
                @if ($hasDescription($value))
                    <p class="text-xs leading-snug"
                       x-bind:class="{
                           'text-primary-100': state === '{{ $value }}',
                           'text-gray-500 dark:text-gray-400': state !== '{{ $value }}'
                       }">
                        {{ $getDescription($value) }}
                    </p>
                @endif
            </label>
        @endforeach
    </div>
</x-dynamic-component>

