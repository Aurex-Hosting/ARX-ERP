<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$lm = app(App\Services\LicenseManager::class);
print_r($lm->getLicenseStatus(true));