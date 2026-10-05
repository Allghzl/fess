<?php

namespace App\Models;

use App\Support\DesignFormat;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassDesign extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'class_id',
        'name',
        'format',
        'slot_index',
        'source_asset_key',
        'source_width',
        'source_height',
        'crop_x',
        'crop_y',
        'crop_width',
        'crop_height',
        'focal_x',
        'focal_y',
        'feed_fallback_crop',
        'active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'format'            => DesignFormat::class,
            'feed_fallback_crop' => 'array',
            'active'            => 'boolean',
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
}
