<?php

use App\Http\Controllers\Auth\PinatAuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ClassOverviewController;
use App\Http\Controllers\Admin\SubmissionController;
use App\Http\Controllers\Admin\ApprovedController;
use App\Http\Controllers\Admin\DesignController;
use App\Http\Controllers\Admin\RenderController;
use App\Http\Controllers\Admin\TakedownAdminController;
use App\Http\Controllers\Admin\ClassSettingsController;
use App\Http\Controllers\Admin\TagController;
use App\Http\Controllers\Admin\BaseController;
use App\Http\Controllers\Admin\InvitationController;
use App\Http\Controllers\Admin\MembersController;
use App\Http\Controllers\Public\BaseCodeController;
use App\Http\Controllers\Public\BasePageController;
use App\Http\Controllers\Public\JoinController;
use App\Http\Controllers\Public\TakedownController;
use App\Http\Controllers\Public\MusicController;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

RateLimiter::for('submit', function (Request $request) {
    return Limit::perMinute((int) config('menfess.rate_limit.submit_per_minute', 5))
        ->by($request->ip());
});

RateLimiter::for('takedown', function (Request $request) {
    return Limit::perMinute((int) config('menfess.rate_limit.takedown_per_minute', 3))
        ->by($request->ip());
});

// Landing page — base code input only (no directory)
Route::get('/', function () {
    return \Inertia\Inertia::render('Public/Welcome', [
        'app_name' => config('app.name'),
    ]);
})->name('home');

// Base code resolution
Route::post('/base-lookup', [BaseCodeController::class, 'resolve'])->name('base.lookup');

// Auth routes
Route::get('/auth/login',          [PinatAuthController::class, 'login'])->name('auth.login');
Route::get('/auth/callback',       [PinatAuthController::class, 'callback'])->name('auth.callback');
Route::post('/auth/pinat/session', [PinatAuthController::class, 'session'])->name('auth.pinat.session');
Route::post('/auth/logout',        [PinatAuthController::class, 'logout'])->name('auth.logout');

// Public base pages — /b/{slug}
Route::prefix('b')->name('public.base.')->group(function () {
    Route::get('/{slug}',           [BasePageController::class, 'show'])->name('show');
    Route::get('/{slug}/submit',    [BasePageController::class, 'submitForm'])->name('submit.form');
    Route::post('/{slug}/submit',   [BasePageController::class, 'store'])
        ->middleware('throttle:submit')
        ->name('submit.store');
    Route::get('/{slug}/submitted', [BasePageController::class, 'success'])->name('submit.success');
});

// Keep legacy /c/{slug} redirect for backward compatibility
Route::get('/c/{slug}', function (string $slug) {
    return redirect()->route('public.base.show', ['slug' => $slug], 301);
});

// Global takedown
Route::name('public.takedown.')->group(function () {
    Route::get('/takedown',                         [TakedownController::class, 'show'])->name('show');
    Route::post('/takedown',                        [TakedownController::class, 'store'])
        ->middleware('throttle:takedown')
        ->name('store');
    Route::get('/takedown/success/{public_id}',     [TakedownController::class, 'success'])->name('success');
});

// Music search & stream — public (search/stream used by unauthenticated submit form)
// health endpoint remains auth-only
Route::prefix('api/music')->name('api.music.')->group(function () {
    Route::get('/search',                      [MusicController::class, 'search'])->name('search');
    Route::get('/stream/{provider}/{trackId}', [MusicController::class, 'stream'])->name('stream');
});
Route::middleware('auth')->prefix('api/music')->name('api.music.')->group(function () {
    Route::get('/health', [MusicController::class, 'health'])->name('health');
});

// Join base (public, but auth required to claim)
Route::get('/join',  [JoinController::class, 'show'])->name('join.show');
Route::post('/join', [JoinController::class, 'claim'])->name('join.claim');

