<?php
namespace Tests\Unit\Music;

use App\Music\Providers\AudiusProvider;
use App\Music\Providers\AppleMusicProvider;
use App\Music\Providers\SpotifyProvider;
use App\Music\MusicTrack;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MusicTrackNormalizationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_audius_normalizes_to_music_track(): void
    {
        Http::fake([
            '*/v1/tracks/search*' => Http::response([
                'data' => [[
                    'id'            => 'abc123',
                    'title'         => 'Midnight City',
                    'user'          => ['name' => 'M83'],
                    'duration'      => 240,
                    'artwork'       => ['480x480' => 'https://cdn.audius.co/img.jpg'],
                    'permalink'     => 'https://audius.co/m83/midnight-city',
                    'is_streamable' => true,
                    'license'       => 'CC BY',
                ]]
            ], 200),
        ]);

        $provider = app(AudiusProvider::class);
        $result   = $provider->search('Midnight City', 1, 10);

        $this->assertNotEmpty($result->tracks);
        $track = $result->tracks[0];
        $this->assertInstanceOf(MusicTrack::class, $track);
        $this->assertSame('audius', $track->provider);
        $this->assertSame('abc123', $track->trackId);
        $this->assertSame('Midnight City', $track->title);
        $this->assertSame('M83', $track->artist);
        $this->assertSame(240000, $track->durationMs);
        $this->assertTrue($track->previewAvailable);
        $this->assertSame('audio_url', $track->previewType);
        $this->assertTrue($track->attributionRequired); // CC BY
    }

    public function test_audius_filters_non_streamable(): void
    {
        Http::fake([
            '*/v1/tracks/search*' => Http::response([
                'data' => [[
                    'id'            => 'xyz999',
                    'title'         => 'Locked Track',
                    'user'          => ['name' => 'Artist'],
                    'duration'      => 200,
                    'is_streamable' => false,
                ]]
            ], 200),
        ]);

        $provider = app(AudiusProvider::class);
        $result   = $provider->search('Locked', 1, 10);
        $this->assertEmpty($result->tracks);
    }

    public function test_spotify_normalizes_no_audio_preview(): void
    {
        Http::fake([
            '*/api/search*' => Http::response([
                'tracks' => [
                    'items' => [[
                        'id'       => 'sp123',
                        'name'     => 'Blinding Lights',
                        'artists'  => [['name' => 'The Weeknd']],
                        'album'    => ['name' => 'After Hours', 'images' => [['url' => 'https://i.sp.co/img.jpg']]],
                        'duration_ms'   => 200040,
                        'explicit'      => false,
                        'external_urls' => ['spotify' => 'https://open.spotify.com/track/sp123'],
                    ]],
                    'total' => 1,
                ]
            ], 200),
        ]);

        $provider = app(SpotifyProvider::class);
        $result   = $provider->search('Blinding Lights', 1, 10);

        $this->assertNotEmpty($result->tracks);
        $track = $result->tracks[0];
        $this->assertSame('spotify', $track->provider);
        $this->assertFalse($track->previewAvailable);
        $this->assertNull($track->previewType);
        $this->assertSame(200040, $track->durationMs);
    }

    public function test_apple_normalizes_metadata_only(): void
    {
        Http::fake([
            '*/search*' => Http::response([
                'results' => [[
                    'trackId'           => 12345,
                    'trackName'         => 'Shape of You',
                    'artistName'        => 'Ed Sheeran',
                    'collectionName'    => '÷',
                    'artworkUrl100'     => 'https://is1-ssl.mzstatic.com/image/thumb/100x100.jpg',
                    'trackViewUrl'      => 'https://music.apple.com/track/12345',
                    'trackTimeMillis'   => 233713,
                    'kind'              => 'song',
                    'trackExplicitness' => 'notExplicit',
                ]]
            ], 200),
        ]);

        $provider = app(AppleMusicProvider::class);
        $result   = $provider->search('Shape of You', 1, 10);

        $this->assertNotEmpty($result->tracks);
        $track = $result->tracks[0];
        $this->assertSame('apple', $track->provider);
        $this->assertFalse($track->previewAvailable);
        $this->assertStringContainsString('480x480', $track->artworkUrl ?? '');
    }

    public function test_provider_failure_returns_empty(): void
    {
        Http::fake(['*' => Http::response(null, 500)]);
        $provider = app(AudiusProvider::class);
        $result   = $provider->search('test', 1, 10);
        $this->assertEmpty($result->tracks);
        $this->assertSame(0, $result->total);
    }
}
