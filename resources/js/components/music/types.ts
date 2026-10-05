// Music picker types — matches backend App\Music\MusicTrack::toArray()

export const MUSIC_CLIP_MAX_SECONDS = 30;
export const MUSIC_CLIP_MAX_MS = MUSIC_CLIP_MAX_SECONDS * 1000;

/** Normalized track shape from backend — matches MusicTrack::toArray() */
export interface MusicTrack {
    provider: string;
    trackId: string;
    title: string;
    artist: string | null;
    album: string | null;
    artworkUrl: string | null;
    trackUrl: string | null;
    durationMs: number | null;

    // Preview
    previewAvailable: boolean;
    previewType: 'youtube_iframe' | 'audio_url' | null;
    previewUrl: string | null;       // for audio_url type
    previewVideoId: string | null;   // for youtube_iframe type
    previewStartMs: number;
    previewDurationMs: number;

    // Attribution
    license: string | null;
    licenseUrl: string | null;
    attributionText: string | null;
    attributionRequired: boolean;

    // Extra
    explicit: boolean | null;
    providerLabel: string;
}

/** Selected music with clip range — stored in form state */
export interface SelectedMusic {
    provider: string;
    trackId: string;
    title: string;
    artist: string | null;
    artworkUrl: string | null;
    trackUrl: string | null;
    durationMs: number;
    startMs: number;
    clipDurationMs: number;
    previewType: 'youtube_iframe' | 'audio_url' | null;
    previewVideoId: string | null;
    license: string | null;
    licenseUrl: string | null;
    attributionText: string | null;
    attributionRequired: boolean;
}

/** What gets sent to the backend on form submission */
export interface MusicPayload {
    music_provider: string;
    music_track_id: string;
    music_start_ms: number;
    music_duration_ms: number;
    // Legacy compat — populated from track, not user-entered
    song_text: string;
    artist_text: string;
    song_start_seconds: number;
}

export interface MusicSearchResult {
    tracks: MusicTrack[];
    total: number;
    hasMore: boolean;
}

export function selectedMusicToPayload(m: SelectedMusic): MusicPayload {
    return {
        music_provider:     m.provider,
        music_track_id:     m.trackId,
        music_start_ms:     m.startMs,
        music_duration_ms:  m.clipDurationMs,
        song_text:          m.title,
        artist_text:        m.artist ?? '',
        song_start_seconds: Math.floor(m.startMs / 1000),
    };
}

export function formatMs(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
}

