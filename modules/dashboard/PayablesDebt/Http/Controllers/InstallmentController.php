<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableAuditLog;
use Modules\Dashboard\PayablesDebt\Models\PayableDocument;
use Modules\Dashboard\PayablesDebt\Models\PayableInstallment;
use Modules\Dashboard\PayablesDebt\Services\LoanCalculationEngine;

class InstallmentController extends Controller
{
    use AuthorizesRequests;

    /**
     * List installments for a payable.
     */
    public function index(Payable $payable): JsonResponse
    {
        $this->authorize('liabilities.view');

        $installments = $payable->installments()
            ->with('proofDocument')
            ->orderBy('installment_number')
            ->get();

        if ($installments->isEmpty()) {
            if ($payable->type === 'loan') {
                app(LoanCalculationEngine::class)->generateSchedule($payable);
            } else {
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

            $installments = $payable->installments()
                ->with('proofDocument')
                ->orderBy('installment_number')
                ->get();
        }

        return response()->json(['data' => $installments]);
    }

    /**
     * Mark an installment as paid (requires proof document).
     */
    public function markPaid(Request $request, PayableInstallment $installment): JsonResponse
    {
        $this->authorize('liabilities.status.update');

        // Enforce mandatory proof document
        $proofDocumentId = $request->input('proof_document_id');

        if (! $proofDocumentId) {
            // Check if there's already an active document linked to this installment
            $existingProof = PayableDocument::where('installment_id', $installment->id)
                ->where('is_active', true)
                ->first();

            if (! $existingProof) {
                return response()->json([
                    'message' => 'Payment proof document is strictly mandatory to mark this item as Paid.',
                ], 422);
            }

            $proofDocumentId = $existingProof->id;
        } else {
            // Verify the document exists and belongs to this payable
            $document = PayableDocument::where('id', $proofDocumentId)
                ->where('payable_id', $installment->payable_id)
                ->where('is_active', true)
                ->first();

            if (! $document) {
                return response()->json([
                    'message' => 'The specified proof document does not exist or is not active.',
                ], 422);
            }
        }

        $installment->update([
            'status' => 'paid',
            'paid_at' => now(),
            'proof_document_id' => $proofDocumentId,
        ]);

        // Update parent payable's amount_paid
        $payable = $installment->payable;
        $totalPaid = $payable->installments()
            ->where('status', 'paid')
            ->sum('total_due');

        $payable->update(['amount_paid' => $totalPaid]);

        // If all installments are paid, mark payable as paid
        $allPaid = $payable->installments()
            ->where('status', '!=', 'paid')
            ->where('status', '!=', 'cancelled')
            ->doesntExist();

        if ($allPaid) {
            $payable->update(['status' => 'paid']);
        }

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'marked_paid',
            'description' => "Marked installment #{$installment->installment_number} as paid for: {$payable->title}",
            'ip_address' => $request->ip(),
            'new_values' => ['installment_id' => $installment->id, 'proof_document_id' => $proofDocumentId],
        ]);

        return response()->json([
            'message' => 'Installment marked as paid.',
            'data' => $installment->fresh()->load('proofDocument'),
        ]);
    }

    /**
     * Get upcoming installments across all payables (for calendar/dashboard).
     */
    public function upcoming(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        $days = $request->integer('days', 30);

        $installments = PayableInstallment::with('payable')
            ->whereIn('status', ['scheduled', 'due_soon'])
            ->where('due_date', '<=', now()->addDays($days))
            ->orderBy('due_date')
            ->limit(50)
            ->get();

        return response()->json(['data' => $installments]);
    }

    /**
     * Get all calendar payment events with flexible filtering (month, year, timing).
     * Includes both upcoming and passed payment dates.
     */
    public function calendarEvents(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        $query = PayableInstallment::with(['payable', 'proofDocument']);

        if ($request->filled('year')) {
            $year = $request->integer('year');
            $query->whereYear('due_date', $year);

            if ($request->filled('month')) {
                $month = $request->integer('month');
                $query->whereMonth('due_date', $month);
            }
        } elseif ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('due_date', [$request->input('from'), $request->input('to')]);
        }

        if ($request->filled('type')) {
            $type = $request->input('type');
            $query->whereHas('payable', function ($q) use ($type) {
                $q->where('type', $type);
            });
        }

        if ($request->filled('status')) {
            $status = $request->input('status');
            $query->where('status', $status);
        }

        $today = now()->startOfDay();

        $installments = $query->orderBy('due_date', 'asc')->get();

        $formatted = $installments->map(function ($inst) use ($today) {
            $dueDate = $inst->due_date ? $inst->due_date->copy()->startOfDay() : null;
            $diffDays = $dueDate ? (int) $today->diffInDays($dueDate, false) : 0;
            $isPast = $dueDate ? $dueDate->lt($today) : false;
            $isToday = $dueDate ? $dueDate->eq($today) : false;

            $timing = $isToday ? 'today' : ($isPast ? 'passed' : 'upcoming');

            return [
                'id' => $inst->id,
                'payable_id' => $inst->payable_id,
                'installment_number' => $inst->installment_number,
                'due_date' => $inst->due_date?->toDateString(),
                'base_amount' => (float) $inst->base_amount,
                'interest_amount' => (float) $inst->interest_amount,
                'penalty_amount' => (float) $inst->penalty_amount,
                'total_due' => (float) $inst->total_due,
                'status' => $inst->status,
                'timing' => $timing,
                'is_passed' => $isPast,
                'is_today' => $isToday,
                'days_diff' => $diffDays,
                'paid_at' => $inst->paid_at?->toIso8601String(),
                'proof_document_id' => $inst->proof_document_id,
                'proof_document' => $inst->proofDocument ? [
                    'id' => $inst->proofDocument->id,
                    'file_name' => $inst->proofDocument->file_name,
                    'document_type' => $inst->proofDocument->document_type,
                    'file_size' => $inst->proofDocument->file_size,
                ] : null,
                'payable' => $inst->payable ? [
                    'id' => $inst->payable->id,
                    'title' => $inst->payable->title,
                    'type' => $inst->payable->type,
                    'loan_type' => $inst->payable->loan_type,
                    'vendor_name' => $inst->payable->vendor_name,
                    'category' => $inst->payable->category,
                    'currency' => $inst->payable->currency,
                    'status' => $inst->payable->status,
                    'reference_no' => $inst->payable->reference_no,
                    'payment_url' => $inst->payable->payment_url,
                    'payment_urls' => $inst->payable->payment_urls,
                ] : null,
            ];
        });

        if ($request->input('timing') === 'upcoming') {
            $formatted = $formatted->filter(fn ($item) => in_array($item['timing'], ['upcoming', 'today']))->values();
        } elseif ($request->input('timing') === 'passed') {
            $formatted = $formatted->filter(fn ($item) => $item['timing'] === 'passed')->values();
        }

        return response()->json([
            'data' => $formatted,
            'meta' => [
                'total_count' => $formatted->count(),
                'upcoming_count' => $formatted->where('timing', 'upcoming')->count(),
                'today_count' => $formatted->where('timing', 'today')->count(),
                'passed_count' => $formatted->where('timing', 'passed')->count(),
                'overdue_count' => $formatted->where('status', 'overdue')->count(),
                'paid_count' => $formatted->where('status', 'paid')->count(),
            ],
        ]);
    }
}
