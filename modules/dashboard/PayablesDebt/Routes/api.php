<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Dashboard\PayablesDebt\Http\Controllers\CurrencyExchangeController;
use Modules\Dashboard\PayablesDebt\Http\Controllers\DocumentVaultController;
use Modules\Dashboard\PayablesDebt\Http\Controllers\InstallmentController;
use Modules\Dashboard\PayablesDebt\Http\Controllers\NotificationConfigController;
use Modules\Dashboard\PayablesDebt\Http\Controllers\PayableController;

Route::prefix('payables-debt')->group(function (): void {

    // Dashboard summary
    Route::get('/summary', [PayableController::class, 'summary'])->name('api.payables-debt.summary');

    // Calendar & Upcoming
    Route::get('/calendar/events', [InstallmentController::class, 'calendarEvents'])->name('api.payables-debt.installments.calendar-events');
    Route::get('/calendar/upcoming', [InstallmentController::class, 'upcoming'])->name('api.payables-debt.installments.upcoming');

    // Installment actions
    Route::post('/installments/{installment}/mark-paid', [InstallmentController::class, 'markPaid'])->name('api.payables-debt.installments.mark-paid');

    // Document actions
    Route::post('/documents/{document}/replace', [DocumentVaultController::class, 'replace'])->name('api.payables-debt.documents.replace');
    Route::get('/documents/{document}/stream', [DocumentVaultController::class, 'stream'])->name('api.payables-debt.documents.stream');

    // Currency Exchange
    Route::get('/currency/rates', [CurrencyExchangeController::class, 'rates'])->name('api.payables-debt.currency.rates');
    Route::post('/currency/convert', [CurrencyExchangeController::class, 'convert'])->name('api.payables-debt.currency.convert');
    Route::post('/currency/refresh', [CurrencyExchangeController::class, 'refresh'])->name('api.payables-debt.currency.refresh');
    Route::get('/currency/supported', [CurrencyExchangeController::class, 'supportedCurrencies'])->name('api.payables-debt.currency.supported');

    // Notification Configuration & Overview Widget
    Route::get('/notifications/config', [NotificationConfigController::class, 'show'])->name('api.payables-debt.notifications.show');
    Route::put('/notifications/config', [NotificationConfigController::class, 'update'])->name('api.payables-debt.notifications.update');
    Route::get('/notifications/preview-recipients', [NotificationConfigController::class, 'previewRecipients'])->name('api.payables-debt.notifications.preview');
    Route::get('/widget-config', [NotificationConfigController::class, 'widgetConfig'])->name('api.payables-debt.widget-config');

    // Payables Collection CRUD
    Route::get('/', [PayableController::class, 'index'])->name('api.payables-debt.index');
    Route::post('/', [PayableController::class, 'store'])->name('api.payables-debt.store');

    // Payable Specific Operations
    Route::get('/{payable}', [PayableController::class, 'show'])->name('api.payables-debt.show')->whereNumber('payable');
    Route::put('/{payable}', [PayableController::class, 'update'])->name('api.payables-debt.update')->whereNumber('payable');
    Route::post('/{payable}/cancel', [PayableController::class, 'cancel'])->name('api.payables-debt.cancel')->whereNumber('payable');
    Route::delete('/{payable}', [PayableController::class, 'destroy'])->name('api.payables-debt.destroy')->whereNumber('payable');

    // Payable Sub-resources
    Route::get('/{payable}/installments', [InstallmentController::class, 'index'])->name('api.payables-debt.installments.index')->whereNumber('payable');
    Route::get('/{payable}/documents', [DocumentVaultController::class, 'index'])->name('api.payables-debt.documents.index')->whereNumber('payable');
    Route::post('/{payable}/documents', [DocumentVaultController::class, 'upload'])->name('api.payables-debt.documents.upload')->whereNumber('payable');
    Route::get('/{payable}/documents/suggest-filename', [DocumentVaultController::class, 'suggestFilename'])->name('api.payables-debt.documents.suggest-filename')->whereNumber('payable');
});
