// Frontend music API service — centralized endpoint definitions.
// Backend agent is responsible for implementing these endpoints.
//
// Expected backend endpoints:
//   GET  /api/music/search?q={query}&page={page}&limit={limit}
//   GET  /api/music/stream/{provider}/{trackId}   (redirects to stream)

import type { MusicTrack, MusicSearchResult } from './types';

const BASE = '/api/music';

async function request<T>(url: string): Promise<T> {
    const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) {
        throw new Error(`music_api_error:${res.status}`);
    }
    return res.json() as Promise<T>;
}

export const musicApi = {
    async searchTracks(query: string, page = 1, limit = 20): Promise<MusicSearchResult> {
        const params = new URLSearchParams({ q: query, page: String(page), limit: String(limit) });
        return request<MusicSearchResult>(`${BASE}/search?${params}`);
    },

    /** Returns a URL suitable for Audio() playback — may be a redirect. */
    streamUrl(provider: string, trackId: string): string {
        return `${BASE}/stream/${encodeURIComponent(provider)}/${encodeURIComponent(trackId)}`;
    },
};
