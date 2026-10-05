// Hook: YouTube IFrame Player API lifecycle manager.
// Loads the YT script once (idempotent), creates/destroys a player
// on a given container element.
//
// Architecture:
//   - loadYTApi()    : injects script tag once; resolves when YT.Player is ready
//   - useYTPlayer()  : creates/destroys a YT.Player on mount/unmount
//   - cueVideo()     : warm-up without autoplay — call after drag release
//   - playClip()     : seekTo start, play, stop at end via polling
//   - pauseVideo()   : pause current playback

// ── Minimal type shim (avoids @types/youtube dependency) ────────────────────
interface YTPlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: Record<string, unknown>;
    events?: {
        onReady?: (e: { target: YTPlayerInstance }) => void;
        onStateChange?: (e: { data: number; target: YTPlayerInstance }) => void;
        onError?: (e: { data: number }) => void;
    };
}
interface YTPlayerInstance {
    cueVideoById(opts: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
    loadVideoById(opts: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    destroy(): void;
    getPlayerState(): number;
    getCurrentTime(): number;
}
declare global {
    interface Window {
        YT?: { Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayerInstance; PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number } };
        onYouTubeIframeAPIReady?: () => void;
    }
}

// ── Script loader ─────────────────────────────────────────────────────────────
let apiPromise: Promise<void> | null = null;

export function loadYTApi(): Promise<void> {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise<void>(resolve => {
        if (window.YT?.Player) { resolve(); return; }
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const s = document.createElement('script');
            s.src   = 'https://www.youtube.com/iframe_api';
            s.async = true;
            document.head.appendChild(s);
        }
    });
    return apiPromise;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useCallback } from 'react';

export type YTPlayerState = 'idle' | 'cued' | 'playing' | 'paused' | 'ended' | 'error';

interface UseYTPlayerOptions {
    container: React.RefObject<HTMLDivElement | null>;
    videoId: string | null;
    onStateChange?: (state: YTPlayerState) => void;
}

export function useYTPlayer({ container, videoId, onStateChange }: UseYTPlayerOptions) {
    const playerRef   = useRef<YTPlayerInstance | null>(null);
    const stopAtRef   = useRef<number | null>(null);
    const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
    const warmupRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const readyRef    = useRef(false);

    function clearPoll() {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }

    // Create player when container + videoId are available
    useEffect(() => {
        if (!videoId || !container.current) return;
        let destroyed = false;

        loadYTApi().then(() => {
            if (destroyed || !container.current || !window.YT?.Player) return;

            playerRef.current = new window.YT.Player(container.current, {
                height:      '100%',
                width:       '100%',
                videoId,
                playerVars:  { rel: 0, modestbranding: 1, controls: 1, enablejsapi: 1 },
                events: {
                    onReady: () => { if (!destroyed) { readyRef.current = true; onStateChange?.('cued'); } },
                    onStateChange: e => {
                        if (destroyed) return;
                        const S = window.YT!.PlayerState;
                        if (e.data === S.PLAYING)  { onStateChange?.('playing'); }
                        if (e.data === S.PAUSED)   { onStateChange?.('paused'); clearPoll(); }
                        if (e.data === S.ENDED)    { onStateChange?.('ended');  clearPoll(); }
                        if (e.data === S.CUED)     { onStateChange?.('cued'); }
                    },
                    onError: () => { if (!destroyed) onStateChange?.('error'); },
                },
            });
        });

        return () => {
            destroyed = true;
            readyRef.current = false;
            clearPoll();
            if (warmupRef.current) clearTimeout(warmupRef.current);
            try { playerRef.current?.destroy(); } catch {}
            playerRef.current = null;
        };
    }, [videoId]); // eslint-disable-line

    /** Warm-up: cue without autoplay. Call after drag release. */
    const cueVideo = useCallback((startSec: number, endSec: number) => {
        if (warmupRef.current) clearTimeout(warmupRef.current);
        warmupRef.current = setTimeout(() => {
            if (!readyRef.current || !playerRef.current || !videoId) return;
            playerRef.current.cueVideoById({ videoId, startSeconds: startSec, endSeconds: endSec });
        }, 200);
    }, [videoId]);

    /** Play from startSec, stop at endSec via polling. */
    const playClip = useCallback((startSec: number, endSec: number) => {
        if (!readyRef.current || !playerRef.current || !videoId) return;
        clearPoll();
        stopAtRef.current = endSec;
        playerRef.current.seekTo(startSec, true);
        playerRef.current.playVideo();

        pollRef.current = setInterval(() => {
            if (!playerRef.current) { clearPoll(); return; }
            const t = playerRef.current.getCurrentTime();
            if (stopAtRef.current !== null && t >= stopAtRef.current) {
                playerRef.current.pauseVideo();
                clearPoll();
                onStateChange?.('paused');
            }
        }, 250);
    }, [videoId, onStateChange]);

    const pauseVideo = useCallback(() => {
        clearPoll();
        try { playerRef.current?.pauseVideo(); } catch {}
    }, []);

    const isReady = () => readyRef.current;

    const getCurrentTime = useCallback((): number => {
        try { return playerRef.current?.getCurrentTime() ?? 0; } catch { return 0; }
    }, []);

    return { cueVideo, playClip, pauseVideo, isReady, getCurrentTime };
}
