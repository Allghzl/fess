<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Support\MemberRole;

class ClassWorkspace extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'classes';

    protected $fillable = [
        'name',
        'slug',
        'short_code',
        'instagram_handle',
        'logo_asset_key',
        'website_label',
        'is_active',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings'  => 'array',
        ];
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'class_user', 'class_id', 'user_id')
            ->withPivot('role');
    }

    public function admins(): BelongsToMany
    {
        return $this->members()->wherePivotIn('role', ['owner', 'admin']);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class, 'class_id');
    }

    public function designs(): HasMany
    {
        return $this->hasMany(ClassDesign::class, 'class_id');
    }

    public function takedownRequests(): HasMany
    {
        return $this->hasMany(TakedownRequest::class, 'class_id');
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(ClassInvitation::class, 'class_id');
    }

    public function joinRequests(): HasMany
    {
        return $this->hasMany(ClassJoinRequest::class, 'class_id');
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class, 'class_id');
    }

    public function isOwner(User $user): bool
    {
        return $this->members()
            ->wherePivot('user_id', $user->id)
            ->wherePivot('role', MemberRole::Owner->value)
            ->exists();
    }

    public function isMember(User $user): bool
    {
        return $this->members()
            ->wherePivot('user_id', $user->id)
            ->exists();
    }
}
