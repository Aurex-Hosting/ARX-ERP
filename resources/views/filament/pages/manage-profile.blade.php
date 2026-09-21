<x-filament-panels::page>
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

    <div x-data="{ activeTab: new URLSearchParams(window.location.search).get('tab') || 'personal' }">
        <x-filament::tabs label="Profile Tabs" class="mb-6">
            <x-filament::tabs.item
                alpine-active="activeTab === 'personal'"
                x-on:click="activeTab = 'personal'"
                icon="heroicon-m-user"
            >
                Personal Info
            </x-filament::tabs.item>
            
            <x-filament::tabs.item
                alpine-active="activeTab === 'security'"
                x-on:click="activeTab = 'security'"
                icon="heroicon-m-lock-closed"
            >
                Security & Logins
            </x-filament::tabs.item>
            
            <x-filament::tabs.item
                alpine-active="activeTab === 'api'"
                x-on:click="activeTab = 'api'"
                icon="heroicon-m-key"
            >
                API Tokens
            </x-filament::tabs.item>

            <x-filament::tabs.item
                alpine-active="activeTab === 'notifications'"
                x-on:click="activeTab = 'notifications'"
                icon="heroicon-m-bell"
            >
                Notifications
            </x-filament::tabs.item>

            <x-filament::tabs.item
                alpine-active="activeTab === 'advanced'"
                x-on:click="activeTab = 'advanced'"
                icon="heroicon-m-exclamation-triangle"
            >
                Advanced
            </x-filament::tabs.item>
        </x-filament::tabs>

        <!-- Personal Info Tab -->
        <div x-show="activeTab === 'personal'" x-cloak class="space-y-6">
            <form wire:submit="updateProfile">
                {{ $this->profileForm }}
                <!-- Glassmorphism Floating Save Popup for Profile -->
                <div 
                    x-data="{ 
                        show: false, 
                        baselineState: null,
                        normalize(data) {
                            if(typeof data !== 'object' || data === null) return data;
                            if(Array.isArray(data)) {
                                let arr = data.map(v => this.normalize(v)).filter(v => v !== false && v !== null && v !== '');
                                return arr.sort();
                            }
                            const res = {};
                            for(let key of Object.keys(data).sort()) {
                                let v = data[key];
                                if(v === false || v === null || v === '') continue;
                                if(typeof v === 'object') {
                                    v = this.normalize(v);
                                    if(Object.keys(v).length === 0) continue;
                                }
                                res[key] = v;
                            }
                            return res;
                        },
                        checkDirty() {
                            if (typeof $wire === 'undefined' || typeof $wire.profileData === 'undefined') return;
                            
                            const cleanData = this.normalize($wire.profileData);
                            const currentState = JSON.stringify(cleanData);
                            
                            if (this.baselineState === null) {
                                this.baselineState = currentState;
                            }
                            
                            this.show = (currentState !== this.baselineState);
                        }
                    }"
                    x-init="
                        setInterval(() => checkDirty(), 300);
                    "
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
                            <span style="font-size: 0.75rem; opacity: 0.8;">You have modified your personal info.</span>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-left: 1rem;">
                            <button 
                                type="button" 
                                @click="window.location.reload()"
                                class="popup-discard-btn"
                            >
                                Discard
                            </button>
                            <button 
                                type="button" 
                                wire:click="updateProfile"
                                class="popup-save-btn"
                                style="background-color: rgb(var(--primary-600));"
                            >
                                Save Now
                            </button>
                        </div>
                    </div>
                </div>

                
            </form>
        </div>

        <!-- Security Tab -->
        <div x-show="activeTab === 'security'" x-cloak class="space-y-6">
            <x-filament::section>
                <x-slot name="heading">
                    Security
                </x-slot>
                <x-slot name="description">
                    Update your password to keep your account secure.
                </x-slot>

                <form wire:submit="updatePassword">
                    {{ $this->passwordForm }}
                    <!-- Glassmorphism Floating Save Popup for Password -->
                    <div 
                        x-data="{ 
                            show: false, 
                            baselineState: null,
                            normalize(data) {
                                if(typeof data !== 'object' || data === null) return data;
                                if(Array.isArray(data)) {
                                    let arr = data.map(v => this.normalize(v)).filter(v => v !== false && v !== null && v !== '');
                                    return arr.sort();
                                }
                                const res = {};
                                for(let key of Object.keys(data).sort()) {
                                    let v = data[key];
                                    if(v === false || v === null || v === '') continue;
                                    if(typeof v === 'object') {
                                        v = this.normalize(v);
                                        if(Object.keys(v).length === 0) continue;
                                    }
                                    res[key] = v;
                                }
                                return res;
                            },
                            checkDirty() {
                                if (typeof $wire === 'undefined' || typeof $wire.passwordData === 'undefined') return;
                                
                                const cleanData = this.normalize($wire.passwordData);
                                const currentState = JSON.stringify(cleanData);
                                
                                if (this.baselineState === null) {
                                    this.baselineState = currentState;
                                }
                                
                                this.show = (currentState !== this.baselineState);
                            }
                        }"
                        x-init="
                            setInterval(() => checkDirty(), 300);
                        "
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
                                <span style="font-size: 0.75rem; opacity: 0.8;">You have modified your password.</span>
                            </div>

                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-left: 1rem;">
                                <button 
                                    type="button" 
                                    @click="window.location.reload()"
                                    class="popup-discard-btn"
                                >
                                    Discard
                                </button>
                                <button 
                                    type="button" 
                                    wire:click="updatePassword"
                                    class="popup-save-btn"
                                    style="background-color: rgb(var(--primary-600));"
                                >
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>


                    
                </form>
            </x-filament::section>

            <x-filament::section>
                @include('filament.pages.profile.active-sessions')
            </x-filament::section>

            @livewire(\App\Livewire\TwoFactorAuthentication::class)

            <x-filament::section>
                @livewire(\App\Livewire\LoginHistoryTable::class)
            </x-filament::section>
        </div>

        <!-- API Tokens Tab -->
        <div x-show="activeTab === 'api'" x-cloak class="space-y-6">
            <x-filament::section>
                <x-slot name="heading">
                    API Tokens
                </x-slot>
                <x-slot name="description">
                    Manage your personal API tokens.
                </x-slot>
                
                <livewire:user-api-tokens />
            </x-filament::section>
        </div>

        <!-- Notifications Tab -->
        <div x-show="activeTab === 'notifications'" x-cloak class="space-y-6">
            <x-filament::section>
                <x-slot name="heading">
                    Notifications
                </x-slot>
                <x-slot name="description">
                    Manage your notifications here.
                </x-slot>
                
                @livewire(\App\Livewire\ProfileNotificationsTable::class)
            </x-filament::section>
        </div>

        <!-- Advanced Tab -->
        <div x-show="activeTab === 'advanced'" x-cloak class="space-y-6">
            <x-filament::section>
                <x-slot name="heading">
                    Advanced
                </x-slot>
                <x-slot name="description">
                    Advanced account actions.
                </x-slot>
                
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-medium">Delete Account</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            Once your account is deleted, you will be logged out and your profile will be moved to the recycle bin.
                        </p>
                    </div>
                    
                    <div>
                        <x-filament::button color="danger" wire:click="mountAction('deleteAccount')">
                            Delete Account
                        </x-filament::button>
                    </div>
                </div>
            </x-filament::section>
        </div>
    </div>
    
    <x-filament-actions::modals />
</x-filament-panels::page>
