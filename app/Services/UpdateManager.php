<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;

class UpdateManager
{
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

        $repo = env("GITHUB_REPO_PATH");
        if (!$repo) {
            Log::error("System Updater: GITHUB_REPO_PATH is not set in .env");
            return null;
        }

        try {
            $response = Http::withHeaders([
                "Accept" => "application/vnd.github.v3+json",
                "User-Agent" => "Aurex-ERP-Updater"
            ])->get("https://api.github.com/repos/{$repo}/releases/latest");

            if ($response->successful()) {
                $data = $response->json();
                
                $releaseInfo = [
                    "version" => $data["tag_name"] ?? null,
                    "notes" => $data["body"] ?? "No release notes provided.",
                    "zipball_url" => $data["zipball_url"] ?? null,
                    "published_at" => $data["published_at"] ?? null,
                ];

                Cache::put($cacheKey, $releaseInfo, now()->addHours(12));
                return $releaseInfo;
            } else {
                Log::error("System Updater: Failed to fetch latest release from GitHub. Status: " . $response->status());
            }
        } catch (\Exception $e) {
            Log::error("System Updater: Exception while fetching latest release - " . $e->getMessage());
        }

        return null;
    }

    public function isUpdateAvailable(): bool
    {
        $latest = $this->checkLatestVersion();
        if (!$latest || empty($latest["version"])) {
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
        
        if (!$latest || empty($latest["zipball_url"])) {
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
            $response = Http::withHeaders([
                "Accept" => "application/vnd.github.v3+json",
                "User-Agent" => "Aurex-ERP-Updater"
            ])->get($latest["zipball_url"]);
            
            file_put_contents($zipPath, $response->body());
        } catch (\Exception $e) {
            return ["success" => false, "message" => "Failed to download update package."];
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
            if (empty($directories)) {
                throw new \Exception("Extracted folder is empty.");
            }
            
            $sourceDir = $directories[0];
            
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
            
            file_put_contents(base_path("previous_version.txt"), $this->getCurrentVersion()); file_put_contents(base_path("version.txt"), $latest["version"]);
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
        if (!is_dir($dir)) return unlink($dir);
        
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

        $repo = env("GITHUB_REPO_PATH");
        $zipUrl = "https://api.github.com/repos/{$repo}/zipball/{$previous}";

        $tempDir = storage_path("app/updates");
        $zipPath = $tempDir . "/rollback.zip";
        $extractPath = $tempDir . "/extracted_rollback";

        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        Log::info("Updater: Downloading Rollback ZIP for $previous");
        try {
            $response = Http::withHeaders([
                "Accept" => "application/vnd.github.v3+json",
                "User-Agent" => "Aurex-ERP-Updater"
            ])->get($zipUrl);
            
            if (!$response->successful()) {
                return ["success" => false, "message" => "Failed to download rollback package from GitHub."];
            }
            file_put_contents($zipPath, $response->body());
        } catch (\Exception $e) {
            return ["success" => false, "message" => "Failed to download rollback package."];
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
            if (empty($directories)) {
                throw new \Exception("Extracted folder is empty.");
            }
            $sourceDir = $directories[0];
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
