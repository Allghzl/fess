<?php
return [
    'providers' => array_filter(explode(',', env('MUSIC_PROVIDERS', 'youtube_music,spotify,apple,audius'))),

    'youtube_music' => [
        'base_url' => env('YTMUSIC_API_BASE_URL', 'http://localhost:8765'),
        'language' => env('YTMUSIC_LANGUAGE', 'en'),
        'region'   => env('YTMUSIC_REGION', 'ID'),
        'timeout'  => (int) env('YTMUSIC_TIMEOUT_SEC', 6),
    ],

    'spotify' => [
        'base_url' => env('SPOTIFY_PROVIDER_BASE_URL', 'https://spotify.xwolf.space'),
        'timeout'  => (int) env('SPOTIFY_TIMEOUT_SEC', 5),
    ],

    'audius' => [
        'base_url' => env('AUDIUS_BASE_URL', 'https://api.audius.co'),
        'app_name' => env('AUDIUS_APP_NAME', 'Pinatmenfess'),
        'timeout'  => (int) env('AUDIUS_TIMEOUT_SEC', 8),
    ],

    'apple' => [
        'country' => env('APPLE_ITUNES_COUNTRY', 'ID'),
        'timeout' => (int) env('APPLE_TIMEOUT_SEC', 5),
    ],

    'cache_ttl' => (int) env('MUSIC_CACHE_TTL', 60),

    'search' => [
        'default_limit' => 20,
        'max_limit'     => 20,
    ],
];
