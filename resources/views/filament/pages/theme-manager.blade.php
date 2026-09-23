<style>
    /* Hide Filament's default tab navigation header since we use the custom icon sidebar */
    .theme-custom-tabs > nav,
    .theme-custom-tabs > .fi-tabs,
    .theme-custom-tabs .fi-tabs-nav {
        display: none !important;
    }
    .theme-custom-tabs {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
    .theme-custom-tabs .fi-tabs-content {
        padding: 0 !important;
        margin: 0 !important;
    }

    /* Clean, minimal, flat Filament form styling */
    .theme-editor-form .fi-section {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        ring: none !important;
        padding: 0 !important;
        margin-bottom: 1.15rem !important;
        --tw-ring-shadow: none !important;
        --tw-shadow: none !important;
    }
    .theme-editor-form .fi-section-content-ctn {
        border: none !important;
        background: transparent !important;
    }
    .theme-editor-form .fi-section-header {
        padding: 0 0 0.4rem 0 !important;
        border: none !important;
    }
    .theme-editor-form .fi-section-header-heading {
        font-size: 0.8125rem !important;
        font-weight: 700 !important;
        color: #f1f5f9 !important;
        letter-spacing: 0.015em;
    }
    .theme-editor-form .fi-section-header-description {
        font-size: 0.6875rem !important;
        color: #94a3b8 !important;
        margin-top: 0.1rem !important;
    }
    .theme-editor-form .fi-section-content {
        padding: 0.2rem 0 !important;
    }
    /* Compact inputs */
    .theme-editor-form .fi-fo-field-wrp {
        gap: 0.25rem !important;
        margin-bottom: 0.6rem !important;
    }
    .theme-editor-form .fi-input-wrp {
        background: rgba(255,255,255,0.03) !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 0.5rem !important;
        color: #ffffff !important;
    }
    .theme-editor-form .fi-input-wrp:focus-within {
        border-color: #8b5cf6 !important;
        box-shadow: 0 0 0 1px #8b5cf6 !important;
    }
    .theme-editor-form .fi-input-wrp input,
    .theme-editor-form .fi-input-wrp select,
    .theme-editor-form .fi-input-wrp textarea {
        color: #ffffff !important;
        font-size: 0.775rem !important;
        padding: 0.4rem 0.6rem !important;
    }
    .theme-editor-form .fi-fo-field-wrp label {
        font-size: 0.7rem !important;
        font-weight: 600 !important;
        color: #cbd5e1 !important;
    }
    .theme-editor-form .fi-fo-helper-text {
        font-size: 0.625rem !important;
        color: #64748b !important;
        line-height: 1.2 !important;
    }
    /* Compact color pickers */
    .theme-editor-form .fi-color-picker-preview {
        width: 1.5rem !important;
        height: 1.5rem !important;
        border-radius: 0.375rem !important;
    }
    /* Compact File upload */
    .theme-editor-form .filepond--root {
        min-height: 65px !important;
        max-height: 75px !important;
        margin-bottom: 0 !important;
        width: 100% !important;
    }
    .theme-editor-form .filepond--panel-root {
        background-color: rgba(255,255,255,0.03) !important;
        border: 1px dashed rgba(255,255,255,0.12) !important;
        border-radius: 0.5rem !important;
    }
    .theme-editor-form .filepond--drop-label {
        min-height: 65px !important;
        font-size: 0.625rem !important;
        color: #94a3b8 !important;
        padding: 0.25rem !important;
    }
    .theme-editor-form .filepond--drop-label label {
        font-size: 0.625rem !important;
    }
    /* Repeater */
    .theme-editor-form .fi-fo-repeater-item {
        background: rgba(255,255,255,0.02) !important;
        border: 1px solid rgba(255,255,255,0.06) !important;
        border-radius: 0.5rem !important;
        margin-bottom: 0.45rem !important;
        padding: 0.45rem !important;
    }
    /* Custom Scrollbar */
    .theme-scroll::-webkit-scrollbar { width: 4px; }
    .theme-scroll::-webkit-scrollbar-track { background: transparent; }
    .theme-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .theme-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
</style>

<div
    x-data="{
        activeSection: 'general',
        device: 'desktop',
        previewPage: '/admin',
        sections: [
            { id: 'general', label: 'General', subtitle: 'Site name and branding', icon: 'cog', index: 0 },
            { id: 'theme', label: 'Theme', subtitle: 'Colours, border radius, and fonts', icon: 'palette', index: 1 },
            { id: 'layout', label: 'Layout', subtitle: 'Layout and component styling', icon: 'layout', index: 2 },
            { id: 'pages', label: 'Pages', subtitle: 'Auth & 404 error page styles', icon: 'document', index: 3 },
        ],
        comingSoon: [
            { label: 'Admin Overview', icon: 'chart' },
            { label: 'Dashboard Overview', icon: 'grid' },
            { label: 'SEO', icon: 'globe' },
        ],
        selectTab(sec) {
            this.activeSection = sec.id;
            const tabs = document.querySelectorAll('.theme-custom-tabs button[role=\'tab\']');
            if (tabs[sec.index]) {
                tabs[sec.index].click();
            }
            if (sec.id === 'pages' && this.previewPage === '/admin') {
                this.changePreviewPage('/admin/login');
            }
        },
        refreshPreview() {
            const iframe = document.getElementById('theme-preview-iframe');
            if (iframe) iframe.src = this.previewPage;
        },
        changePreviewPage(page) {
            this.previewPage = page;
            const iframe = document.getElementById('theme-preview-iframe');
            if (iframe) iframe.src = page;
        },
        sendThemeUpdate() {
            const iframe = document.getElementById('theme-preview-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'THEME_UPDATE',
                    payload: $wire.get('themeData')
                }, '*');
            }
        },
        init() {
            this.$watch('$wire.themeData', () => {
                this.sendThemeUpdate();
            }, { deep: true });
        }
    }"
    class="flex h-screen w-screen overflow-hidden text-white font-sans"
    style="background: #07080d;"
