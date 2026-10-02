<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Models\Module;
use App\Core\Services\ModuleManager;
use App\Core\Services\SettingsManager;
use App\Models\User;
use Database\Seeders\CoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableInstallment;
use Tests\TestCase;

class PayablesDebtModuleTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CoreSeeder::class);

        $this->admin = User::where('email', 'admin@arx-erp.local')->first();
        Sanctum::actingAs($this->admin);

        // Install module in test database
        /** @var ModuleManager $moduleManager */
        $moduleManager = app(ModuleManager::class);
        $moduleManager->install('payables-debt');

        // Ensure routes are registered if not loaded during boot
        if (! Route::has('api.payables-debt.index')) {
            Route::middleware(['api', 'auth:sanctum'])
                ->prefix('api/v1')
                ->group(base_path('modules/dashboard/PayablesDebt/Routes/api.php'));
        }
    }

    public function test_can_fetch_summary_and_index(): void
    {
        $summaryRes = $this->getJson('/api/v1/payables-debt/summary');
        $summaryRes->assertOk()
            ->assertJsonStructure([
                'totals' => ['total_count', 'pending_count', 'due_soon_count', 'overdue_count', 'paid_count', 'cancelled_count', 'total_liability', 'total_paid'],
                'by_type',
            ]);

        $indexRes = $this->getJson('/api/v1/payables-debt');
        $indexRes->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);
    }

    public function test_can_create_invoice_payable(): void
    {
        $payload = [
            'title' => 'Server Hosting Annual',
            'type' => 'invoice',
            'vendor_name' => 'Cloud Provider Inc',
            'category' => 'Infrastructure',
            'reference_no' => 'INV-99882',
            'currency' => 'USD',
            'total_amount' => 1200.00,
            'is_recurring' => true,
            'frequency' => 'yearly',
            'start_date' => now()->toDateString(),
            'repeat_indefinitely' => true,
            'pregeneration_days' => 10,
        ];

        $res = $this->postJson('/api/v1/payables-debt', $payload);
        $res->assertStatus(201)
            ->assertJsonPath('data.title', 'Server Hosting Annual')
            ->assertJsonPath('data.type', 'invoice')
            ->assertJsonPath('data.vendor_name', 'Cloud Provider Inc');

        $this->assertDatabaseHas('payables', [
            'title' => 'Server Hosting Annual',
            'type' => 'invoice',
            'vendor_name' => 'Cloud Provider Inc',
        ]);
    }

    public function test_can_create_loan_and_generate_installments(): void
    {
        $payload = [
            'title' => 'Equipment Financing',
            'type' => 'loan',
            'vendor_name' => 'National Bank',
            'category' => 'Financing',
            'currency' => 'USD',
            'total_amount' => 10000.00,
            'principal_amount' => 10000.00,
            'interest_rate' => 5.0,
            'interest_frequency' => 'yearly',
            'calculation_method' => 'compounding',
            'tenure_months' => 12,
            'grace_period_days' => 5,
            'penalty_type' => 'fixed_fee',
            'penalty_rate' => 25.0,
            'payment_day_of_month' => 15,
            'start_date' => now()->toDateString(),
        ];

        $res = $this->postJson('/api/v1/payables-debt', $payload);
        $res->assertStatus(201);

        $payableId = $res->json('data.id');
        $this->assertNotNull($payableId);

        // Verify installments were auto-calculated and created
        $installments = PayableInstallment::where('payable_id', $payableId)->get();
        $this->assertCount(12, $installments);
        $this->assertGreaterThan(0, $installments->first()->total_due);
    }

    public function test_can_upload_payment_proof_and_mark_paid(): void
    {
        Storage::fake('local');

        $payable = Payable::create([
            'title' => 'Office Rent October',
            'type' => 'invoice',
            'vendor_name' => 'Landlord Properties',
            'category' => 'Rent',
            'currency' => 'USD',
            'total_amount' => 2500.00,
            'status' => 'due_soon',
            'created_by' => $this->admin->id,
        ]);

        $installment = PayableInstallment::create([
            'payable_id' => $payable->id,
            'installment_number' => 1,
            'due_date' => now()->addDays(5)->toDateString(),
            'base_amount' => 2500.00,
            'total_due' => 2500.00,
            'status' => 'due_soon',
        ]);

        $proofFile = UploadedFile::fake()->create('wire_transfer_receipt.pdf', 500, 'application/pdf');

        // 1. Upload proof document
        $uploadRes = $this->post("/api/v1/payables-debt/{$payable->id}/documents", [
            'document' => $proofFile,
            'document_type' => 'bank_slip',
            'installment_id' => $installment->id,
        ], ['Accept' => 'application/json']);

        $uploadRes->assertStatus(201);
        $docId = $uploadRes->json('data.id');
        $this->assertNotNull($docId);

        // 2. Mark installment as paid with uploaded proof document ID
        $markPaidRes = $this->postJson("/api/v1/payables-debt/installments/{$installment->id}/mark-paid", [
            'proof_document_id' => $docId,
            'paid_amount' => 2500.00,
        ]);

        $markPaidRes->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('payable_installments', [
            'id' => $installment->id,
            'status' => 'paid',
        ]);

        $this->assertDatabaseHas('payable_documents', [
            'payable_id' => $payable->id,
            'document_type' => 'bank_slip',
        ]);
    }

    public function test_strictly_enforces_mandatory_proof_document_for_all_types(): void
    {
        // 1. Invoice: Cannot mark paid without proof document
        $invoice = Payable::create([
            'title' => 'Supplier Invoice #101',
            'type' => 'invoice',
            'vendor_name' => 'Supplier Corp',
            'currency' => 'USD',
            'total_amount' => 500.00,
            'status' => 'pending',
            'created_by' => $this->admin->id,
        ]);
        $invInstallment = PayableInstallment::create([
            'payable_id' => $invoice->id,
            'installment_number' => 1,
            'due_date' => now()->toDateString(),
            'base_amount' => 500.00,
            'total_due' => 500.00,
            'status' => 'scheduled',
        ]);

        $failInvoice = $this->postJson("/api/v1/payables-debt/installments/{$invInstallment->id}/mark-paid", []);
        $failInvoice->assertStatus(422)
            ->assertJsonPath('message', 'Payment proof document is strictly mandatory to mark this item as Paid.');

        // 2. Loan: Cannot mark paid without proof document
        $loan = Payable::create([
            'title' => 'Working Capital Loan',
            'type' => 'loan',
            'loan_type' => 'single_time',
            'vendor_name' => 'Credit Union',
            'currency' => 'USD',
            'total_amount' => 1000.00,
            'status' => 'pending',
            'created_by' => $this->admin->id,
        ]);
        $loanInstallment = PayableInstallment::create([
            'payable_id' => $loan->id,
            'installment_number' => 1,
            'due_date' => now()->toDateString(),
            'base_amount' => 1000.00,
            'total_due' => 1000.00,
            'status' => 'scheduled',
        ]);

        $failLoan = $this->postJson("/api/v1/payables-debt/installments/{$loanInstallment->id}/mark-paid", []);
        $failLoan->assertStatus(422)
            ->assertJsonPath('message', 'Payment proof document is strictly mandatory to mark this item as Paid.');
    }

    public function test_can_create_payable_with_payment_urls_and_retrieve_them(): void
    {
        $payload = [
            'title' => 'Hosting Provider Subscription',
            'type' => 'subscription',
            'vendor_name' => 'Digital Ocean',
            'category' => 'Cloud',
            'currency' => 'USD',
            'total_amount' => 150.00,
            'plan_tier' => 'Standard Droplets',
            'start_date' => now()->toDateString(),
            'payment_url' => 'https://cloud.digitalocean.com/billing/pay',
            'payment_urls' => [
                ['label' => 'Primary Portal', 'url' => 'https://cloud.digitalocean.com/billing/pay'],
                ['label' => 'PayPal Backup', 'url' => 'https://www.paypal.com/invoice/p/#12345'],
            ],
        ];

        $res = $this->postJson('/api/v1/payables-debt', $payload);
        $res->assertStatus(201)
            ->assertJsonPath('data.payment_url', 'https://cloud.digitalocean.com/billing/pay')
            ->assertJsonCount(2, 'data.payment_urls');

        $this->assertDatabaseHas('payables', [
            'title' => 'Hosting Provider Subscription',
            'payment_url' => 'https://cloud.digitalocean.com/billing/pay',
        ]);

        // Verify calendar events include payment_url
        $eventsRes = $this->getJson('/api/v1/payables-debt/calendar/events?year='.now()->year);
        $eventsRes->assertOk();
        $event = collect($eventsRes->json('data'))->firstWhere('payable.title', 'Hosting Provider Subscription');
        $this->assertNotNull($event);
        $this->assertEquals('https://cloud.digitalocean.com/billing/pay', $event['payable']['payment_url']);
    }

    public function test_disabled_module_hides_permissions_and_mail_hooks(): void
    {
        // 1. When enabled, permissions should exist in list
        $permsRes = $this->getJson('/api/v1/admin/permissions');
        $permsRes->assertOk();
        $flatPerms = collect($permsRes->json('groups'))->pluck('permissions')->flatten(1)->pluck('name');
        $this->assertTrue($flatPerms->contains('liabilities.view'));

        // 2. Disable module
        $disableRes = $this->postJson('/api/v1/admin/modules/payables-debt/disable');
        $disableRes->assertOk()->assertJsonPath('module.is_enabled', false);

        // 3. Permissions list should NOT have liabilities.*
        $permsAfterRes = $this->getJson('/api/v1/admin/permissions');
        $permsAfterRes->assertOk();
        $flatPermsAfter = collect($permsAfterRes->json('groups'))->pluck('permissions')->flatten(1)->pluck('name');
        $this->assertFalse($flatPermsAfter->contains('liabilities.view'));

        // 4. Mail hook should NOT appear in getHooks() when disabled
        $mailHooksRes = $this->getJson('/api/v1/admin/mail/hooks');
        $mailHooksRes->assertOk();
        $moduleHooks = $mailHooksRes->json('module_hooks') ?? [];
        $hasPayableHook = collect($moduleHooks)->contains(fn ($h) => ($h['key'] ?? '') === 'hook_payable_notification');
        $this->assertFalse($hasPayableHook);

        // 5. Re-enable module
        $enableRes = $this->postJson('/api/v1/admin/modules/payables-debt/enable');
        $enableRes->assertOk()->assertJsonPath('module.is_enabled', true);

        // 6. Permissions should be visible again
        $permsRestoredRes = $this->getJson('/api/v1/admin/permissions');
        $flatPermsRestored = collect($permsRestoredRes->json('groups'))->pluck('permissions')->flatten(1)->pluck('name');
        $this->assertTrue($flatPermsRestored->contains('liabilities.view'));
    }

    public function test_can_create_single_time_loan_with_calculated_interest(): void
    {
        $targetDate = now()->addDays(30)->toDateString();
        $payload = [
            'title' => 'Bridge Working Capital',
            'type' => 'loan',
            'loan_type' => 'single_time',
            'vendor_name' => 'Apex Financial',
            'category' => 'Short-Term Debt',
            'currency' => 'USD',
            'principal_amount' => 5000.00,
            'total_amount' => 5500.00,
            'interest_rate' => 10.0,
            'target_due_date' => $targetDate,
            'grace_period_days' => 3,
            'penalty_type' => 'fixed_fee',
            'penalty_rate' => 50.0,
            'start_date' => now()->toDateString(),
        ];

        $res = $this->postJson('/api/v1/payables-debt', $payload);
        $res->assertStatus(201)
            ->assertJsonPath('data.loan_type', 'single_time')
            ->assertJsonPath('data.total_amount', '5500.00');

        $payableId = $res->json('data.id');

        // Verify single installment created
        $installments = PayableInstallment::where('payable_id', $payableId)->get();
        $this->assertCount(1, $installments);
        $this->assertEquals(5500.00, (float) $installments->first()->total_due);
        $this->assertEquals($targetDate, $installments->first()->due_date->toDateString());
    }

    public function test_can_create_recurring_payable_with_arbitrary_interval(): void
    {
        $payload = [
            'title' => 'Bi-Weekly Contractor Retainer',
            'type' => 'invoice',
            'vendor_name' => 'Studio Pixel',
            'category' => 'Services',
            'currency' => 'EUR',
            'total_amount' => 800.00,
            'is_recurring' => true,
            'interval_count' => 14,
            'interval_unit' => 'days',
            'start_date' => now()->toDateString(),
            'repeat_indefinitely' => true,
            'pregeneration_days' => 3,
        ];

        $res = $this->postJson('/api/v1/payables-debt', $payload);
        $res->assertStatus(201)
            ->assertJsonPath('data.interval_count', 14)
            ->assertJsonPath('data.interval_unit', 'days');

        $this->assertDatabaseHas('payables', [
            'title' => 'Bi-Weekly Contractor Retainer',
            'interval_count' => 14,
            'interval_unit' => 'days',
            'currency' => 'EUR',
        ]);
    }

    public function test_currency_rates_endpoint_returns_supported_currencies_only(): void
    {
        $res = $this->getJson('/api/v1/payables-debt/currency/rates');
        $res->assertOk()
            ->assertJsonStructure(['base', 'rates' => ['usd', 'eur', 'lkr', 'inr']]);

        $this->assertEquals('USD', $res->json('base'));
        $rates = $res->json('rates');
        $this->assertArrayHasKey('usd', $rates);
        $this->assertArrayHasKey('eur', $rates);
        $this->assertArrayHasKey('lkr', $rates);
        $this->assertArrayHasKey('inr', $rates);
    }

    public function test_can_fetch_calendar_events_with_upcoming_and_passed_dates(): void
    {
        $payable = Payable::create([
            'title' => 'Cloud Provider Invoice',
            'type' => 'invoice',
            'vendor_name' => 'AWS',
            'currency' => 'USD',
            'total_amount' => 300.00,
            'status' => 'pending',
            'created_by' => $this->admin->id,
        ]);

        // 1. Upcoming installment (due in 5 days)
        PayableInstallment::create([
            'payable_id' => $payable->id,
            'installment_number' => 1,
            'due_date' => now()->addDays(5)->toDateString(),
            'base_amount' => 150.00,
            'total_due' => 150.00,
            'status' => 'due_soon',
        ]);

        // 2. Passed installment (due 10 days ago, overdue)
        PayableInstallment::create([
            'payable_id' => $payable->id,
            'installment_number' => 2,
            'due_date' => now()->subDays(10)->toDateString(),
            'base_amount' => 150.00,
            'total_due' => 150.00,
            'status' => 'overdue',
        ]);

        // Request events for current year
        $res = $this->getJson('/api/v1/payables-debt/calendar/events?year='.now()->year);
        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id', 'due_date', 'total_due', 'status', 'timing', 'is_passed', 'payable',
                    ],
                ],
                'meta' => ['total_count', 'upcoming_count', 'passed_count'],
            ]);

        $data = collect($res->json('data'));
        $upcomingItem = $data->firstWhere('timing', 'upcoming');
        $passedItem = $data->firstWhere('timing', 'passed');

        $this->assertNotNull($upcomingItem);
        $this->assertFalse($upcomingItem['is_passed']);

        $this->assertNotNull($passedItem);
        $this->assertTrue($passedItem['is_passed']);
    }

    public function test_smtp_trigger_off_disables_and_locks_email_hook(): void
    {
        $settingsManager = app(SettingsManager::class);

        // 1. When SMTP trigger hook_payable_notification is OFF
        $settingsManager->set('system.mail.module_hooks', json_encode(['hook_payable_notification' => false]), 'system', 'json');

        // Config show() should report mail_hook_enabled = false and enable_email = false
        $showRes = $this->getJson('/api/v1/payables-debt/notifications/config');
        $showRes->assertOk();
        $this->assertFalse($showRes->json('mail_hook_enabled'));
        $this->assertFalse($showRes->json('data.enable_email'));

        // Attempting to update enable_email to true while SMTP trigger is OFF should force enable_email to false
        $updateRes = $this->putJson('/api/v1/payables-debt/notifications/config', [
            'audience_type' => 'all_users',
            'enable_email' => true,
            'enable_in_app' => true,
        ]);
        $updateRes->assertOk();
        $this->assertFalse($updateRes->json('data.enable_email'));
        $this->assertFalse($updateRes->json('mail_hook_enabled'));

        // 2. When SMTP trigger hook_payable_notification is turned ON in Mail Setup
        $settingsManager->set('system.mail.module_hooks', json_encode(['hook_payable_notification' => true]), 'system', 'json');

        $showEnabledRes = $this->getJson('/api/v1/payables-debt/notifications/config');
        $showEnabledRes->assertOk();
        $this->assertTrue($showEnabledRes->json('mail_hook_enabled'));

        // Can now update enable_email to true
        $updateEnabledRes = $this->putJson('/api/v1/payables-debt/notifications/config', [
            'audience_type' => 'all_users',
            'enable_email' => true,
            'enable_in_app' => true,
        ]);
        $updateEnabledRes->assertOk();
        $this->assertTrue($updateEnabledRes->json('data.enable_email'));
    }

    public function test_uninstall_with_delete_data_flag_removes_data_and_permissions(): void
    {
        // Create sample record
        Payable::create([
            'title' => 'To Be Deleted',
            'type' => 'invoice',
            'vendor_name' => 'Temp Vendor',
            'currency' => 'USD',
            'total_amount' => 50.00,
            'status' => 'due_soon',
            'created_by' => $this->admin->id,
        ]);

        $this->assertDatabaseHas('payables', ['title' => 'To Be Deleted']);

        // Uninstall with delete_data = true
        $uninstallRes = $this->deleteJson('/api/v1/admin/modules/payables-debt?delete_data=true');
        $uninstallRes->assertOk();

        // Database table for payables should be dropped or reset
        $this->assertFalse(Schema::hasTable('payables'));

        // Permissions must be completely purged from database
        $this->assertDatabaseMissing('permissions', ['name' => 'liabilities.view']);
    }
}
