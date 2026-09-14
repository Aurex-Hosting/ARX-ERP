<x-filament-panels::page>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Versions Card -->
        <div class="md:col-span-1">
            <x-filament::section>
                <x-slot name="heading">
                    Version Status
                </x-slot>

                <div class="flex flex-col gap-4">
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Current Version</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ $currentVersion }}</p>
                    </div>

                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Latest Version</p>
                        @if($latestRelease && !isset($latestRelease["error"]))
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ $latestRelease["version"] }}</p>
                            @if($updateAvailable)
                                <p class="text-sm font-medium text-success-600 dark:text-success-400 mt-1">
                                    Update Available!
                                </p>
                            @else
                                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                                    System is up to date.
                                </p>
                            @endif
                        @else
                            <p class="text-lg font-medium text-danger-600 dark:text-danger-400">
                                {{ $latestRelease["error"] ?? "Unknown (Could not fetch from License Server)" }}
                            </p>
                        @endif
                    </div>
                </div>
            </x-filament::section>
        </div>

        <!-- Release Notes Card -->
        <div class="md:col-span-2">
            <x-filament::section>
                <x-slot name="heading">
                    Release Notes @if($latestRelease && !isset($latestRelease["error"])) - {{ $latestRelease["version"] }} @endif
                </x-slot>

                <div class="prose dark:prose-invert max-w-none">
                    @if($latestRelease && !empty($latestRelease["notes"]))
                        {!! str($latestRelease["notes"])->markdown() !!}
                    @else
                        <p class="text-gray-500 dark:text-gray-400">No release notes available.</p>
                    @endif
                </div>
            </x-filament::section>
        </div>
        
    </div>
</x-filament-panels::page>