>

    {{-- ═══════════════════════════════════════════════════════════════ --}}
    {{-- EDIT OPTIONS PANEL (1/3 SCREEN WIDTH) --}}
    {{-- ═══════════════════════════════════════════════════════════════ --}}
    <div class="w-1/3 min-w-[320px] max-w-[460px] h-full shrink-0 flex z-20" style="background: #0d0e17; border-right: 1px solid rgba(255,255,255,0.06);">
        
        {{-- Far-Left Slim Icon Sidebar (52px) --}}
        <div class="flex flex-col w-[52px] shrink-0 items-center justify-between py-3.5 h-full select-none" style="border-right: 1px solid rgba(255,255,255,0.05); background: #0a0b12;">
            
            {{-- Top: Navigation Section Icons --}}
            <div class="flex flex-col items-center gap-2 w-full px-1">
                <template x-for="(section, index) in sections" :key="section.id">
                    <div class="relative group w-full flex justify-center">
                        <button
                            type="button"
                            @click="selectTab(section)"
                            :class="activeSection === section.id
                                ? 'text-white shadow-lg shadow-purple-900/40 bg-[#7c3aed]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'"
                            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
                        >
                            <template x-if="section.icon === 'cog'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                            </template>
                            <template x-if="section.icon === 'palette'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" /></svg>
                            </template>
                            <template x-if="section.icon === 'layout'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>
                            </template>
                            <template x-if="section.icon === 'document'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                            </template>
                        </button>
                        <div class="absolute left-[46px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap hidden group-hover:block z-[100] shadow-xl pointer-events-none" style="background: #181926; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);" x-text="section.label"></div>
                    </div>
                </template>

                <div class="w-5 h-px my-1" style="background: rgba(255,255,255,0.08);"></div>

                {{-- Coming Soon Icons --}}
                <template x-for="(item, index) in comingSoon" :key="item.label">
                    <div class="relative group w-full flex justify-center">
                        <button type="button" class="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 cursor-not-allowed opacity-40" disabled>
                            <template x-if="item.icon === 'chart'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                            </template>
                            <template x-if="item.icon === 'grid'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>
                            </template>
                            <template x-if="item.icon === 'globe'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                            </template>
                        </button>
                    </div>
                </template>
            </div>

            {{-- Bottom: Action Buttons (Reset, Import, Export, SAVE CHECKMARK, Back) --}}
            <div class="flex flex-col items-center gap-2 w-full px-1">
                {{-- Discard / Reset (Red) --}}
                <div class="relative group w-full flex justify-center">
                    <button
                        type="button"
                        wire:click="discardChanges"
                        class="w-9 h-9 rounded-xl flex items-center justify-center bg-[#251829] text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-900/30 transition-all cursor-pointer"
                        title="Discard Changes"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
                    </button>
                    <div class="absolute left-[46px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap hidden group-hover:block z-[100] shadow-xl pointer-events-none" style="background: #181926; color: #f87171; border: 1px solid rgba(255,255,255,0.1);">Discard Changes</div>
                </div>

                {{-- Import Theme --}}
                <div class="relative group w-full flex justify-center">
                    <button
                        type="button"
                        class="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
                        title="Import Theme"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    </button>
                    <div class="absolute left-[46px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap hidden group-hover:block z-[100] shadow-xl pointer-events-none" style="background: #181926; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);">Import Theme</div>
                </div>

                {{-- Export Theme --}}
                <div class="relative group w-full flex justify-center">
                    <button
                        type="button"
                        class="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
                        title="Export Theme"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    </button>
                    <div class="absolute left-[46px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap hidden group-hover:block z-[100] shadow-xl pointer-events-none" style="background: #181926; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);">Export Theme</div>
                </div>

                {{-- SAVE BUTTON AS CORRECTION MARK / CHECKMARK (✓) --}}
                <div class="relative group w-full flex justify-center">
                    <button
                        type="button"
                        wire:click="saveTheme"
                        wire:loading.attr="disabled"
                        class="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-[#7c3aed] hover:bg-[#6d28d9] shadow-lg shadow-purple-900/50 transition-all active:scale-95 cursor-pointer"
                        title="Save Changes"
                    >
                        <svg wire:loading.remove wire:target="saveTheme" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        <div wire:loading wire:target="saveTheme" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </button>
                    <div class="absolute left-[46px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap hidden group-hover:block z-[100] shadow-xl pointer-events-none" style="background: #181926; color: #a78bfa; border: 1px solid rgba(255,255,255,0.1);">Save Changes (✓)</div>
                </div>

                {{-- Back to Admin --}}
                <div class="relative group w-full flex justify-center">
                    <a
                        href="{{ url('/admin') }}"
                        class="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        title="Back to Admin"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    </a>
                    <div class="absolute left-[46px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap hidden group-hover:block z-[100] shadow-xl pointer-events-none" style="background: #181926; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);">Back to Admin</div>
                </div>
            </div>
        </div>

        {{-- Form Content Column (Takes full remaining vertical height without bottom bar) --}}
        <div class="flex-1 min-w-0 flex flex-col h-full overflow-hidden" style="background: #0d0e17;">
            {{-- Section Title Header --}}
            <div class="px-5 py-3.5 shrink-0 select-none" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <template x-for="section in sections" :key="section.id">
                    <div x-show="activeSection === section.id" x-cloak>
                        <h2 class="text-sm font-bold text-white tracking-tight" x-text="section.label"></h2>
                        <p class="text-[11px] text-gray-400 mt-0.5" x-text="section.subtitle"></p>
                    </div>
                </template>
            </div>

            {{-- Scrollable Form Content (100% full vertical height, no bottom bar!) --}}
            <div class="flex-1 min-h-0 overflow-y-auto px-5 py-4 theme-editor-form theme-scroll">
                {{ $this->form }}
            </div>
        </div>
    </div>

    {{-- ═══════════════════════════════════════════════════════════════ --}}
    {{-- LIVE PREVIEW AREA (2/3 SCREEN WIDTH) --}}
    {{-- ═══════════════════════════════════════════════════════════════ --}}
    <div class="w-2/3 flex-1 min-w-0 flex flex-col h-full" style="background: #06070a;">
        
        {{-- Preview Top Bar (Spacious, clean, fixed 48px) --}}
        <div class="flex items-center justify-between px-6 h-[48px] min-h-[48px] shrink-0 select-none" style="background: #0a0b12; border-bottom: 1px solid rgba(255,255,255,0.06);">
            
            {{-- Left: Path / Page Selector --}}
            <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-gray-500">/</span>
                <div class="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5 text-xs">
                    <button 
                        type="button"
                        @click="changePreviewPage('/admin')" 
                        :class="previewPage === '/admin' ? 'bg-[#7c3aed] text-white shadow' : 'text-gray-400 hover:text-white'" 
                        class="px-3 py-1 rounded-md transition-all font-medium cursor-pointer"
                    >
                        Admin
                    </button>
                    <button 
                        type="button"
                        @click="changePreviewPage('/dashboard')" 
                        :class="previewPage === '/dashboard' ? 'bg-[#7c3aed] text-white shadow' : 'text-gray-400 hover:text-white'" 
                        class="px-3 py-1 rounded-md transition-all font-medium cursor-pointer"
                    >
                        Dashboard
                    </button>
                    <button 
                        type="button"
                        @click="changePreviewPage('/admin/login')" 
                        :class="previewPage === '/admin/login' ? 'bg-[#7c3aed] text-white shadow' : 'text-gray-400 hover:text-white'" 
                        class="px-3 py-1 rounded-md transition-all font-medium cursor-pointer"
                    >
                        Login
                    </button>
                    <button 
                        type="button"
                        @click="changePreviewPage('/404')" 
                        :class="previewPage === '/404' ? 'bg-[#7c3aed] text-white shadow' : 'text-gray-400 hover:text-white'" 
                        class="px-3 py-1 rounded-md transition-all font-medium cursor-pointer"
                    >
                        404 Page
                    </button>
                </div>
            </div>

            {{-- Center / Right: Device Toggle + Refresh --}}
            <div class="flex items-center gap-3">
                {{-- Device Viewport Switcher --}}
                <div class="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5">
                    <button
                        type="button"
                        @click="device = 'desktop'"
                        :class="device === 'desktop' ? 'bg-white/10 text-white font-semibold shadow-xs' : 'text-gray-400 hover:text-white'"
                        class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
                        Desktop
                    </button>
                    <button
                        type="button"
                        @click="device = 'tablet'"
                        :class="device === 'tablet' ? 'bg-white/10 text-white font-semibold shadow-xs' : 'text-gray-400 hover:text-white'"
                        class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v15a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                        Tablet
                    </button>
                    <button
                        type="button"
                        @click="device = 'mobile'"
                        :class="device === 'mobile' ? 'bg-white/10 text-white font-semibold shadow-xs' : 'text-gray-400 hover:text-white'"
                        class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                        Mobile
                    </button>
                </div>

                {{-- Refresh Button --}}
                <button type="button" @click="refreshPreview()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
                    <span>Refresh</span>
                </button>
            </div>
        </div>

        {{-- Preview Viewport Canvas --}}
        <div class="flex-1 min-h-0 p-5 overflow-hidden flex items-center justify-center relative">
            <div
                :class="{
                    'w-full h-full': device === 'desktop',
                    'w-[768px] h-full max-h-[850px]': device === 'tablet',
                    'w-[390px] h-full max-h-[750px]': device === 'mobile'
                }"
                class="rounded-2xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.8)] border border-white/10 transition-all duration-300 flex flex-col bg-gray-950"
            >
                <iframe
                    id="theme-preview-iframe"
                    :src="previewPage"
                    class="w-full h-full border-0 bg-transparent flex-1"
                    @load="sendThemeUpdate()"
                ></iframe>
            </div>
        </div>
    </div>
</div>
