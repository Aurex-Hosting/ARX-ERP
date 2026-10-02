<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Dashboard\PayablesDebt\Http\Requests\StorePayableRequest;
use Modules\Dashboard\PayablesDebt\Http\Requests\UpdatePayableRequest;
use Modules\Dashboard\PayablesDebt\Http\Resources\PayableResource;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableAuditLog;
use Modules\Dashboard\PayablesDebt\Services\LoanCalculationEngine;

class PayableController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private LoanCalculationEngine $loanEngine,
    ) {}

    /**
     * List all payables with optional filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        $query = Payable::query();

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('vendor_name')) {
            $query->where('vendor_name', 'like', '%'.$request->input('vendor_name').'%');
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('currency')) {
            $query->where('currency', $request->input('currency'));
        }

        $sortField = $request->input('sort', 'created_at');
        $sortDir = $request->input('direction', 'desc');
        $query->orderBy($sortField, $sortDir);

        $payables = $query->with(['installments', 'documents'])
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => PayableResource::collection($payables),
            'meta' => [
                'current_page' => $payables->currentPage(),
                'last_page' => $payables->lastPage(),
                'per_page' => $payables->perPage(),
                'total' => $payables->total(),
            ],
        ]);
    }

    /**
     * Show a single payable with full details.
     */
    public function show(Payable $payable): JsonResponse
    {
        $this->authorize('liabilities.view');

        $payable->load(['installments', 'documents', 'auditLogs']);

        return response()->json([
            'data' => new PayableResource($payable),
        ]);
    }

    /**
     * Create a new payable (invoice, subscription, or loan).
     */
    public function store(StorePayableRequest $request): JsonResponse
    {
        $payable = Payable::create($request->validated());

        // For loans, auto-generate the installment schedule (single-time or amortized)
        if ($payable->type === 'loan') {
            $this->loanEngine->generateSchedule($payable);
        }

        // For invoices (one-off and recurring), create initial billing installment
        if ($payable->type === 'invoice') {
            $payable->installments()->create([
                'installment_number' => 1,
                'due_date' => $payable->start_date ?? $payable->target_due_date ?? now(),
                'base_amount' => $payable->total_amount,
                'interest_amount' => 0,
                'penalty_amount' => 0,
                'total_due' => $payable->total_amount,
                'status' => 'scheduled',
            ]);
        }

        // For subscriptions, create the initial billing installment for payment proof upload
        if ($payable->type === 'subscription') {
            $payable->installments()->create([
                'installment_number' => 1,
                'due_date' => $payable->start_date ?? now(),
                'base_amount' => $payable->total_amount,
                'interest_amount' => 0,
                'penalty_amount' => 0,
                'total_due' => $payable->total_amount,
                'status' => 'scheduled',
            ]);
        }

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'created',
            'description' => "Created {$payable->type}: {$payable->title}",
            'ip_address' => $request->ip(),
            'new_values' => $payable->toArray(),
        ]);

        $payable->load(['installments']);

        return response()->json([
            'message' => 'Payable created successfully.',
            'data' => new PayableResource($payable),
        ], 201);
    }

    /**
     * Update a payable's non-financial details.
     */
    public function update(UpdatePayableRequest $request, Payable $payable): JsonResponse
    {
        $oldValues = $payable->toArray();
        $payable->update($request->validated());

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'updated',
            'description' => "Updated payable: {$payable->title}",
            'ip_address' => $request->ip(),
            'old_values' => $oldValues,
            'new_values' => $payable->fresh()->toArray(),
        ]);

        return response()->json([
            'message' => 'Payable updated successfully.',
            'data' => new PayableResource($payable->fresh()),
        ]);
    }

    /**
     * Cancel a recurring service or subscription.
     */
    public function cancel(Request $request, Payable $payable): JsonResponse
    {
        $this->authorize('liabilities.service.cancel');

        $oldStatus = $payable->status;
        $payable->update(['status' => 'cancelled']);

        // Cancel all future scheduled installments
        $payable->installments()
            ->whereIn('status', ['scheduled', 'due_soon'])
            ->update(['status' => 'cancelled']);

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'service_cancelled',
            'description' => "Cancelled service: {$payable->title}. Previous status: {$oldStatus}",
            'ip_address' => $request->ip(),
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['status' => 'cancelled'],
        ]);

        return response()->json([
            'message' => 'Service cancelled successfully. Historical records preserved.',
        ]);
    }

    /**
     * Permanently delete a payable (requires liabilities.service.delete).
     */
    public function destroy(Request $request, Payable $payable): JsonResponse
    {
        $this->authorize('liabilities.service.delete');

        $reason = $request->input('reason', 'No reason provided');

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'service_deleted',
            'description' => "Permanently deleted: {$payable->title}. Reason: {$reason}",
            'ip_address' => $request->ip(),
            'old_values' => $payable->toArray(),
        ]);

        $payable->forceDelete();

        return response()->json([
            'message' => 'Payable permanently deleted.',
        ]);
    }

    /**
     * Get summary statistics for the dashboard overview.
     */
    public function summary(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        $totals = Payable::selectRaw('
            COUNT(*) as total_count,
            SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = "due_soon" THEN 1 ELSE 0 END) as due_soon_count,
            SUM(CASE WHEN status = "overdue" THEN 1 ELSE 0 END) as overdue_count,
            SUM(CASE WHEN status = "paid" THEN 1 ELSE 0 END) as paid_count,
            SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled_count,
            SUM(total_amount) as total_liability,
            SUM(amount_paid) as total_paid
        ')->first();

        $byType = Payable::selectRaw('type, COUNT(*) as count, SUM(total_amount) as total_amount')
            ->groupBy('type')
            ->get();

        $upcomingDue = Payable::where('status', 'due_soon')
            ->with('installments')
            ->limit(10)
            ->get();

        return response()->json([
            'totals' => $totals,
            'by_type' => $byType,
            'upcoming_due' => PayableResource::collection($upcomingDue),
        ]);
    }
}
