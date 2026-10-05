<?php

namespace App\Models;

use App\Support\MemberRole;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassInvitation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'class_id',
        'created_by',
        'code_hash',
        'code_hint',
        'expires_at',
        'max_uses',
        'claimed_count',
        'requires_approval',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at'        => 'datetime',
            'revoked_at'        => 'datetime',
            'requires_approval' => 'boolean',
            'max_uses'          => 'integer',
            'claimed_count'     => 'integer',
        ];
    }

    public function classWorkspace(): BelongsTo
    {
        return $this->belongsTo(ClassWorkspace::class, 'class_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function joinRequests(): HasMany
    {
        return $this->hasMany(ClassJoinRequest::class, 'invitation_id');
    }

    public function isValid(): bool
    {
        if ($this->revoked_at !== null) {
            return false;
        }
        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return false;
        }
        if ($this->max_uses !== null && $this->claimed_count >= $this->max_uses) {
            return false;
        }
        return true;
    }
}
