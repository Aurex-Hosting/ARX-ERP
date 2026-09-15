<?php
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
exec("php artisan key:generate --force");
exec("php artisan migrate --force");
exec("php artisan shield:generate --all --no-interaction");

echo "\n[*] Admin Account Setup\n";
$admin_name = readline("Admin Name: ");
$admin_email = readline("Admin Email: ");
$admin_pass = readline("Admin Password: ");

exec("php artisan tinker --execute=\"use App\Models\User; \$user = User::firstOrCreate([\"email\" => \"$admin_email\"], [\"name\" => \"$admin_name\", \"password\" => bcrypt(\"$admin_pass\"), \"email_verified_at\" => now()]); \$user->assignRole(\"super_admin\");\"");

echo "\n========================================\n";
echo "    Installation Complete!\n";
echo "========================================\n";
