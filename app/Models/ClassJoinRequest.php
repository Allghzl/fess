<?php

namespace App\Models;

use App\Support\JoinRequestStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassJoinRequest extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'class_id',
        'invitation_id',
        'user_id',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'status'      => JoinRequestStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function classWorkspace(): BelongsTo
    {
        return $this->belongsTo(ClassWorkspace::class, 'class_id');
    }

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(ClassInvitation::class, 'invitation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
