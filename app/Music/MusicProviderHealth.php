<?php
namespace App\Music;

readonly class MusicProviderHealth
{
    public function __construct(
        public string $provider,
        public bool   $healthy,
        public ?string $message = null,
        public ?float  $latencyMs = null,
    ) {}
}
