<?php

use App\Console\Commands\CleanupRenders;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Clean up render temp dirs every hour
Schedule::command(CleanupRenders::class, ['--older-than=60'])->hourly();

