<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Dashboard\PayablesDebt\Models\PayableDocument;

/**
 * API Resource for PayableDocument models.
 *
 * @mixin PayableDocument
 */
class DocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payable_id' => $this->payable_id,
            'installment_id' => $this->installment_id,
            'original_filename' => $this->original_filename,
            'stored_filename' => $this->stored_filename,
            'file_size' => $this->file_size,
            'file_size_human' => $this->humanFileSize(),
            'mime_type' => $this->mime_type,
            'document_type' => $this->document_type,
            'uploaded_by' => $this->uploaded_by,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Convert file size to a human-readable string.
     */
    protected function humanFileSize(): string
    {
        $bytes = $this->file_size;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2).' GB';
        }

        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2).' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2).' KB';
        }

        return $bytes.' bytes';
    }
}
