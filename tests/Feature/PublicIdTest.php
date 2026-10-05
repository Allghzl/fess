<?php

namespace Tests\Feature;

use App\Services\PublicIdGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicIdTest extends TestCase
{
    use RefreshDatabase;

    private PublicIdGenerator $gen;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gen = new PublicIdGenerator();
    }

    public function test_correct_prefix(): void
    {
        $id = $this->gen->generate();
        $this->assertStringStartsWith('MF-', $id);
    }

    public function test_only_allowed_alphabet(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $id      = $this->gen->generate();
            $segment = substr($id, 3); // after "MF-"
            $this->assertMatchesRegularExpression(
                '/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/',
                $segment
            );
        }
    }

    public function test_correct_length(): void
    {
        $id = $this->gen->generate();
        // "MF" + "-" + 6 = 9 chars
        $this->assertEquals(9, strlen($id));
    }

    public function test_uniqueness_check(): void
    {
        $ids = array_map(fn($_) => $this->gen->generate(), range(1, 50));
        $this->assertCount(50, array_unique($ids));
    }

    public function test_collision_retry(): void
    {
        // Stub: pre-fill DB with a specific ID, then generate shouldn't return it
        $used = 'MF-AABBCC';
        \App\Models\Submission::factory()->create(['public_id' => $used]);

        // 50 generations should all avoid the collision
        for ($i = 0; $i < 50; $i++) {
            $id = $this->gen->generate();
            $this->assertNotEquals($used, $id);
        }
    }

    public function test_normalize_lowercase_to_canonical(): void
    {
        $this->assertEquals('MF-K7X4QM', $this->gen->normalize('mf-k7x4qm'));
    }

    public function test_normalize_no_hyphen_accepted(): void
    {
        $this->assertEquals('MF-K7X4QM', $this->gen->normalize('MFK7X4QM'));
    }

    public function test_is_valid(): void
    {
        $this->assertTrue($this->gen->isValid('MF-K7X4QM'));
        $this->assertFalse($this->gen->isValid('MF-K7X4Q')); // too short
        $this->assertFalse($this->gen->isValid('MF-K7X4QM1')); // too long
        $this->assertFalse($this->gen->isValid('MF-K7X4QO')); // O not in alphabet
        $this->assertFalse($this->gen->isValid('MFABCDEF')); // no hyphen
    }
}
