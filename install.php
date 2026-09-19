<?php

if (!function_exists('readline')) {
    function readline($prompt = '') {
        echo $prompt;
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        fclose($handle);
        return rtrim($line, "\r\n");
    }
}

function runWithSpinner($command, $message) {
    echo $message . " ";
    $descriptorspec = [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"]
    ];
    $process = proc_open($command, $descriptorspec, $pipes);
    if (is_resource($process)) {
        stream_set_blocking($pipes[1], 0);
        stream_set_blocking($pipes[2], 0);
        $frames = ["\e[36m|\e[0m", "\e[36m/\e[0m", "\e[36m-\e[0m", "\e[36m\\\e[0m"];
        $i = 0;
        while (true) {
            $status = proc_get_status($process);
            if (!$status["running"]) break;
            
            echo "\r" . $message . " " . $frames[$i % count($frames)];
            $i++;
            usleep(100000);
        }
        fclose($pipes[0]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);
        echo "\r" . $message . " [\e[32mÃ¢Å“â€\e[0m]       \n";
    }
}

if (php_sapi_name() !== "cli") die("This installer must be run from the command line: php install.php\n");

echo "========================================\n";
echo "      Product Installation Wizard\n";
echo "========================================\n\n";

echo "[*] Generating Hardware Fingerprint...\n";
$path = __DIR__ . "/storage/app/device_fingerprint.txt";
if (file_exists($path)) {
    $fingerprint = trim(file_get_contents($path));
} else {
    $machineId = "";
    if (file_exists("/etc/machine-id")) {
        $machineId = trim(file_get_contents("/etc/machine-id"));
    } elseif (file_exists("/var/lib/dbus/machine-id")) {
        $machineId = trim(file_get_contents("/var/lib/dbus/machine-id"));
    } else {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        $machineId = vsprintf("%s%s-%s-%s-%s-%s%s%s", str_split(bin2hex($data), 4));
    }
    $uname = php_uname("n") . php_uname("m");
    $fingerprint = hash("sha256", $machineId . $uname . "Aurex-ERP-Hardware-Lock");
    @mkdir(dirname($path), 0755, true);
    file_put_contents($path, $fingerprint);
}
echo "[+] Installation ID: " . $fingerprint . "\n\n";

echo "[*] Product License Activation\n";
$licenseKey = readline("Enter your License Key: ");
if (empty($licenseKey)) die("License Key is required!\n");

$ch = curl_init("https://license.magneticx.store/api/v1/license/activate?t=" . time());
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json", "User-Agent: Aurex-ERP-Installer"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "key" => $licenseKey,
    "installationId" => $fingerprint
]));
curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);

echo "Contacting license server...\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);

$isSuccess = false;
$error = "Unknown error (HTTP $httpCode)";

// Handle nested RSA structure
if (isset($data["data"]["success"])) {
    $isSuccess = $data["data"]["success"];
    $error = $data["data"]["error"] ?? $data["data"]["message"] ?? $error;
} 
// Handle raw structure
elseif (isset($data["success"])) {
    $isSuccess = $data["success"];
    $error = $data["error"] ?? $data["message"] ?? $error;
}

if ($httpCode !== 200 || !$isSuccess) {

    
    die("\n[!] License Activation Failed: $error\n");
}
echo "[+] License Activated Successfully!\n\n";

echo "[*] Database Configuration\n";
$db_host = readline("Database Host (e.g., db): ");
if (empty($db_host)) $db_host = "db";

$db_port = readline("Database Port (e.g., 3306): ");
if (empty($db_port)) $db_port = "3306";

$db_name = readline("Database Name (default: erp_system): ");
if (empty($db_name)) $db_name = "erp_system";
$db_user = readline("Database User (default: erp_user): ");
if (empty($db_user)) $db_user = "erp_user";
$db_pass = readline("Database Password (default: erp_password): ");
if (empty($db_pass)) $db_pass = "erp_password";

echo "\n[*] Testing Database Connection...\n";
  try {
      $pdo = new PDO("mysql:host=$db_host;port=$db_port;dbname=$db_name", $db_user, $db_pass, [
          PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
          PDO::ATTR_TIMEOUT => 5,
          PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false
      ]);
      echo "[+] Database connection successful!\n";
  } catch (PDOException $e) {
      die("\n[!] Database connection failed: " . $e->getMessage() . "\nPlease verify your database is running and accessible from this machine.\n");
  }

  echo "\n[*] Generating .env file...\n";
if (!file_exists(".env.example")) die("[!] .env.example file is missing.\n");

