<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>License Error</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="bg-white p-8 rounded-lg shadow-md max-w-lg w-full text-center">
        <svg class="mx-auto h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">License Invalid or Expired</h1>
        <p class="text-gray-600 mb-6">
            
            @php
                $status = app(\App\Services\LicenseManager::class)->getLicenseStatus();
                $msg = $status["error"] ?? "Your system license is not valid. Please renew your license to continue using the system.";
                
                if (isset($status["success"]) && $status["success"] === true) {
                    if (!empty($status["isFrozen"])) $msg = "Your license has been frozen by the administrator.";
                    elseif (!empty($status["expiresAt"]) && now()->isAfter(\Carbon\Carbon::parse($status["expiresAt"]))) {
                        $msg = "Your system license expired on " . \Carbon\Carbon::parse($status["expiresAt"])->format("F j, Y") . ".";
                    }
                }
                echo $msg;
            @endphp
            
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <a href="https://license.magneticx.store" target="_blank" class="inline-block bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-md transition duration-200 w-full sm:w-auto">
                Renew License
            </a>
            <a href="{{ route('license.check') }}" class="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-md transition duration-200 w-full sm:w-auto">
                Check Now
            </a>
        </div>
    </div>
</body>
</html>