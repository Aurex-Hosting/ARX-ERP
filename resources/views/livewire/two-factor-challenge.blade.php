<div class="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 space-y-6">
        <div class="text-center">
            <h2 class="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                Two-Factor Authentication
            </h2>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                @if($useRecoveryCode)
                    Please confirm access to your account by entering one of your emergency recovery codes.
                @else
                    Please confirm access to your account by entering the authentication code provided by your authenticator application.
                @endif
            </p>
        </div>

        <form wire:submit="verify" class="space-y-6">
            @if($useRecoveryCode)
                <div>
                    <label class="block text-sm font-medium leading-6 text-gray-950 dark:text-white">Recovery Code</label>
                    <x-filament::input.wrapper class="mt-2">
                        <x-filament::input
                            type="text"
                            wire:model="recoveryCode"
                            placeholder="xxxxxxxxx-xxxxxxxxx"
                            class="text-center text-lg"
                        />
                    </x-filament::input.wrapper>
                    @error("recoveryCode")
                        <span class="text-sm text-danger-600 dark:text-danger-400">{{ $message }}</span>
                    @enderror
                </div>
            @else
                <div>
                    <label class="block text-sm font-medium leading-6 text-gray-950 dark:text-white">Authentication Code</label>
                    <x-filament::input.wrapper class="mt-2">
                        <x-filament::input
                            type="text"
                            wire:model="code"
                            placeholder="123456"
                            class="text-center tracking-widest text-2xl py-2"
                        />
                    </x-filament::input.wrapper>
                    @error("code")
                        <span class="text-sm text-danger-600 dark:text-danger-400">{{ $message }}</span>
                    @enderror
                </div>
            @endif

            <x-filament::button type="submit" color="primary" class="w-full">
                Verify Log in
            </x-filament::button>

            <div class="text-center mt-4">
                <button type="button" wire:click="toggleRecovery" class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400">
                    @if($useRecoveryCode)
                        Use an authenticator app instead
                    @else
                        Use a recovery code instead
                    @endif
                </button>
            </div>
        </form>
    </div>
</div>