// Admin routes (auth required)
Route::middleware('auth')->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Create base
    Route::get('/bases/create',  [BaseController::class, 'create'])->name('bases.create');
    Route::post('/bases',        [BaseController::class, 'store'])->name('bases.store');

    Route::prefix('classes/{class}')->name('classes.')->group(function () {
        Route::get('/', [ClassOverviewController::class, 'index'])->name('overview');

        // Submissions (inbox)
        Route::prefix('submissions')->name('submissions.')->group(function () {
            Route::get('/',                           [SubmissionController::class, 'index'])->name('index');
            Route::get('/{submission}',               [SubmissionController::class, 'show'])->name('show');
            Route::patch('/{submission}',             [SubmissionController::class, 'update'])->name('update');
            Route::post('/{submission}/start-review', [SubmissionController::class, 'startReview'])->name('start-review');
            Route::post('/{submission}/approve',      [SubmissionController::class, 'approve'])->name('approve');
            Route::post('/{submission}/reject',       [SubmissionController::class, 'reject'])->name('reject');
        });

        // Approved
        Route::prefix('approved')->name('approved.')->group(function () {
            Route::get('/',                           [ApprovedController::class, 'index'])->name('index');
            Route::post('/bulk-render',               [RenderController::class, 'bulkRender'])->name('bulk-render');
            Route::get('/{submission}',               [ApprovedController::class, 'show'])->name('show');
            Route::post('/{submission}/mark-posted',  [ApprovedController::class, 'markPosted'])->name('mark-posted');
            Route::post('/{submission}/render',       [RenderController::class, 'render'])->name('render');
            Route::post('/{submission}/preview',      [RenderController::class, 'preview'])->name('preview');
        });

        // Designs
        Route::prefix('designs')->name('designs.')->group(function () {
            Route::get('/',                       [DesignController::class, 'index'])      ->name('index');
            Route::post('/',                      [DesignController::class, 'store'])      ->name('store');
            Route::get('/{design}',               [DesignController::class, 'show'])       ->name('show');
            Route::patch('/{design}',             [DesignController::class, 'update'])     ->name('update');
            Route::delete('/{design}',            [DesignController::class, 'destroy'])    ->name('destroy');
            Route::post('/{design}/derive-feed',  [DesignController::class, 'deriveFeed']) ->name('derive-feed');
        });

        // Takedowns
        Route::prefix('takedowns')->name('takedowns.')->group(function () {
            Route::get('/',                         [TakedownAdminController::class, 'index'])->name('index');
            Route::get('/{takedown}',               [TakedownAdminController::class, 'show'])->name('show');
            Route::post('/{takedown}/start-review', [TakedownAdminController::class, 'startReview'])->name('start-review');
            Route::post('/{takedown}/approve',      [TakedownAdminController::class, 'approve'])->name('approve');
            Route::post('/{takedown}/reject',       [TakedownAdminController::class, 'reject'])->name('reject');
        });

        // Members & Invitations (owner only)
        Route::prefix('members')->name('members.')->group(function () {
            Route::get('/',                                    [MembersController::class, 'index'])->name('index');
            Route::post('/invitations',                        [InvitationController::class, 'store'])->name('invitations.store');
            Route::delete('/invitations/{invitation}/revoke',  [InvitationController::class, 'revoke'])->name('invitations.revoke');
            Route::post('/requests/{joinRequest}/approve',     [MembersController::class, 'approveRequest'])->name('requests.approve');
            Route::post('/requests/{joinRequest}/reject',      [MembersController::class, 'rejectRequest'])->name('requests.reject');
            Route::delete('/admins/{userId}',                  [MembersController::class, 'removeAdmin'])->name('admins.remove');
        });

        // Settings
        Route::get('/settings',              [ClassSettingsController::class, 'index'])->name('settings.index');
        Route::patch('/settings',             [ClassSettingsController::class, 'update'])->name('settings.update');
        Route::post('/settings/preview',      [RenderController::class, 'settingsPreview'])->name('settings.preview');

        // Tags (categories)
        Route::post('/tags',          [TagController::class, 'store'])->name('tags.store');
        Route::delete('/tags/{tag}',  [TagController::class, 'destroy'])->name('tags.destroy');
    });
});
