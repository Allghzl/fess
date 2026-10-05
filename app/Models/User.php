<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'pinat_puid',
        'name',
        'email',
        'avatar_key',
        'last_synced_at',
    ];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'last_synced_at' => 'datetime',
        ];
    }

    // No getAuthPassword — SSO only
    public function getAuthPassword(): string
    {
        return '';
    }

    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(ClassWorkspace::class, 'class_user', 'user_id', 'class_id')
            ->withPivot('role');
    }

    public function isMemberOf(ClassWorkspace $class): bool
    {
        return $this->classes()->where('classes.id', $class->id)->exists();
    }

    public function createdInvitations(): HasMany
    {
        return $this->hasMany(ClassInvitation::class, 'created_by');
    }

    public function joinRequests(): HasMany
    {
        return $this->hasMany(ClassJoinRequest::class, 'user_id');
    }
}
