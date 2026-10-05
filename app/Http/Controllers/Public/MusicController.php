<?php
namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Music\MusicSearchService;
use App\Music\Providers\AudiusProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MusicController extends Controller
{
    public function __construct(
        private MusicSearchService $music,
        private AudiusProvider     $audius,
    ) {}

    public function search(Request $request): JsonResponse
    {
        if (!Auth::check()) return response()->json(['error' => 'Unauthenticated'], 401);

        $request->validate([
            'q'     => 'required|string|min:2|max:100',
            'page'  => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1|max:20',
        ]);

        $result = $this->music->search(
            trim($request->string('q')),
            (int) $request->input('page', 1),
            (int) $request->input('limit', config('music.search.default_limit', 20)),
        );

        return response()->json($result);
    }

    public function stream(Request $request, string $provider, string $trackId): mixed
    {
        if (!Auth::check()) return response()->json(['error' => 'Unauthenticated'], 401);

        // Only Audius has a server-side stream redirect; YouTube/Spotify/Apple do not
        if ($provider !== 'audius') {
            return response()->json(['error' => 'Stream not available for this provider'], 404);
        }

        $streamUrl = $this->audius->getStreamUrl($trackId);
        if (!$streamUrl) {
            return response()->json(['error' => 'Track not streamable or not found'], 404);
        }

        return redirect()->away($streamUrl, 302)
            ->header('Access-Control-Allow-Origin', config('app.url', '*'))
            ->header('Access-Control-Allow-Methods', 'GET')
            ->header('Cache-Control', 'no-store');
    }

    public function health(Request $request): JsonResponse
    {
        if (!Auth::check()) return response()->json(['error' => 'Unauthenticated'], 401);
        return response()->json(['providers' => $this->music->healthAll()]);
    }
}
