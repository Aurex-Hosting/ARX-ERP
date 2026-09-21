<div
    x-data="{
        activeSection: @entangle('activeSection'),
        device: 'desktop',
        sections: [
            { id: 'general', label: 'General', subtitle: 'Site name and branding', icon: 'cog' },
            { id: 'theme', label: 'Theme', subtitle: 'Colours, border radius and fonts', icon: 'palette' },
            { id: 'layout', label: 'Layout', subtitle: 'Component customization', icon: 'layout' },
            { id: 'pages', label: 'Pages', subtitle: 'Auth & error pages', icon: 'document' },
        ],
        comingSoon: [
            { label: 'Admin Overview', subtitle: 'Soon', icon: 'chart' },
            { label: 'Dashboard Overview', subtitle: 'Soon', icon: 'grid' },
            { label: 'SEO', subtitle: 'Soon', icon: 'globe' },
        ],
        iframeWidth() {
            if (this.device === 'mobile') return 'max-w-[400px]';
            if (this.device === 'tablet') return 'max-w-[800px]';
            return 'w-full';
        },
        refreshPreview() {
            const iframe = document.getElementById('theme-preview-iframe');
            if (iframe) iframe.src = iframe.src;
        },
        init() {
            this.$watch('$wire.themeData', value => {
                const iframe = document.getElementById('theme-preview-iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'THEME_UPDATE',
                        payload: value
                    }, '*');
                }
            }, { deep: true });
        }
    }"
    class="flex h-screen w-screen overflow-hidden bg-gray-950 text-white"
>
    {{-- ═══════════════════════════════════════════════════════════════ --}}
    {{-- FAR-LEFT ICON SIDEBAR --}}
    {{-- ═══════════════════════════════════════════════════════════════ --}}
    <div class="flex flex-col w-[60px] min-w-[60px] bg-gray-900/80 border-r border-white/5 items-center py-4 justify-between">
        <div class="flex flex-col items-center gap-1">
            {{-- Section Icons --}}
            <template x-for="(section, index) in sections" :key="section.id">
                <button
                    @click="$wire.switchSection(section.id)"
                    :class="activeSection === section.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-gray-400 hover:text-white hover:bg-white/10'"
                    class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                    :title="section.label"
                >
                    {{-- Icon SVGs --}}
                    <template x-if="section.icon === 'cog'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    </template>
                    <template x-if="section.icon === 'palette'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" /></svg>
                    </template>
                    <template x-if="section.icon === 'layout'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>
                    </template>
                    <template x-if="section.icon === 'document'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    </template>
                </button>
            </template>

            {{-- Divider --}}
            <div class="w-6 h-px bg-white/10 my-2"></div>

            {{-- Coming Soon Icons --}}
            <template x-for="(item, index) in comingSoon" :key="item.label">
                <button
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 cursor-not-allowed relative group"
                    :title="item.label + ' (Coming Soon)'"
                    disabled
                >
                    <template x-if="item.icon === 'chart'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                    </template>
                    <template x-if="item.icon === 'grid'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>
                    </template>
                    <template x-if="item.icon === 'globe'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                    </template>
                    {{-- Tooltip --}}
                    <div class="absolute left-14 bg-gray-800 text-xs text-gray-300 px-2 py-1 rounded whitespace-nowrap hidden group-hover:block z-50" x-text="item.label + ' (Soon)'"></div>
                </button>
            </template>
        </div>

        {{-- Back Button --}}
        <a href="{{ url('/admin') }}" class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all" title="Back to Admin">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        </a>
    </div>

    {{-- ═══════════════════════════════════════════════════════════════ --}}
    {{-- MIDDLE FORM PANEL --}}
    {{-- ═══════════════════════════════════════════════════════════════ --}}
    <div class="flex flex-col w-[380px] min-w-[320px] border-r border-white/5 bg-gray-900/50">
        {{-- Section Header --}}
        <div class="p-5 border-b border-white/5">
            <template x-for="section in sections" :key="section.id">
                <div x-show="activeSection === section.id" x-cloak>
                    <h2 class="text-lg font-bold text-white" x-text="section.label"></h2>
                    <p class="text-sm text-gray-400 mt-0.5" x-text="section.subtitle"></p>
                </div>
            </template>
        </div>

        {{-- Scrollable Form Content --}}
        <div class="flex-1 overflow-y-auto p-5 pb-24">
            {{ $this->form }}
        </div>
    </div>

    {{-- ═══════════════════════════════════════════════════════════════ --}}
    {{-- RIGHT PREVIEW PANEL --}}
    {{-- ═══════════════════════════════════════════════════════════════ --}}
    <div class="flex-1 flex flex-col bg-gray-950 relative">
        {{-- Preview Toolbar --}}
        <div class="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-gray-900/50">
            {{-- Device Switcher --}}
            <div class="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                <button
                    @click="device = 'desktop'"
                    :class="device === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
                    Desktop
                </button>
                <button
                    @click="device = 'tablet'"
                    :class="device === 'tablet' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v15a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                    Tablet
                </button>
                <button
                    @click="device = 'mobile'"
                    :class="device === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                    Mobile
                </button>
            </div>

            {{-- Right Toolbar Actions --}}
            <div class="flex items-center gap-2">
                <button @click="refreshPreview()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all" title="Refresh Preview">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
                    Refresh
                </button>
            </div>
        </div>

        {{-- Preview Iframe Container --}}
        <div class="flex-1 flex items-start justify-center p-4 overflow-hidden bg-gray-950">
            <div
                :class="iframeWidth()"
                class="h-full rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl transition-all duration-500 ease-in-out mx-auto"
            >
                <iframe
                    id="theme-preview-iframe"
                    src="{{ url('/admin') }}"
                    class="w-full h-full border-0 bg-gray-900"
                ></iframe>
            </div>
        </div>
    </div>

    {{-- ═══════════════════════════════════════════════════════════════ --}}
    {{-- BOTTOM FLOATING SAVE BAR --}}
    {{-- ═══════════════════════════════════════════════════════════════ --}}
    <div class="fixed bottom-0 left-[60px] right-0 z-50 border-t border-white/5 bg-gray-900/90 backdrop-blur-xl">
        <div class="flex items-center justify-between px-6 py-3">
            <div class="flex items-center gap-3">
                {{-- Reset Button --}}
                <button
                    wire:click="discardChanges"
                    class="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                    title="Discard Changes"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
                </button>
                {{-- Import/Export Placeholder --}}
                <div class="flex items-center gap-1">
                    <button class="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all" title="Import Theme">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    </button>
                    <button class="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all" title="Export Theme">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    </button>
                </div>
            </div>

            {{-- Save Button --}}
            <button
                wire:click="saveTheme"
                wire:loading.attr="disabled"
                class="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-95"
                style="background: linear-gradient(135deg, rgb(var(--primary-500)), rgb(var(--primary-700)));"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
                <span wire:loading.remove wire:target="saveTheme">Save Changes</span>
                <span wire:loading wire:target="saveTheme">Saving...</span>
            </button>
        </div>
    </div>
</div>
