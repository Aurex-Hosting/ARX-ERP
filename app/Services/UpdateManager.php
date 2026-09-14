<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

class UpdateManager
{
    public function getInstallationId(): string
    {
        $path = storage_path("app/device_fingerprint.txt");
        if (file_exists($path)) {
            return trim(file_get_contents($path));
        }
        
        $machineId = "";
        if (file_exists("/etc/machine-id")) {
            $machineId = trim(file_get_contents("/etc/machine-id"));
        } elseif (file_exists("/var/lib/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¤bus/machine-id")) {
            $machineId = trim(file_get_contents("/var/lib/dbus/machine-id"));
        } else {
            $machineId = Str::uuid()->toString();
        }

        $fingerprint = hash("sha256", php_uname("l") . php_uname("m") . $machineId);
        file_put_contents($path, $fingerprint);
        
        return $fingerprint;
    }

    public function getCurrentVersion(): string
    {
        $path = base_path("version.txt");
        if (file_exists($path)) {
            return trim(file_get_contents($path));
        }
        return "v1.0.0";
    }


    public function checkLatestVersion($force = false): ?array
    {
        $cacheKey = "updater.latest_release";
        
        if (!$force && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $key = env("PRODUCT_LICENSE_KEY");
        if (!$key) {
            Log::error("System Updater: PRODUCT_LICENSE_KEY is not set in .env");
            return ["error" => "PRODUCT_LICENSE_KEY is missing in .env"];
        }

        try {
            Log::info("Updater: Sending POST to license server for checkLatestVersion", ["key" => $key, "installationId" => $this->getInstallationId()]);
            $response = Http::withOptions([
                "curl" => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],
                "connect_timeout" => 10,
                "timeout" => 30
            ])->withHeaders([
                "Accept" => "application/json",
                "User-Agent" => "Aurex-ERP-Updater"
            ])->post("https://license.magneticx.store/api/v1/license/update?t=" . time(), [
                "key" => $key,
                "installationId" => $this->getInstallationId()
            ]);

            $data = $response->json();
            Log::info("Updater: Received response from license server", ["status" => $response->status(), "body" => $response->body()]);

            if ($response->successful()) {
                if (!empty($data["success"]) && $data["success"] === true) {
                    $releaseInfo = [
                        "version" => $data["latest_version"] ?? null,
                        "notes" => $data["notes"] ?? "No release notes provided.",
                        "name" => $data["name"] ?? null,
                        "published_at" => $data["published_at"] ?? null,
                    ];
                    Cache::put($cacheKey, $releaseInfo, now()->addHours(12));
                    return $releaseInfo;
                } else {
                    $errMsg = $data["message"] ?? $data["error"] ?? "License check rejected by server.";
                    return ["error" => $errMsg];
                }
            } else {
                $errMsg = $data["message"] ?? $data["error"] ?? "License Server Error (HTTP " . $response->status() . ")";
                return ["error" => $errMsg];
            }
        } catch (\Exception $e) {
            Log::error("System Updater: Exception - " . $e->getMessage());
            return ["error" => "Connection Exception: " . $e->getMessage()];
        }

        return null;
    }

    public function isUpdateAvailable(): bool
    {
        $latest = $this->checkLatestVersion();
        if (!$latest || isset($latest["error"]) || empty($latest["version"])) {
            return false;
        }

        $current = $this->getCurrentVersion();
        
        $cleanCurrent = ltrim($current, "v");
        $cleanLatest = ltrim($latest["version"], "v");

        return version_compare($cleanLatest, $cleanCurrent, ">");
    }

