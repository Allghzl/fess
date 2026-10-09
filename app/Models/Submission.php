<?php

namespace App\Models;

use App\Support\SubmissionStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Submission extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'class_id',
        'public_id',
        'original_message',
        'moderated_message',
        'target_text',
        'alias_text',
        'category',
        'song_text',
        'artist_text',
        'song_start_seconds',
        'music_provider',
        'music_track_id',
        'music_artwork_url',
        'music_artwork_path',
        'music_track_url',
        'music_track_duration_ms',
        'music_start_ms',
        'music_duration_ms',
        'music_license',
        'music_license_url',
        'music_attribution_text',
        'music_attribution_required',
        'status',
        'rejection_reason',
        'internal_note',
        'approved_at',
        'approved_by',
        'rejected_at',
        'rejected_by',
        'posted_at',
    ];

    protected function casts(): array
    {
        return [
            'status'                     => SubmissionStatus::class,
            'song_start_seconds'         => 'integer',
            'music_start_ms'             => 'integer',
            'music_duration_ms'          => 'integer',
            'music_track_duration_ms'    => 'integer',
            'music_attribution_required' => 'boolean',
            'approved_at'                => 'datetime',
            'rejected_at'                => 'datetime',
            'posted_at'                  => 'datetime',
        ];
    }

    public function classWorkspace(): BelongsTo
    {
        return $this->belongsTo(ClassWorkspace::class, 'class_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function takedownRequests(): HasMany
    {
        return $this->hasMany(TakedownRequest::class, 'submission_id');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(SubmissionRead::class, 'submission_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'submission_tag');
    }

    public function markReadBy(User $user): void
    {
        SubmissionRead::firstOrCreate(
            ['submission_id' => $this->id, 'user_id' => $user->id],
            ['read_at' => now()]
        );
    }

    public function isReadBy(User $user): bool
    {
        return $this->reads()->where('user_id', $user->id)->exists();
    }
}
