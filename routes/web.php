<?php

use Illuminate\Support\Facades\Route;
use App\Livewire\TwoFactorChallenge;

Route::get('/', function () {
    return redirect('/dashboard');
});

Route::get('/login', function () {
    return redirect('/dashboard/login');
})->name('login');

Route::get('/two-factor-challenge', TwoFactorChallenge::class)->name('two-factor.challenge')->middleware(['web']);





Route::get('/license-error', function () {
    return view('errors.license');
})->name('license.error');

Route::get('/license-check-now', function (\App\Services\LicenseManager $licenseManager) {
    // Pass true to force API call and bypass cache
    $licenseManager->getLicenseStatus(true);
    return redirect('/dashboard');
})->name('license.check');