    public function performUpdate(): array
    {
        set_time_limit(0);
        $latest = $this->checkLatestVersion();
        
        if (!$latest || empty($latest["name"])) {
            return ["success" => false, "message" => "No valid update package found."];
        }

        $tempDir = storage_path("app/updates");
        $zipPath = $tempDir . "/update.zip";
        $extractPath = $tempDir . "/extracted";

        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        // 1. Pre-flight Backup
        Log::info("Updater: Starting Pre-flight Backup");
        try {
            Artisan::call("backup:run", ["--only-to-disk" => "backups_manual"]);
        } catch (\Exception $e) {
            Log::error("Updater: Pre-flight Backup failed - " . $e->getMessage());
            return ["success" => false, "message" => "Update aborted. Pre-flight backup failed to complete."];
        }

        // 2. Download ZIP
        Log::info("Updater: Downloading Update ZIP");
        try {
            Log::info("Updater: Sending POST to license server for checkLatestVersion", ["key" => $key, "installationId" => $this->getInstallationId()]);
            $response = Http::withOptions([
                "curl" => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],
                "connect_timeout" => 10,
                "timeout" => 600
            ])->withHeaders([
                "Accept" => "application/json",
                "User-Agent" => "Aurex-ERP-Updater"
            ])->post("https://license.magneticx.store/api/v1/license/download?t=" . time(), [
                "key" => env("PRODUCT_LICENSE_KEY"),
                "installationId" => $this->getInstallationId(),
                "Relesename" => $latest["name"]
            ]);
            
            if (!$response->successful()) {
                $data = $response->json();
                $errMsg = $data["message"] ?? $data["error"] ?? "Failed to download update package (HTTP " . $response->status() . ").";
                return ["success" => false, "message" => $errMsg];
            }
            
            file_put_contents($zipPath, $response->body());
        } catch (\Exception $e) {
            return ["success" => false, "message" => "Exception during download: " . $e->getMessage()];
        }

