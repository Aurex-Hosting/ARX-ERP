<?php

use Illuminate\Support\Facades\Route;
use App\Livewire\TwoFactorChallenge;

Route::get('/', function () {
    return redirect('/admin');
});

Route::get('/login', function () {
    return redirect('/admin/login');
})->name('login');

Route::get('/two-factor-challenge', TwoFactorChallenge::class)->name('two-factor.challenge')->middleware(['web']);





Route::get('/license-error', function () {
    return view('errors.license');
})->name('license.error');
