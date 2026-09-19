<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class LicenseManager
{
    private $updateManager;
    private $publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0OuvmTkBYlGgxOvp5oQC\nb5LNv3xnqvR3300VPnzoiLYwo2aVL9zqLDs0wBqg/tiSVN/xDeIs18lSLy/R8dcx\n3zLAAm03R08H/UpUp4o2efFCBLgnEHwZTiAwdoS6nm7kcYxZyI1h7mVi7KKhAXRh\nn37TGoXs+Eb+kRQd4Xh8V1+uB+IpWv5b1+hVanlVFz61z/WVU5/RknPASHFNmG8K\nUahnqA7V8G4atH56/KjGdDBbBcr1mnjoTTCEzUGao86gYexCT9UXJf+cYpsNSTMt\nWG/0RMdFYnZYWksEllmA8Dg4RuG4b90W0Dz3cpHnQAfUJyrYdko3Gzl54iWPyxRC\nEwIDAQAB\n-----END PUBLIC KEY-----";

    public function __construct(UpdateManager $updateManager)
    {
        $this->updateManager = $updateManager;
    }

    public function getLicenseStatus($force = false): ?array
    {
        $cacheKey = "license_validation_status";
        
        if (!$force && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $key = env("PRODUCT_LICENSE_KEY");
        if (!$key) {
            $response = ["success" => false, "error" => "License key not set in .env"];
            Cache::put($cacheKey, $response, now()->addMinutes(10));
            return $response;
        }

        try {
            $apiResponse = Http::withOptions([
                "curl" => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],
                "connect_timeout" => 10,
                "timeout" => 30
            ])->withHeaders([
                "Accept" => "application/json",
                "User-Agent" => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ])->post("https://license.magneticx.store/api/v1/license/validate?t=" . time(), [
                "key" => $key,
                "installationId" => $this->updateManager->getInstallationId()
            ]);

            $responseJson = $apiResponse->json();
            
            // Check for new RSA format (data + signature)
            if (isset($responseJson["data"]) && isset($responseJson["signature"])) {
                $payloadData = $responseJson["data"];
                $payloadString = json_encode($payloadData);
                $signature = base64_decode($responseJson["signature"]);
                
                $isValid = openssl_verify(
                    $payloadString, 
                    $signature, 
                    $this->publicKey, 
                    OPENSSL_ALGO_SHA256
                );

                if ($isValid === 1) {
                    // Valid Signature!
                    Cache::put($cacheKey, $payloadData, now()->addHours(12));
                    return $payloadData;
                } else {
                    Log::error("License Manager: CRITICAL - RSA Signature Verification Failed!");
                    $response = ["success" => false, "error" => "CRITICAL: License integrity check failed."];
                    Cache::put($cacheKey, $response, now()->addMinutes(30));
                    return $response;
                }
            } 
            
            // Legacy / Error fallback (if API returns raw {"success":false,"error":...})
            if (isset($responseJson["success"]) && $responseJson["success"] === false) {
                Cache::put($cacheKey, $responseJson, now()->addMinutes(10));
                return $responseJson;
            }

            Log::error("License Manager Invalid Format. Raw Response: " . $apiResponse->body());
            $response = ["success" => false, "error" => "Invalid response format from License Server"];
            Cache::put($cacheKey, $response, now()->addMinutes(30));
            return $response;

        } catch (\Exception $e) {
            Log::error("License Manager: Exception - " . $e->getMessage());
            $response = ["success" => false, "error" => "Connection to License Server Failed"];
            Cache::put($cacheKey, $response, now()->addMinutes(10));
            return $response;
        }
    }
}