        // 3. Extract ZIP
        Log::info("Updater: Extracting Update ZIP");
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) === true) {
            if (is_dir($extractPath)) {
                $this->deleteDirectory($extractPath);
            }
            mkdir($extractPath, 0755, true);
            $zip->extractTo($extractPath);
            $zip->close();
        } else {
            return ["success" => false, "message" => "Failed to extract update package."];
        }

        // 4. File Replacement
        Log::info("Updater: Replacing Files");
        try {
            $directories = glob($extractPath . "/*" , GLOB_ONLYDIR);
            
            // If the extracted zip doesnt have a single root folder, use the extract path directly
            $sourceDir = empty($directories) ? $extractPath : $directories[0];
            
            $this->copyDirectory($sourceDir, base_path());
        } catch (\Exception $e) {
            Log::error("Updater: File copy failed - " . $e->getMessage());
            return ["success" => false, "message" => "Failed to copy new files: " . $e->getMessage()];
        }

        // 5. Post-Update Commands
        Log::info("Updater: Running Post-Update Commands");
        try {
            $composer = shell_exec("composer install --no-dev --optimize-autoloader 2>&1");
            Log::info("Updater Composer: " . $composer);

            Artisan::call("migrate", ["--force" => true]);
            Artisan::call("optimize:clear");
            
            file_put_contents(base_path("previous_version.txt"), $this->getCurrentVersion());
            file_put_contents(base_path("version.txt"), $latest["version"]);
            Cache::forget("updater.latest_release");
            activity()->log("System successfully updated to " . $latest["version"]);
            
        } catch (\Exception $e) {
            Log::error("Updater: Post-update commands failed - " . $e->getMessage());
            return ["success" => false, "message" => "Update files copied, but post-update commands failed. Check logs."];
        }

        // Cleanup
        $this->deleteDirectory($tempDir);

        return ["success" => true, "message" => "System successfully updated to " . $latest["version"]];
    }

    private function copyDirectory($src, $dst)
    {
        $dir = opendir($src);
        @mkdir($dst);
        
        $excludes = [".env", "storage", "public/storage"];

        while (false !== ($file = readdir($dir))) {
            if (($file != ".") && ($file != "..")) {
                if (in_array($file, $excludes) && $dst === base_path()) {
                    continue; 
                }
                
                if (is_dir($src . "/" . $file)) {
                    $this->copyDirectory($src . "/" . $file, $dst . "/" . $file);
                } else {
                    copy($src . "/" . $file, $dst . "/" . $file);
                }
            }
        }
        closedir($dir);
    }

    private function deleteDirectory($dir)
    {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return unlink ($dir);
        
        foreach (scandir($dir) as $item) {
            if ($item == "." || $item == "..") continue;
            if (!$this->deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) return false;
        }
        return rmdir($dir);
    }

    public function getPreviousVersion(): ?string
    {
        $path = base_path("previous_version.txt");
        if (file_exists($path)) {
            return trim(file_get_contents($path));
        }
        return null;
    }

    public function performRollback(): array
    {
        set_time_limit(0);
        $previous = $this->getPreviousVersion();
        if (!$previous) {
            return ["success" => false, "message" => "No previous version recorded."];
        }

        $tempDir = storage_path("app/updates");
        $zipPath = $tempDir . "/rollback.zip";
        $extractPath = $tempDir . "/extracted_rollback";

        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        Log::info("Updater: Downloading Rollback ZIP for $previous");
        try {
            Log::info("Updater: Sending POST to license server for checkLatestVersion", ["key" => $key, "installationId" => $this->getInstallationId()]);
            $response = Http::withOptions([
                "curl" => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],
                "connect_timeout" => 10,
                "timeout" => 600
            ])->withHeaders([
                "Accept" => "application/json",
                "User-Agent" => "Aurex-ERP-Updater"
            ])->post("https://license.magneticx.store/api/v1/license/download?t=" . time(), [
                "key" => env("PRODUCT_LICENSE_KEY"),
                "installationId" => $this->getInstallationId(),
                "Relesename" => $latest["name"]
            ]);
            
            if (!$response->successful()) {
                $data = $response->json();
                $errMsg = $data["message"] ?? $data["error"] ?? "Failed to download update package (HTTP " . $response->status() . ").";
                return ["success" => false, "message" => $errMsg];
            }
            
            file_put_contents($zipPath, $response->body());
        } catch (\Exception $e) {
            return ["success" => false, "message" => "Exception during rollback download: " . $e->getMessage()];
        }

        Log::info("Updater: Extracting Rollback ZIP");
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) === true) {
            if (is_dir($extractPath)) {
                $this->deleteDirectory($extractPath);
            }
            mkdir($extractPath, 0755, true);
            $zip->extractTo($extractPath);
            $zip->close();
        } else {
            return ["success" => false, "message" => "Failed to extract rollback package."];
        }

        Log::info("Updater: Replacing Files for Rollback");
        try {
            $directories = glob($extractPath . "/*" , GLOB_ONLYDIR);
            
            $sourceDir = empty($directories) ? $extractPath : $directories[0];
            
            $this->copyDirectory($sourceDir, base_path());
        } catch (\Exception $e) {
            Log::error("Updater: File copy failed - " . $e->getMessage());
            return ["success" => false, "message" => "Failed to copy rollback files: " . $e->getMessage()];
        }

        Log::info("Updater: Running Post-Rollback Commands");
        try {
            shell_exec("composer install --no-dev --optimize-autoloader 2>&1");
            Artisan::call("optimize:clear");
            
            file_put_contents(base_path("version.txt"), $previous);
            if (file_exists(base_path("previous_version.txt"))) {
                unlink(base_path("previous_version.txt"));
            }
            Cache::forget("updater.latest_release");
            activity()->log("System successfully rolled back to " . $previous);
            
        } catch (\Exception $e) {
            Log::error("Updater: Post-rollback commands failed - " . $e->getMessage());
            return ["success" => false, "message" => "Rollback files copied, but post-commands failed."];
        }

        $this->deleteDirectory($tempDir);
        return ["success" => true, "message" => "System successfully rolled back to " . $previous];
    }
}
