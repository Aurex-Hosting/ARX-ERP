<?php

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
        $frames = ["\e[36mÃ¢Â â€¹\e[0m", "\e[36mÃ¢Â â„¢\e[0m", "\e[36mÃ¢Â Â¹\e[0m", "\e[36mÃ¢Â Â¸\e[0m", "\e[36mÃ¢Â Â¼\e[0m", "\e[36mÃ¢Â Â´\e[0m", "\e[36mÃ¢Â Â¦\e[0m", "\e[36mÃ¢Â Â§\e[0m", "\e[36mÃ¢Â â€¡\e[0m", "\e[36mÃ¢Â Â\e[0m"];
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
          PDO::ATTR_TIMEOUT => 5
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
runWithSpinner("chmod -R 775 storage bootstrap/cache", "    -> Setting Directory Permissions...");
runWithSpinner("php artisan key:generate --force", "    -> Generating App Security Key...");
runWithSpinner("php artisan migrate --force", "    -> Running Database Migrations...");
runWithSpinner("yes | php artisan shield:generate --all", "    -> Generating Security Shields...");

echo "\n[*] Admin Account Setup\n";
$admin_name = readline("Admin Name: ");
$admin_email = readline("Admin Email: ");
$admin_pass = readline("Admin Password: ");


$cmd = "php artisan tinker --execute=\"use App\Models\User; \$user = User::firstOrCreate([\x27email\x27 => \x27$admin_email\x27], [\x27name\x27 => \x27$admin_name\x27, \x27password\x27 => \x27$admin_pass\x27, \x27email_verified_at\x27 => now()]); \$user->assignRole(\x27super_admin\x27);\"";
$output = [];
$return_var = 0;
exec($cmd, $output, $return_var);
if ($return_var !== 0) {
    die("\n[!] Failed to create admin account. Please verify your database credentials and try again.\n");
}


echo "\n========================================\n";
echo "    Installation Complete!\n";
echo "========================================\n";
