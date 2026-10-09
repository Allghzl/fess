<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Support\SubmissionStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;

class BasePageController extends Controller
{
    /**
     * Show a public base page.
     *
     * Returns the base's public profile including name, Instagram handle,
     * and website label. Does not expose admin membership or internal IDs.
     * Accessible without authentication.
     *
     * @summary Get Public Base Page
     * @tags Bases
     * @unauthenticated
     */
    public function show(Request $request, string $slug)
    {
        $class = ClassWorkspace::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (!$class) return redirect('/');

        return Inertia::render('Public/BasePage', [
            'base' => [
                'id'               => $class->id,
                'name'             => $class->name,
                'slug'             => $class->slug,
                'short_code'       => $class->short_code,
                'instagram_handle' => $class->instagram_handle,
                'website_label'    => $class->website_label,
                'logo_asset_key'   => $class->logo_asset_key,
            ],
            'tags'      => $class->tags()->orderBy('name')->get(['id', 'name', 'slug']),
            'auth_user' => $request->user() ? ['name' => $request->user()->name] : null,
        ]);
    }

    /**
     * Show the anonymous submission form.
     *
     * Requires PinatAuth authentication. If unauthenticated, redirects to
     * the login page with a return URL. The sender's identity is not stored.
     *
     * @summary Show Submission Form
     * @tags Anonymous Submissions
     */
    public function submitForm(Request $request, string $slug)
    {
        $class = ClassWorkspace::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (!$class) return redirect('/');

        return Inertia::render('Public/SubmitForm', [
            'base' => [
                'id'         => $class->id,
                'name'       => $class->name,
                'slug'       => $class->slug,
                'short_code' => $class->short_code,
            ],
            'tags' => $class->tags()->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    /**
     * Submit an anonymous message to a base.
     *
     * Requires PinatAuth authentication for spam prevention only. The sender's
     * PinatAuth puid, name, and email are NOT stored in the submission row.
     * Rate limited to 5 submissions per hour per account per base (HMAC key,
     * no PII in the rate-limit key).
     *
     * @summary Submit Anonymous Message
     * @tags Anonymous Submissions
     */
    public function store(Request $request, string $slug)
    {
        $class = ClassWorkspace::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (!$class) return redirect('/');

        $data = $request->validate([
            'message'     => 'required|string|min:10|max:2000',
            'target_text' => 'nullable|string|max:120',
            'alias_text'  => 'nullable|string|max:80',
            'category'    => 'nullable|string|max:60',
            'song_text'          => 'nullable|string|max:200',
            'artist_text'        => 'nullable|string|max:120',
            'song_start_seconds' => 'nullable|integer|min:0|max:36000',
            'music_provider'    => 'nullable|string|max:30',
            'music_track_id'    => 'nullable|string|max:100',
            'music_start_ms'    => 'nullable|integer|min:0|max:36000000',
            'music_duration_ms' => 'nullable|integer|min:1000|max:30000',
            'tag_ids'            => 'nullable|array|max:3',
            'tag_ids.*'   => 'string|uuid',
            'internal_note' => 'nullable|string|max:200',
            'honeypot'    => 'prohibited',
            'consent'     => 'accepted',
        ]);

        // Session-based rate limit — no PII, no IP, no login required
        $limitKey   = 'submit:' . hash_hmac('sha256', session()->getId() . ':' . $class->id, config('app.key'));
        $maxPerHour = config('menfess.rate_limit.submit_per_hour', 5);

        if (RateLimiter::tooManyAttempts($limitKey, $maxPerHour)) {
            return back()->withErrors([
                'message' => 'Terlalu banyak kiriman. Coba lagi nanti.',
            ]);
        }

        RateLimiter::hit($limitKey, 3600); // 1 hour window

        // Reject control characters in free-text fields (injection guard)
        foreach (['target_text', 'alias_text', 'category', 'song_text', 'artist_text'] as $field) {
            if (isset($data[$field]) && preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $data[$field])) {
                return back()->withErrors([$field => 'Karakter tidak valid.']);
            }
        }

        // Verify tag_ids belong to this class (cross-base security)
        $tagIds = [];
        if (!empty($data['tag_ids'])) {
            $tagIds = $class->tags()->whereIn('id', $data['tag_ids'])->pluck('id')->toArray();
        }

        // Store submission WITHOUT any user identity
        $submission = $class->submissions()->create([
            'original_message' => $data['message'],
            'target_text'      => $data['target_text'] ?? null,
            'alias_text'       => $data['alias_text'] ?? null,
            'category'         => $data['category'] ?? null,
            'song_text'          => $data['song_text'] ?? null,
            'artist_text'        => $data['artist_text'] ?? null,
            'song_start_seconds' => $data['song_start_seconds'] ?? null,
            'music_provider'    => $data['music_provider']    ?? null,
            'music_track_id'    => $data['music_track_id']    ?? null,
            'music_start_ms'    => $data['music_start_ms']    ?? null,
            'music_duration_ms' => $data['music_duration_ms'] ?? null,
            'internal_note'     => $data['internal_note']     ?? null,
            'status'             => SubmissionStatus::Submitted->value,
        ]);

        if ($tagIds) {
            $submission->tags()->sync($tagIds);
        }

        return redirect()->route('public.base.submit.success', ['slug' => $slug]);
    }

    public function success(string $slug)
    {
        $class = ClassWorkspace::where('slug', $slug)->first();
        if (!$class) return redirect('/');

        return Inertia::render('Public/SubmitSuccess', [
            'base_name' => $class->name,
            'base_slug' => $slug,
        ]);
    }
}
