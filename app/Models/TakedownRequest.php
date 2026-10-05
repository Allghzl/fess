<?php

namespace App\Models;

use App\Support\TakedownStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TakedownRequest extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'submission_id',
        'class_id',
        'public_id_snapshot',
        'reason_code',
        'reason_text',
        'contact',
        'evidence_asset_key',
        'status',
        'handled_by',
        'handled_at',
        'admin_note',
    ];

    protected function casts(): array
    {
        return [
            'status'     => TakedownStatus::class,
            'handled_at' => 'datetime',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }

    public function classWorkspace(): BelongsTo
    {
        return $this->belongsTo(ClassWorkspace::class, 'class_id');
    }

    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
