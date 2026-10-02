<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Dashboard\PayablesDebt\Models\Payable;
use Modules\Dashboard\PayablesDebt\Models\PayableDocument;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Handles intelligent file naming, private vault storage, and authenticated streaming.
 */
class DocumentSecurityService
{
    /**
     * Generate an intelligent, standardized filename for a document upload.
     */
    public function generateSuggestedFilename(Payable $payable, UploadedFile $file, ?string $period = null): string
    {
        $vendor = Str::slug($payable->vendor_name, '_');
        $type = ucfirst($payable->type);
        $reference = $payable->reference_no
            ? Str::slug($payable->reference_no, '-')
            : ($period ?? now()->format('Y-m'));
        $date = now()->format('Ymd');
        $extension = $file->getClientOriginalExtension();

        return "{$vendor}_{$type}_{$reference}_{$date}.{$extension}";
    }

    /**
     * Store a document in the private vault.
     */
    public function storeDocument(
        Payable $payable,
        UploadedFile $file,
        string $documentType,
        int $uploadedBy,
        ?int $installmentId = null,
        ?string $customFilename = null,
    ): PayableDocument {
        $storagePath = config('payables.document_storage_path', 'private/payables');
        $yearMonth = now()->format('Y/m');
        $directory = "{$storagePath}/{$yearMonth}";

        $suggestedName = $customFilename ?? $this->generateSuggestedFilename($payable, $file);
        $storedFilename = $this->ensureUniqueFilename($directory, $suggestedName);

        $fullPath = $file->storeAs($directory, $storedFilename, 'local');

        return PayableDocument::create([
            'payable_id' => $payable->id,
            'installment_id' => $installmentId,
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $storedFilename,
            'file_path' => $fullPath,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'document_type' => $documentType,
            'uploaded_by' => $uploadedBy,
            'is_active' => true,
        ]);
    }

    /**
     * Replace an existing document with a new upload.
     * Archives the old document and returns the new one.
     */
    public function replaceDocument(
        PayableDocument $existingDocument,
        UploadedFile $newFile,
        string $documentType,
        int $uploadedBy,
    ): PayableDocument {
        // Archive the old document
        $existingDocument->update(['is_active' => false]);

        // Store the new document
        return $this->storeDocument(
            $existingDocument->payable,
            $newFile,
            $documentType,
            $uploadedBy,
            $existingDocument->installment_id,
        );
    }

    /**
     * Stream a document file securely via authenticated proxy.
     */
    public function streamDocument(PayableDocument $document): StreamedResponse
    {
        $disk = Storage::disk('local');

        if (! $disk->exists($document->file_path)) {
            abort(404, 'Document file not found in vault.');
        }

        return $disk->response($document->file_path, $document->original_filename, [
            'Content-Type' => $document->mime_type,
            'Content-Disposition' => "inline; filename=\"{$document->original_filename}\"",
        ]);
    }

    /**
     * Ensure a filename is unique within the target directory.
     */
    protected function ensureUniqueFilename(string $directory, string $filename): string
    {
        $disk = Storage::disk('local');
        $name = pathinfo($filename, PATHINFO_FILENAME);
        $extension = pathinfo($filename, PATHINFO_EXTENSION);

        $candidate = $filename;
        $counter = 1;

        while ($disk->exists("{$directory}/{$candidate}")) {
            $candidate = "{$name}_{$counter}.{$extension}";
            $counter++;
        }

        return $candidate;
    }
}