$env = file_get_contents(".env.example");
$env = preg_replace("/PRODUCT_LICENSE_KEY=.*/", "PRODUCT_LICENSE_KEY=" . $licenseKey, $env);
$env = preg_replace("/DB_HOST=.*/", "DB_HOST=" . $db_host, $env);
$env = preg_replace("/DB_PORT=.*/", "DB_PORT=" . $db_port, $env);
$env = preg_replace("/DB_DATABASE=.*/", "DB_DATABASE=" . $db_name, $env);
$env = preg_replace("/DB_USERNAME=.*/", "DB_USERNAME=" . $db_user, $env);
$env = preg_replace("/DB_PASSWORD=.*/", "DB_PASSWORD=" . $db_pass, $env);
$env = preg_replace("/APP_ENV=.*/", "APP_ENV=production", $env);
$env = preg_replace("/APP_DEBUG=.*/", "APP_DEBUG=false", $env);

file_put_contents(".env", $env);
echo "[+] .env file created successfully.\n\n";

echo "[*] Initializing Application...\n";
runWithSpinner("mkdir -p storage/framework/views storage/framework/cache storage/framework/sessions storage/logs bootstrap/cache", "    -> Creating Storage Directories...");
runWithSpinner("chmod -R 777 storage bootstrap/cache", "    -> Setting Directory Permissions...");
runWithSpinner("php artisan key:generate --force", "    -> Generating App Security Key...");
$fresh_install = readline("Do you want to perform a fresh installation? WARNING: This will delete all existing data! (yes/no): ");
if (strtolower(trim($fresh_install)) === 'yes') {
    runWithSpinner("php artisan migrate:fresh --force", "    -> Wiping Database & Running Fresh Migrations...");
} else {
    runWithSpinner("php artisan migrate --force", "    -> Running Database Migrations...");
}
runWithSpinner("yes | php artisan shield:generate --all", "    -> Generating Security Shields...");

echo "\n[*] Admin Account Setup\n";
$admin_name = readline("Admin Name: ");
$admin_email = readline("Admin Email: ");
$admin_pass = readline("Admin Password: ");


  $name_parts = explode(' ', $admin_name, 2);
  $first_name = $name_parts[0] ?? '';
  $last_name = $name_parts[1] ?? '';

  $cmd = "php artisan tinker --execute=\"use App\Models\User; use Spatie\Permission\Models\Role; Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']); \\\$user = User::where('email', '$admin_email')->first() ?? new User(); \\\$user->forceFill(['email' => '$admin_email', 'first_name' => '$first_name', 'last_name' => '$last_name', 'password' => '$admin_pass', 'email_verified_at' => now(), 'is_locked' => false, 'failed_login_attempts' => 0]); \\\$user->save(); \\\$user->assignRole('super_admin'); app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();\"";
  $output = [];
  $return_var = 0;
  exec($cmd, $output, $return_var);
  if ($return_var !== 0) {
      die("\n[!] Failed to create admin account.\nError Output:\n" . implode("\n", $output) . "\n");
  }


echo "\n[*] Verifying Installation Integrity...\n";
$verify_cmd = "php artisan tinker --execute=\"use Illuminate\Support\Facades\Schema; use App\Models\User; \\\$errors = []; if (!Schema::hasTable('users')) \\\$errors[] = 'Missing table: users'; if (!Schema::hasTable('roles')) \\\$errors[] = 'Missing table: roles'; if (!Schema::hasTable('notifications')) \\\$errors[] = 'Missing table: notifications'; if (!Schema::hasTable('personal_access_tokens')) \\\$errors[] = 'Missing table: personal_access_tokens'; \\\$user = User::where('email', '$admin_email')->first(); if (!\\\$user) \\\$errors[] = 'Admin user was not created in the database'; elseif (!\\\$user->hasRole('super_admin')) \\\$errors[] = 'Admin user is missing the super_admin role'; if (!empty(\\\$errors)) { echo 'VERIFICATION_FAILED:' . implode(', ', \\\$errors); } else { echo 'VERIFICATION_OK'; }\"";
$verify_output = [];
$verify_return = 0;
exec($verify_cmd, $verify_output, $verify_return);
$verify_result = implode("\n", $verify_output);

if (strpos($verify_result, 'VERIFICATION_FAILED') !== false) {
    $reason = explode('VERIFICATION_FAILED:', $verify_result)[1] ?? 'Unknown error';
    die("\n[!] Installation Verification Failed.\nReason: " . trim($reason) . "\nPlease run 'php artisan migrate:fresh' to wipe the broken database state and run the installer again.\n");
} elseif (strpos($verify_result, 'VERIFICATION_OK') === false) {
    die("\n[!] Installation Verification Failed. Could not run checks.\nError Output:\n" . $verify_result . "\n");
}
echo "[+] All systems verified successfully! Application is ready.\n";

echo "\n========================================\n";
echo "    Installation Complete!\n";
echo "========================================\n";
