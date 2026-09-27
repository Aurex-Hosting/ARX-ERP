<?php

declare(strict_types=1);

namespace App\Core\Models;

use App\Core\Traits\Auditable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model representing an AI Agent tool call awaiting human approval.
 *
 * @property int $id
 * @property int $agent_id
 * @property string $tool_name
 * @property array<string, mixed> $parameters
 * @property string $status
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property string|null $review_notes
 * @property array<string, mixed>|null $execution_result
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PendingApproval extends Model
{
    use Auditable, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'pending_approvals';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'agent_id',
        'tool_name',
        'parameters',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'execution_result',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'parameters' => 'array',
        'execution_result' => 'array',
        'reviewed_at' => 'datetime',
    ];

    /**
     * Get the AI agent user that requested the action.
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    /**
     * Get the human user who approved or rejected the request.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
