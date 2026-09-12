<x-filament-panels::page>
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
                <div class="mt-4 flex justify-end">
                    <x-filament::button type="submit">
                        Save Personal Information
                    </x-filament::button>
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

                    <div class="mt-4 flex justify-end">
                        <x-filament::button type="submit">
                            Update Password
                        </x-filament::button>
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
