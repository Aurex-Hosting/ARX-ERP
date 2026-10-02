<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Modules\Dashboard\PayablesDebt\Http\Requests\UploadProofRequest;
use Modules\Dashboard\PayablesDebt\Http\Resources\DocumentResource;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableAuditLog;
use Modules\Dashboard\PayablesDebt\Models\PayableDocument;
use Modules\Dashboard\PayablesDebt\Services\DocumentSecurityService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentVaultController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private DocumentSecurityService $documentService,
    ) {}

    /**
     * List all documents for a payable.
     */
    public function index(Payable $payable): JsonResponse
    {
        $this->authorize('liabilities.doc.view');

        $documents = $payable->documents()
            ->where('is_active', true)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => DocumentResource::collection($documents),
        ]);
    }

    /**
     * Upload a new proof document.
     */
    public function upload(UploadProofRequest $request, Payable $payable): JsonResponse
    {
        $document = $this->documentService->storeDocument(
            payable: $payable,
            file: $request->file('document'),
            documentType: $request->input('document_type'),
            uploadedBy: $request->user()->id,
            installmentId: $request->integer('installment_id') ?: null,
            customFilename: $request->input('custom_filename'),
        );

        PayableAuditLog::create([
            'payable_id' => $payable->id,
            'user_id' => $request->user()->id,
            'action' => 'document_uploaded',
            'description' => "Uploaded proof document: {$document->stored_filename}",
            'ip_address' => $request->ip(),
            'new_values' => ['document_id' => $document->id, 'filename' => $document->stored_filename],
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'data' => new DocumentResource($document),
        ], 201);
    }

    /**
     * Generate a suggested filename for the upload dialog.
     */
    public function suggestFilename(Request $request, Payable $payable): JsonResponse
    {
        $this->authorize('liabilities.doc.upload');

        // Create a temporary UploadedFile proxy for filename generation
        $extension = $request->input('extension', 'pdf');
        $period = $request->input('period');

        $vendor = Str::slug($payable->vendor_name, '_');
        $type = ucfirst($payable->type);
        $reference = $payable->reference_no
            ? Str::slug($payable->reference_no, '-')
            : ($period ?? now()->format('Y-m'));
        $date = now()->format('Ymd');

        $suggested = "{$vendor}_{$type}_{$reference}_{$date}.{$extension}";

        return response()->json(['suggested_filename' => $suggested]);
    }

    /**
     * Replace an existing document with a new upload.
     */
    public function replace(UploadProofRequest $request, PayableDocument $document): JsonResponse
    {
        $this->authorize('liabilities.doc.upload');

        $oldFilename = $document->stored_filename;

        $newDocument = $this->documentService->replaceDocument(
            existingDocument: $document,
            newFile: $request->file('document'),
            documentType: $request->input('document_type'),
            uploadedBy: $request->user()->id,
        );

        PayableAuditLog::create([
            'payable_id' => $document->payable_id,
            'user_id' => $request->user()->id,
            'action' => 'document_replaced',
            'description' => "Replaced document '{$oldFilename}' with '{$newDocument->stored_filename}'",
            'ip_address' => $request->ip(),
            'old_values' => ['document_id' => $document->id, 'filename' => $oldFilename],
            'new_values' => ['document_id' => $newDocument->id, 'filename' => $newDocument->stored_filename],
        ]);

        return response()->json([
            'message' => 'Document replaced successfully.',
            'data' => new DocumentResource($newDocument),
        ]);
    }

    /**
     * Stream a document securely via authenticated proxy.
     */
    public function stream(PayableDocument $document): StreamedResponse
    {
        $this->authorize('liabilities.doc.view');

        return $this->documentService->streamDocument($document);
    }
}
