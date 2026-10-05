<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ClassUser extends Pivot
{
    public $incrementing = false;
    public $timestamps   = false;

    protected $fillable = ['class_id', 'user_id', 'role'];

    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;
}
