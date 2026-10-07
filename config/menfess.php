<?php

return [
    'public_id_prefix' => env('PUBLIC_ID_PREFIX', 'MF'),

    'rate_limit' => [
        'submit_per_minute'   => env('MENFESS_SUBMIT_PER_MINUTE', 5),
        'submit_per_hour'     => env('MENFESS_SUBMIT_PER_HOUR', 5),
        'takedown_per_minute' => env('MENFESS_TAKEDOWN_PER_MINUTE', 10),
    ],
];
