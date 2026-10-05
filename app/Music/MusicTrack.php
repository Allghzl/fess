<?php
namespace App\Music;

readonly class MusicTrack
{
    public function __construct(
        public string  $provider,
        public string  $trackId,
        public string  $title,
        public ?string $artist,
        public ?string $album,
        public ?string $artworkUrl,
        public ?string $trackUrl,
        public ?int    $durationMs,

        // Preview
        public bool    $previewAvailable,
        public ?string $previewType,      // 'youtube_iframe' | 'audio_url' | null
        public ?string $previewUrl,       // audio URL for audio_url type
        public ?string $previewVideoId,   // YouTube videoId for youtube_iframe type
        public int     $previewStartMs,
        public int     $previewDurationMs,

        // Attribution
        public ?string $license,
        public ?string $licenseUrl,
        public ?string $attributionText,
        public bool    $attributionRequired,

        // Extra
        public ?bool   $explicit,
        public string  $providerLabel,
    ) {}

    public function toArray(): array
    {
        return [
            'provider'            => $this->provider,
            'trackId'             => $this->trackId,
            'title'               => $this->title,
            'artist'              => $this->artist,
            'album'               => $this->album,
            'artworkUrl'          => $this->artworkUrl,
            'trackUrl'            => $this->trackUrl,
            'durationMs'          => $this->durationMs,
            'previewAvailable'    => $this->previewAvailable,
            'previewType'         => $this->previewType,
            'previewUrl'          => $this->previewUrl,
            'previewVideoId'      => $this->previewVideoId,
            'previewStartMs'      => $this->previewStartMs,
            'previewDurationMs'   => $this->previewDurationMs,
            'license'             => $this->license,
            'licenseUrl'          => $this->licenseUrl,
            'attributionText'     => $this->attributionText,
            'attributionRequired' => $this->attributionRequired,
            'explicit'            => $this->explicit,
            'providerLabel'       => $this->providerLabel,
        ];
    }
}
