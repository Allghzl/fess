<?php
namespace App\Music;

readonly class MusicSearchResult
{
    /** @param MusicTrack[] $tracks */
    public function __construct(
        public array  $tracks,
        public int    $total,
        public bool   $hasMore,
        public string $provider,
    ) {}
}
