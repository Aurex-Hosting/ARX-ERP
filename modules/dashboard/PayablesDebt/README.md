# Payables & Debt Module (Liabilities & Recurring Payment Tracker)

A production-grade liabilities, recurring payments, and loan management module built specifically for **ARX-ERP**.

---

## Features Overview

1. **Invoices (One-Off & Flexible Recurring):**
   - Support for both standalone and recurring vendor invoices.
   - Arbitrary interval scheduler: day(s), month(s), year(s) (e.g., every 14 days, every 6 months, every 2 years).
   - Pre-generation window for creating scheduled bills in advance.

2. **Subscriptions:**
   - Provider details, plan/tier tracking, and cancellation notice windows.
   - Manual proof verification strictly enforced on every billing cycle.

3. **Loan Financing (2 Dedicated Modes):**
   - **Single-Time Loans:** Fixed target pay date with calculated interest (Base Principal + Interest Charge).
   - **Long-Time Amortized Loans:** Flat rate, simple interest, or compounding EMI schedule generation with customizable due day of month, tenure, and grace period.
   - Late penalty calculations: Fixed late fee or daily percentage.

4. **Multi-Currency & Live Rates Stream:**
   - Supported currencies strictly limited to: `USD`, `EUR`, `LKR`, `INR`.
   - Real-time exchange rate stream via jsDelivr CDN endpoint with automatic fallback.

5. **Payment URLs / Online Gateways:**
   - Support for primary checkout URL and multiple labeled payment links (`payment_urls`).
   - "Pay Online" buttons that open payment gateways directly in a new tab (`target="_blank" rel="noopener noreferrer"`).
   - Integrated into liability table rows, calendar day inspector, and settlement modals.

6. **Strict Manual Proof Verification:**
   - **Universal Enforcement:** Invoices, subscriptions, and loans strictly require an official proof document (receipt, wire confirmation, bank deposit slip) to transition to `paid`.
   - Direct status updates without verified documents are rejected with HTTP 422.
   - Built-in document vault with MIME validation and secure streaming.

7. **Interactive Payment Calendar:**
   - Monthly and date-range views highlighting upcoming, passed/overdue, and settled payments.
   - Day inspector modal displaying full financial breakdown, proof view links, and settlement actions.

---

## Directory Structure

```
PayablesDebt/
├── Config/
│   └── payables.php
├── Console/
│   ├── CalculateOverduePenaltiesCommand.php
│   └── ProcessRecurringPayablesCommand.php
├── Database/
│   └── Migrations/
│       ├── 2026_10_01_000001_create_payables_table.php
│       ├── 2026_10_01_000002_create_payable_installments_table.php
│       ├── 2026_10_01_000003_create_payable_documents_table.php
│       ├── 2026_10_01_000004_create_payable_audit_logs_table.php
│       ├── 2026_10_01_000005_create_payable_notification_configs_table.php
│       ├── 2026_10_01_000006_enhance_payables_intervals_and_loan_types.php
│       └── 2026_10_01_000007_add_payment_urls_to_payables_table.php
├── Http/
│   ├── Controllers/
│   │   ├── CurrencyExchangeController.php
│   │   ├── DocumentVaultController.php
│   │   ├── InstallmentController.php
│   │   ├── NotificationConfigController.php
│   │   └── PayableController.php
│   ├── Requests/
│   │   ├── StorePayableRequest.php
│   │   ├── UpdateNotificationConfigRequest.php
│   │   ├── UpdatePayableRequest.php
│   │   └── UploadProofRequest.php
│   └── Resources/
│       ├── DocumentResource.php
│       └── PayableResource.php
├── Models/
│   ├── Payable.php
│   ├── PayableAuditLog.php
│   ├── PayableDocument.php
│   ├── PayableInstallment.php
│   └── PayableNotificationConfig.php
├── Providers/
│   └── PayablesDebtServiceProvider.php
├── Resources/
│   └── assets/
│       └── PayablesDebtPage.tsx
├── Routes/
│   └── api.php
├── Services/
│   ├── CurrencyRateService.php
│   ├── DocumentSecurityService.php
│   ├── LoanCalculationEngine.php
│   ├── NotificationTargetingService.php
│   └── RecurringScheduleGenerator.php
└── module.json
```

---

## Permission Nodes

* `liabilities.view` – View invoices, subscriptions, loans, and the payment calendar.
* `liabilities.create` – Create new liabilities and contracts.
* `liabilities.edit` – Edit non-financial metadata and payment links.
* `liabilities.doc.upload` – Upload payment receipts and bank deposit slips.
* `liabilities.doc.view` – Stream and download stored proof documents.
* `liabilities.status.update` – Settle installments and liabilities (requires proof document).
* `liabilities.service.cancel` – Cancel active subscriptions or recurring billings without data loss.
* `liabilities.service.delete` – Permanently delete records (Admin only).
* `liabilities.notifications.config` – Configure notification triggers and recipients.

---

## Mail Hooks

* `hook_payable_notification` – Triggered when payments are due soon or overdue. Automatically hidden when module is disabled or uninstalled.
