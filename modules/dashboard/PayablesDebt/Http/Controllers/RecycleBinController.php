<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableAuditLog;
use Modules\Dashboard\PayablesDebt\Models\PayableDocument;
use Modules\Dashboard\PayablesDebt\Models\PayableInstallment;

class RecycleBinController extends Controller
{
    use AuthorizesRequests;

    public const RETENTION_DAYS = 14;

    /**
     * List all items in the recycle bin.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('liabilities.view');

        // Automatically prune any items older than 14 days
        self::pruneExpired();

        $payables = Payable::onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(function (Payable $payable): array {
                $daysRemaining = self::calculateDaysRemaining($payable->deleted_at);

                return [
                    'id' => $payable->id,
                    'item_type' => 'payable',
                    'type' => $payable->type,
                    'title' => $payable->title,
                    'vendor_name' => $payable->vendor_name,
                    'category' => $payable->category,
                    'currency' => $payable->currency,
                    'total_amount' => $payable->total_amount,
                    'amount_paid' => $payable->amount_paid,
                    'deleted_at' => $payable->deleted_at?->toIso8601String(),
                    'days_remaining' => $daysRemaining,
                ];
            });

        $documents = PayableDocument::onlyTrashed()
            ->with(['payable' => fn ($q) => $q->withTrashed()])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(function (PayableDocument $doc): array {
                $daysRemaining = self::calculateDaysRemaining($doc->deleted_at);

                return [
                    'id' => $doc->id,
                    'item_type' => 'document',
                    'payable_id' => $doc->payable_id,
                    'installment_id' => $doc->installment_id,
                    'original_filename' => $doc->original_filename,
                    'stored_filename' => $doc->stored_filename,
                    'file_size' => $doc->file_size,
                    'document_type' => $doc->document_type,
                    'deleted_at' => $doc->deleted_at?->toIso8601String(),
                    'days_remaining' => $daysRemaining,
                    'payable' => $doc->payable ? [
                        'id' => $doc->payable->id,
                        'title' => $doc->payable->title,
                        'vendor_name' => $doc->payable->vendor_name,
                        'type' => $doc->payable->type,
                    ] : null,
                ];
            });

        $installments = PayableInstallment::onlyTrashed()
            ->with(['payable' => fn ($q) => $q->withTrashed(), 'proofDocument' => fn ($q) => $q->withTrashed()])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(function (PayableInstallment $inst): array {
                $daysRemaining = self::calculateDaysRemaining($inst->deleted_at);

                return [
                    'id' => $inst->id,
                    'item_type' => 'installment',
                    'payable_id' => $inst->payable_id,
                    'installment_number' => $inst->installment_number,
                    'due_date' => $inst->due_date?->toDateString(),
                    'total_due' => $inst->total_due,
                    'status' => $inst->status,
                    'paid_at' => $inst->paid_at?->toIso8601String(),
                    'deleted_at' => $inst->deleted_at?->toIso8601String(),
                    'days_remaining' => $daysRemaining,
                    'payable' => $inst->payable ? [
                        'id' => $inst->payable->id,
                        'title' => $inst->payable->title,
                        'vendor_name' => $inst->payable->vendor_name,
                        'type' => $inst->payable->type,
                    ] : null,
                ];
            });

        $totalCount = $payables->count() + $documents->count() + $installments->count();

        return response()->json([
            'data' => [
                'payables' => $payables,
                'documents' => $documents,
                'installments' => $installments,
            ],
            'meta' => [
                'total_count' => $totalCount,
                'payables_count' => $payables->count(),
                'documents_count' => $documents->count(),
                'installments_count' => $installments->count(),
                'retention_days' => self::RETENTION_DAYS,
            ],
        ]);
    }

    /**
     * Restore a soft-deleted payable.
     */
    public function restorePayable(Request $request, int $id): JsonResponse
    {
        $this->authorize('liabilities.service.delete');

        $payable = Payable::onlyTrashed()->findOrFail($id);
        $payable->restore();

        // Also restore linked installments if they were deleted at the same time
        $payable->installments()->onlyTrashed()->restore();
        $payable->documents()->onlyTrashed()->restore();

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'service_restored',
            'description' => "Restored payable from recycle bin: {$payable->title}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => "'{$payable->title}' has been restored successfully.",
        ]);
    }

    /**
     * Permanently delete a payable.
     */
    public function forceDeletePayable(Request $request, int $id): JsonResponse
    {
        $this->authorize('liabilities.service.delete');

        $payable = Payable::onlyTrashed()->findOrFail($id);
        $title = $payable->title;

        // Permanently delete linked documents from storage
        $documents = $payable->documents()->withTrashed()->get();
        foreach ($documents as $doc) {
            Storage::disk('local')->delete($doc->file_path);
            $doc->forceDelete();
        }

        $payable->installments()->withTrashed()->forceDelete();

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'service_permanently_deleted',
            'description' => "Permanently purged from recycle bin: {$title}",
            'ip_address' => $request->ip(),
        ]);

        $payable->forceDelete();

        return response()->json([
            'message' => "'{$title}' permanently deleted.",
        ]);
    }

    /**
     * Restore a soft-deleted document/receipt.
     */
    public function restoreDocument(Request $request, int $id): JsonResponse
    {
        $this->authorize('liabilities.doc.upload');

        $document = PayableDocument::onlyTrashed()->findOrFail($id);
        $document->restore();

        // If parent payable was trashed, restore it too
        if ($document->payable()->onlyTrashed()->exists()) {
            $document->payable()->restore();
        }

        PayableAuditLog::create([
            'payable_id' => $document->payable_id,
            'user_id' => $request->user()->id,
            'action' => 'document_restored',
            'description' => "Restored document from recycle bin: {$document->stored_filename}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => "Receipt '{$document->original_filename}' restored successfully.",
        ]);
    }

    /**
     * Permanently delete a document/receipt.
     */
    public function forceDeleteDocument(Request $request, int $id): JsonResponse
    {
        $this->authorize('liabilities.doc.upload');

        $document = PayableDocument::onlyTrashed()->findOrFail($id);
        $filename = $document->original_filename;
        $payableId = $document->payable_id;

        Storage::disk('local')->delete($document->file_path);
        $document->forceDelete();

        PayableAuditLog::create([
            'payable_id' => $payableId,
            'user_id' => $request->user()->id,
            'action' => 'document_permanently_deleted',
            'description' => "Permanently purged document: {$filename}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => "Receipt '{$filename}' permanently deleted.",
        ]);
    }

    /**
     * Restore a soft-deleted installment record.
     */
    public function restoreInstallment(Request $request, int $id): JsonResponse
    {
        $this->authorize('liabilities.status.update');

        $installment = PayableInstallment::onlyTrashed()->findOrFail($id);
        $installment->restore();

        if ($installment->payable()->onlyTrashed()->exists()) {
            $installment->payable()->restore();
        }

        PayableAuditLog::create([
            'payable_id' => $installment->payable_id,
            'user_id' => $request->user()->id,
            'action' => 'installment_restored',
            'description' => "Restored installment #{$installment->installment_number} from recycle bin.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => "Installment #{$installment->installment_number} restored successfully.",
        ]);
    }

    /**
     * Permanently delete an installment record.
     */
    public function forceDeleteInstallment(Request $request, int $id): JsonResponse
    {
        $this->authorize('liabilities.status.update');

        $installment = PayableInstallment::onlyTrashed()->findOrFail($id);
        $num = $installment->installment_number;
        $payableId = $installment->payable_id;

        $installment->forceDelete();

        PayableAuditLog::create([
            'payable_id' => $payableId,
            'user_id' => $request->user()->id,
            'action' => 'installment_permanently_deleted',
            'description' => "Permanently purged installment #{$num}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => "Installment #{$num} permanently deleted.",
        ]);
    }

    /**
     * Empty entire recycle bin (permanently delete all trashed items).
     */
    public function emptyBin(Request $request): JsonResponse
    {
        $this->authorize('liabilities.service.delete');

        $deletedDocsCount = 0;
        $documents = PayableDocument::onlyTrashed()->get();
        foreach ($documents as $doc) {
            Storage::disk('local')->delete($doc->file_path);
            $doc->forceDelete();
            $deletedDocsCount++;
        }

        $installmentsCount = PayableInstallment::onlyTrashed()->forceDelete();
        $payablesCount = Payable::onlyTrashed()->forceDelete();

        return response()->json([
            'message' => "Recycle bin emptied successfully ({$payablesCount} payables, {$deletedDocsCount} documents, {$installmentsCount} installments purged).",
        ]);
    }

    /**
     * Prune records that have been in the recycle bin for more than 14 days.
     */
    public static function pruneExpired(): int
    {
        $cutoff = Carbon::now()->subDays(self::RETENTION_DAYS);
        $totalPruned = 0;

        // Prune expired documents and their files
        $expiredDocs = PayableDocument::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->get();

        foreach ($expiredDocs as $doc) {
            Storage::disk('local')->delete($doc->file_path);
            $doc->forceDelete();
            $totalPruned++;
        }

        // Prune expired installments
        $totalPruned += PayableInstallment::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->forceDelete();

        // Prune expired payables
        $totalPruned += Payable::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->forceDelete();

        return $totalPruned;
    }

    /**
     * Calculate days remaining out of 14 days.
     */
    protected static function calculateDaysRemaining(?Carbon $deletedAt): int
    {
        if (! $deletedAt) {
            return self::RETENTION_DAYS;
        }

        $daysElapsed = (int) $deletedAt->diffInDays(Carbon::now());
        $remaining = self::RETENTION_DAYS - $daysElapsed;

        return max(0, $remaining);
    }
}
