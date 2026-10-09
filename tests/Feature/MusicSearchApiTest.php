<?php
namespace Tests\Feature;

use App\Models\User;
use App\Music\MusicSearchService;
use App\Music\MusicTrack;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MusicSearchApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): User
    {
        return User::factory()->create();
    }

    public function test_unauthenticated_search_is_allowed(): void
    {
        // H3 fix: music search is public (used by unauthenticated submit form)
        $this->mock(MusicSearchService::class, function ($mock) {
            $mock->shouldReceive('search')
                ->once()
                ->andReturn(['tracks' => [], 'total' => 0, 'hasMore' => false]);
        });

        $response = $this->getJson('/api/music/search?q=test');
        $response->assertOk();
    }

    public function test_query_too_short_returns_422(): void
    {
        $response = $this->getJson('/api/music/search?q=a');
        $response->assertStatus(422);
    }

    public function test_valid_search_returns_tracks(): void
    {
        $user = $this->makeUser();

        $mockTrack = new MusicTrack(
            provider: 'audius', trackId: 'abc', title: 'Midnight City',
            artist: 'M83', album: null, artworkUrl: null, trackUrl: null,
            durationMs: 240000, previewAvailable: true, previewType: 'audio_url',
            previewUrl: 'https://api.audius.co/stream', previewVideoId: null,
            previewStartMs: 0, previewDurationMs: 30000,
            license: null, licenseUrl: null, attributionText: null,
            attributionRequired: false, explicit: null, providerLabel: 'Audius',
        );

        $this->mock(MusicSearchService::class, function ($mock) use ($mockTrack) {
            $mock->shouldReceive('search')
                ->once()
                ->andReturn(['tracks' => [$mockTrack->toArray()], 'total' => 1, 'hasMore' => false]);
        });

        $response = $this->actingAs($user)->getJson('/api/music/search?q=midnight+city');
        $response->assertOk()
            ->assertJsonStructure(['tracks', 'total', 'hasMore'])
            ->assertJsonCount(1, 'tracks');
    }

    public function test_all_providers_failing_still_returns_200(): void
    {
        $user = $this->makeUser();

        $this->mock(MusicSearchService::class, function ($mock) {
            $mock->shouldReceive('search')
                ->once()
                ->andReturn(['tracks' => [], 'total' => 0, 'hasMore' => false]);
        });

        $response = $this->actingAs($user)->getJson('/api/music/search?q=test+query');
        $response->assertOk();
    }

    public function test_limit_bounded_at_20(): void
    {
        $user = $this->makeUser();
        // limit=999 fails validation (max:20), no service call made
        $response = $this->actingAs($user)->getJson('/api/music/search?q=test&limit=999');
        $response->assertStatus(422);
    }
}
