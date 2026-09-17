<x-filament-panels::page>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- License Details -->
        <x-filament::section>
            <x-slot name="heading">
                System License Details
            </x-slot>

            <div class="flex flex-col gap-6">
                <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">License Key</p>
                    <p class="text-lg font-mono text-gray-900 dark:text-white">{{ $licenseKey }}</p>
                </div>
                
                <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Installation / Hardware ID</p>
                    <p class="text-sm font-mono text-gray-900 dark:text-white break-all">{{ $installationId }}</p>
                </div>
            </div>
        </x-filament::section>

        <!-- Status Card -->
        <x-filament::section>
            <x-slot name="heading">
                Validation Status
            </x-slot>

            <div class="flex flex-col gap-6">
                @if($licenseData && isset($licenseData["success"]) && $licenseData["success"] === true)
                    
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-success-100 dark:bg-success-500/20 flex items-center justify-center">
                            <x-heroicon-o-check-circle class="w-6 h-6 text-success-600 dark:text-success-400"/>
                        </div>
                        <div>
                            <p class="text-lg font-bold text-success-600 dark:text-success-400">Active & Valid</p>
                            <p class="text-sm text-gray-500">{{ $licenseData["message"] ?? "Authorized" }}</p>
                        </div>
                    </div>

                    <div class="mt-4">
                        <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Expiration Date</p>
                        @php
                            $expiryKey = isset($licenseData["expiresAt"]) ? "expiresAt" : (isset($licenseData["expires_at"]) ? "expires_at" : null);
                        @endphp
                        @if($expiryKey)
                            @php
                                $expires = \Carbon\Carbon::parse($licenseData[$expiryKey]);
                                $days = (int) now()->diffInDays($expires, false);
                            @endphp
                            <p class="text-lg font-bold text-gray-900 dark:text-white">
                                {{ $expires->format("F j, Y, g:i A") }}
                            </p>
                            @if($days > 0)
                                <p class="text-sm font-medium {{ $days <= 7 ? 'text-danger-600' : 'text-primary-600' }}">
                                    Expires in {{ $days }} days
                                </p>
                            @elseif($days == 0)
                                <p class="text-sm font-medium text-danger-600">
                                    Expires today!
                                </p>
                            @else
                                <p class="text-sm font-medium text-danger-600">
                                    Expired {{ abs($days) }} days ago
                                </p>
                            @endif
                        @else
                            <p class="text-lg font-medium text-gray-900 dark:text-white">Lifetime (Never Expires)</p>
                        @endif
                    </div>

                @else
                    
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-danger-100 dark:bg-danger-500/20 flex items-center justify-center">
                            <x-heroicon-o-x-circle class="w-6 h-6 text-danger-600 dark:text-danger-400"/>
                        </div>
                        <div>
                            <p class="text-lg font-bold text-danger-600 dark:text-danger-400">Invalid License</p>
                            <p class="text-sm text-gray-500">{{ $licenseData["error"] ?? "Failed to validate license with server." }}</p>
                        </div>
                    </div>

                @endif
            </div>
        </x-filament::section>
        
    </div>
</x-filament-panels::page>