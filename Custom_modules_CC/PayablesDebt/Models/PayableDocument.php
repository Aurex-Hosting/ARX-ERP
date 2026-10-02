<?php

declare(strict_types=1);

namespace Modules\Dashboard\PayablesDebt\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Securely stored payment proof document.
 *
 * @property int $id
 * @property int $payable_id
 * @property int|null $installment_id
 * @property string $original_filename
 * @property string $stored_filename
 * @property string $file_path
 * @property int $file_size
 * @property string $mime_type
 * @property string $document_type
 * @property int $uploaded_by
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PayableDocument extends Model
{
    protected $table = 'payable_documents';

    protected $fillable = [
        'payable_id',
        'installment_id',
        'original_filename',
        'stored_filename',
        'file_path',
        'file_size',
        'mime_type',
        'document_type',
        'uploaded_by',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'is_active' => 'boolean',
            'installment_id' => 'integer',
            'uploaded_by' => 'integer',
        ];
    }

    /**
     * Get the parent payable.
     */
    public function payable(): BelongsTo
    {
        return $this->belongsTo(Payable::class);
    }

    /**
     * Get the installment this document is proof for.
     */
    public function installment(): BelongsTo
    {
        return $this->belongsTo(PayableInstallment::class, 'installment_id');
    }

    /**
     * Get the user who uploaded this document.
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
