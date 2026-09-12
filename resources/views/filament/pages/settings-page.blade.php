<x-filament-panels::page>
    <x-filament-panels::form wire:submit="saveAndReload">
        {{ $this->form }}

        <x-filament-panels::form.actions
            :actions="$this->getFormActions()"
        />
    </x-filament-panels::form>

    <style>
        .custom-glass-popup {
            background-color: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
            border-radius: 2rem;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }
        .dark .custom-glass-popup {
            background-color: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .popup-discard-btn {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 9999px;
            background-color: rgba(0, 0, 0, 0.05);
            transition: background-color 0.2s;
        }
        .dark .popup-discard-btn {
            background-color: rgba(255, 255, 255, 0.1);
        }
        .popup-discard-btn:hover {
            background-color: rgba(0, 0, 0, 0.1);
        }
        .dark .popup-discard-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .popup-save-btn {
            padding: 0.5rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: white;
            border-radius: 9999px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: transform 0.1s;
        }
        .popup-save-btn:active {
            transform: scale(0.95);
        }
    </style>

    <!-- Glassmorphism Floating Save Popup -->
    <div 
        x-data="{ show: false }"
        x-init="$watch('$wire.hasChanges', value => show = value); show = $wire.hasChanges;"
        x-show="show"
        x-cloak
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="opacity-0 translate-y-10 scale-95"
        x-transition:enter-end="opacity-100 translate-y-0 scale-100"
        x-transition:leave="transition ease-in duration-200"
        x-transition:leave-start="opacity-100 translate-y-0 scale-100"
        x-transition:leave-end="opacity-0 translate-y-10 scale-95"
        style="position: fixed; bottom: 2.5rem; left: 50%; transform: translateX(-50%); z-index: 9999; display: none;"
    >
        <div class="custom-glass-popup">
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.875rem; font-weight: 600; line-height: 1.25;">Unsaved Changes</span>
                <span style="font-size: 0.75rem; opacity: 0.8;">You have modified your settings.</span>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-left: 1rem;">
                <button 
                    type="button" 
                    wire:click="discardChanges"
                    class="popup-discard-btn"
                >
                    Discard
                </button>
                <button 
                    type="button" 
                    wire:click="saveAndReload"
                    class="popup-save-btn"
                    style="background-color: rgb(var(--primary-600));"
                >
                    Save Now
                </button>
            </div>
        </div>
    </div>
</x-filament-panels::page>
