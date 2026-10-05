<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\TakedownRequest;
use App\Services\PublicIdGenerator;
use App\Support\SubmissionStatus;
use App\Support\TakedownStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TakedownFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_takedown_page_loads(): void
    {
        $this->get('/takedown')->assertOk()
             ->assertInertia(fn ($p) => $p->component('Public/Takedown'));
    }

    public function test_valid_public_id_creates_takedown_request(): void
    {
        $submission = Submission::factory()->approved()->create();

        $this->post('/takedown', [
            'public_id'   => $submission->public_id,
            'reason_code' => 'privacy',
            'reason_text' => 'Pesan ini mengandung data pribadi saya tanpa izin.',
        ])->assertRedirect();

        $this->assertDatabaseHas('takedown_requests', [
            'submission_id'      => $submission->id,
            'public_id_snapshot' => $submission->public_id,
            'reason_code'        => 'privacy',
            'status'             => TakedownStatus::Pending->value,
        ]);

        // C2 fix: submission stays approved until admin processes the takedown request.
        // Status must NOT change to takedown_requested on public filing.
        $this->assertDatabaseHas('submissions', [
            'id'     => $submission->id,
            'status' => SubmissionStatus::Approved->value,
        ]);
    }

    public function test_lowercase_no_hyphen_input_normalizes(): void
    {
        $generator  = app(PublicIdGenerator::class);
        $prefix     = strtoupper(env('PUBLIC_ID_PREFIX', 'MF'));

        $submission = Submission::factory()->approved()->create();
        // public_id is like "MF-K7X4QM", strip hyphen and lowercase
        $rawInput = strtolower(str_replace('-', '', $submission->public_id));

        $this->post('/takedown', [
            'public_id'   => $rawInput,
            'reason_code' => 'other',
            'reason_text' => 'Testing normalisasi ID tanpa tanda hubung.',
        ])->assertRedirect();

        $this->assertDatabaseHas('takedown_requests', [
            'public_id_snapshot' => $submission->public_id,
        ]);
    }

    public function test_invalid_public_id_returns_generic_error(): void
    {
        $response = $this->post('/takedown', [
            'public_id'   => 'MF-ZZZZZZ',
            'reason_code' => 'privacy',
            'reason_text' => 'Ini ID yang tidak ada di sistem.',
        ]);

        $response->assertSessionHasErrors(['public_id']);

        // Error must not contain internal info (no UUID, no table names)
        $errors = session('errors');
        $msg    = $errors ? $errors->first('public_id') : '';
        $this->assertStringNotContainsStringIgnoringCase('uuid', $msg);
        $this->assertStringNotContainsStringIgnoringCase('submission', $msg);
    }

    public function test_duplicate_pending_request_handled_gracefully(): void
    {
        $submission = Submission::factory()->approved()->create();

        TakedownRequest::factory()->create([
            'submission_id'      => $submission->id,
            'class_id'           => $submission->class_id,
            'public_id_snapshot' => $submission->public_id,
            'status'             => TakedownStatus::Pending,
        ]);

        $this->post('/takedown', [
            'public_id'   => $submission->public_id,
            'reason_code' => 'harassment',
            'reason_text' => 'Duplicate request — harus ditolak dengan pesan ramah.',
        ])->assertSessionHasErrors(['public_id']);
    }

    public function test_rate_limit_applies(): void
    {
        $payload = [
            'public_id'   => 'MF-ZZZZZZ',
            'reason_code' => 'other',
            'reason_text' => 'Rate limit test submission.',
        ];

        $limit = (int) config('menfess.rate_limit.takedown_per_minute', 3);

        for ($i = 0; $i < $limit; $i++) {
            $this->post('/takedown', $payload);
        }

        $this->post('/takedown', $payload)->assertStatus(429);
    }

    public function test_pending_submission_id_never_resolves(): void
    {
        $submission = Submission::factory()->create([
            'status'    => SubmissionStatus::Submitted,
            'public_id' => null,
        ]);

        // Submitted submissions have no public_id so lookup will fail naturally
        $this->post('/takedown', [
            'public_id'   => 'MF-FAKE99',
            'reason_code' => 'privacy',
            'reason_text' => 'Ini submission pending yang tidak boleh resolve.',
        ])->assertSessionHasErrors(['public_id']);
    }

    public function test_rejected_submission_id_never_resolves(): void
    {
        $submission = Submission::factory()->rejected()->create();

        // Rejected submissions have no public_id → won't be found even if queried
        $this->post('/takedown', [
            'public_id'   => 'MF-FAKE00',
            'reason_code' => 'privacy',
            'reason_text' => 'Ini submission rejected yang tidak boleh resolve.',
        ])->assertSessionHasErrors(['public_id']);
    }
}
