<x-filament-panels::page>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen max-h-[800px]">
        
        <!-- Left Panel: Customizer Controls -->
        <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 rounded-xl ring-1 ring-gray-950/5 dark:ring-white/10 shadow-sm">
            <div class="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200">Theme Settings</h2>
                <x-filament::button wire:click="saveTheme" size="sm">
                    Save Changes
                </x-filament::button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-grow" x-data="{
                init() {
                    this.$watch('$wire.themeData', value => {
                        // When form changes, dispatch a postMessage to the iframe
                        const iframe = document.getElementById('theme-preview-iframe');
                        if(iframe && iframe.contentWindow) {
                            iframe.contentWindow.postMessage({
                                type: 'THEME_UPDATE',
                                payload: value
                            }, '*');
                        }
                    }, { deep: true });
                }
            }">
                {{ $this->form }}
            </div>
        </div>

        <!-- Right Panel: Live Preview Iframe -->
        <div class="hidden lg:flex flex-col h-full rounded-xl overflow-hidden ring-1 ring-gray-950/5 dark:ring-white/10 shadow-sm bg-gray-100 dark:bg-gray-950 relative">
            <div class="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
                <div class="flex gap-1.5 ml-2">
                    <div class="w-3 h-3 rounded-full bg-red-400"></div>
                    <div class="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div class="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div class="text-xs font-medium text-gray-500 ml-4 flex-grow text-center mr-12">
                    Live Preview (Admin Panel)
                </div>
            </div>
            <iframe 
                id="theme-preview-iframe"
                src="{{ url('/admin') }}" 
                class="w-full h-full border-0 bg-transparent flex-grow"
                onload="this.contentWindow.postMessage({ type: 'THEME_UPDATE', payload: $wire.themeData }, '*')"
            ></iframe>
        </div>

    </div>
</x-filament-panels::page>
