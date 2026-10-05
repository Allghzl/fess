<?php
namespace Tests\Unit\Music;

use App\Music\MusicSearchService;
use App\Music\MusicTrack;
use App\Music\Providers\AudiusProvider;
use App\Music\Providers\AppleMusicProvider;
use App\Music\Providers\SpotifyProvider;
use App\Music\Providers\YouTubeMusicProvider;
use App\Music\MusicSearchResult;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MusicSearchServiceDedupeTest extends TestCase
{
    private function mockTrack(string $provider, string $title, string $artist, bool $preview = false): MusicTrack
    {
        return new MusicTrack(
            provider: $provider, trackId: $provider . '_' . md5($title . $artist),
            title: $title, artist: $artist, album: null, artworkUrl: null, trackUrl: null,
            durationMs: 200000, previewAvailable: $preview,
            previewType: $preview ? 'youtube_iframe' : null,
            previewUrl: null, previewVideoId: $preview ? 'vid123' : null,
            previewStartMs: 0, previewDurationMs: 30000,
            license: null, licenseUrl: null, attributionText: null,
            attributionRequired: false, explicit: null, providerLabel: $provider,
        );
    }

    public function test_deduplicates_same_title_artist(): void
    {
        Http::fake();

        $ytMock = $this->createMock(YouTubeMusicProvider::class);
        $ytMock->method('isEnabled')->willReturn(true);
        $ytMock->method('name')->willReturn('youtube_music');
        $ytMock->method('search')->willReturn(new MusicSearchResult(
            [$this->mockTrack('youtube_music', 'Blinding Lights', 'The Weeknd', true)],
            1, false, 'youtube_music',
        ));

        $spMock = $this->createMock(SpotifyProvider::class);
        $spMock->method('isEnabled')->willReturn(true);
        $spMock->method('name')->willReturn('spotify');
        $spMock->method('search')->willReturn(new MusicSearchResult(
            [$this->mockTrack('spotify', 'Blinding Lights', 'The Weeknd', false)],
            1, false, 'spotify',
        ));

        $apMock = $this->createMock(AppleMusicProvider::class);
        $apMock->method('isEnabled')->willReturn(false);
        $apMock->method('name')->willReturn('apple');

        $adMock = $this->createMock(AudiusProvider::class);
        $adMock->method('isEnabled')->willReturn(false);
        $adMock->method('name')->willReturn('audius');

        $service = new MusicSearchService($ytMock, $spMock, $apMock, $adMock);
        $result  = $service->search('Blinding Lights', 1, 10);

        // Deduplicated to 1, YouTube (previewAvailable=true) wins
        $this->assertCount(1, $result['tracks']);
        $this->assertSame('youtube_music', $result['tracks'][0]['provider']);
        $this->assertTrue($result['tracks'][0]['previewAvailable']);
    }

    public function test_provider_failure_isolated(): void
    {
        Http::fake();

        $ytMock = $this->createMock(YouTubeMusicProvider::class);
        $ytMock->method('isEnabled')->willReturn(true);
        $ytMock->method('name')->willReturn('youtube_music');
        $ytMock->method('search')->willThrowException(new \RuntimeException('timeout'));

        $spMock = $this->createMock(SpotifyProvider::class);
        $spMock->method('isEnabled')->willReturn(true);
        $spMock->method('name')->willReturn('spotify');
        $spMock->method('search')->willReturn(new MusicSearchResult(
            [$this->mockTrack('spotify', 'Test Song', 'Test Artist')],
            1, false, 'spotify',
        ));

        $apMock = $this->createMock(AppleMusicProvider::class);
        $apMock->method('isEnabled')->willReturn(false);
        $apMock->method('name')->willReturn('apple');

        $adMock = $this->createMock(AudiusProvider::class);
        $adMock->method('isEnabled')->willReturn(false);
        $adMock->method('name')->willReturn('audius');

        $service = new MusicSearchService($ytMock, $spMock, $apMock, $adMock);
        $result  = $service->search('test', 1, 10);

        // Spotify result comes through despite YouTube failure
        $this->assertCount(1, $result['tracks']);
        $this->assertSame('spotify', $result['tracks'][0]['provider']);
    }
}
