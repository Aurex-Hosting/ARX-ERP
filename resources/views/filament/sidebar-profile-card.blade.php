@php
    $user = auth()->user();
    $avatarUrl = $user->avatar_url ? asset('storage/'.$user->avatar_url) : 'https://ui-avatars.com/api/?name='.urlencode($user->getFilamentName()).'&color=FFFFFF&background=111827';
    $bannerUrl = $user->banner_url ? asset('storage/'.$user->banner_url) : null;
@endphp

<a href="{{ \App\Filament\Pages\ManageProfile::getUrl() }}" class="block mt-4 mx-4 mb-4 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 transition hover:ring-2 hover:ring-primary-500 dark:bg-gray-900 bg-white relative group">
    <!-- Banner Background -->
    <div class="h-16 w-full bg-gray-200 dark:bg-gray-800 bg-cover bg-center" style="background-image: url('{{ $bannerUrl ?? '' }}');">
        @if(!$bannerUrl)
            <div class="w-full h-full bg-gradient-to-r from-primary-500 to-info-500 opacity-80"></div>
        @endif
    </div>
    
    <!-- Profile Info -->
    <div class="px-4 pb-4 pt-0 relative flex flex-col items-center">
        <!-- Avatar -->
        <div class="h-12 w-12 rounded-full border-2 border-white dark:border-gray-900 bg-white dark:bg-gray-800 overflow-hidden -mt-6 z-10 shadow-sm group-hover:scale-105 transition">
            <img src="{{ $avatarUrl }}" alt="{{ $user->getFilamentName() }}" class="h-full w-full object-cover">
        </div>
        
        <!-- Name & ID -->
        <div class="text-center mt-2 w-full">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {{ $user->getFilamentName() }}
            </h4>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                ID: {{ $user->profile_id ?? 'N/A' }}
            </p>
        </div>
    </div>
</a>
