// Clip selector — draggable window + YouTube IFrame preview + Audius audio preview.
// YT: uses official IFrame Player API. Scrubbing is LOCAL — no player reload on drag.
// Audius/audio_url: HTML5 Audio, clip-bounded playback.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MusicTrack, SelectedMusic } from './types';
import { MUSIC_CLIP_MAX_MS, formatMs } from './types';
import { musicApi } from './musicApi';
import { useYTPlayer } from './useYouTubePlayer';
import { useAudioPlayer } from './useAudioPlayer';

interface Props {
    track: MusicTrack;
    initialStartMs?: number;
    onConfirm: (selection: SelectedMusic) => void;
    onBack: () => void;
}

// Deterministic pseudo-waveform from track metadata — no audio download needed.
function generateWaveBars(count: number, seed: string): number[] {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    return Array.from({ length: count }, (_, i) => {
        h = (Math.imul(1664525, h) + 1013904223) | 0;
        const base = 0.2 + ((h & 0xff) / 255) * 0.8;
        // taper edges slightly
        const edge = Math.min(1, Math.min(i, count - 1 - i) / (count * 0.08) + 0.3);
        return Math.max(0.1, Math.min(1, base * edge));
    });
}

export default function MusicClipSelector({ track, initialStartMs = 0, onConfirm, onBack }: Props) {
    const duration       = track.durationMs ?? track.previewDurationMs ?? 30000;
    const clipDurationMs = Math.min(MUSIC_CLIP_MAX_MS, duration);
    const maxStart       = Math.max(0, duration - clipDurationMs);

    // LOCAL start state — updated every pointermove, never triggers player
    const [startMs, setStartMs]         = useState(() => Math.min(initialStartMs, maxStart));
    // Committed start — set on pointer release, triggers cue/warmup
    const [committedMs, setCommittedMs] = useState(() => Math.min(initialStartMs, maxStart));
    const [ytState, setYtState]         = useState<'idle'|'cued'|'playing'|'paused'|'ended'|'error'>('idle');
    const [audioPreviewing, setAudioPreviewing] = useState(false);

    const endMs      = Math.min(startMs + clipDurationMs, duration);
    const isYT       = track.previewType === 'youtube_iframe';
    const videoId    = isYT ? (track.previewVideoId ?? null) : null;
    const streamUrl  = isYT ? null
        : track.previewUrl ?? (track.provider === 'audius' ? musicApi.streamUrl(track.provider, track.trackId) : null);

    // YT player
    const ytContainerRef = useRef<HTMLDivElement>(null);
    const { cueVideo, playClip, pauseVideo, isReady, getCurrentTime: ytGetTime } = useYTPlayer({
        container:    ytContainerRef,
        videoId,
        onStateChange: setYtState,
    });

    // Audio player (Audius)
    const { play: audioPlay, stop: audioStop, getCurrentTime: audioGetTime } = useAudioPlayer({
        onEnded: () => setAudioPreviewing(false),
    });

    // Playhead — rAF loop updates position while playing
    const [playheadSec, setPlayheadSec] = useState<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const isPlaying = isYT ? ytState === 'playing' : audioPreviewing;
        if (!isPlaying) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            setPlayheadSec(null);
            return;
        }
        const getTime = isYT ? ytGetTime : audioGetTime;
        const tick = () => {
            setPlayheadSec(getTime());
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [isYT, ytState, audioPreviewing, ytGetTime, audioGetTime]);

    // Cue after drag release (debounced warmup)
    useEffect(() => {
        if (!isYT) return;
        cueVideo(committedMs / 1000, (committedMs + clipDurationMs) / 1000);
    }, [committedMs, isYT, clipDurationMs, cueVideo]);

    // Drag refs
    const trackBarRef  = useRef<HTMLDivElement>(null);
    const dragStartX   = useRef<number | null>(null);
    const dragStartMs  = useRef<number>(0);
    const isDragging   = useRef(false);

    function onPointerDown(e: React.PointerEvent) {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStartX.current  = e.clientX;
        dragStartMs.current = startMs;
        isDragging.current  = true;
        // Pause playback when user starts dragging
        if (isYT) pauseVideo();
        else { audioStop(); setAudioPreviewing(false); }
    }

    function onPointerMove(e: React.PointerEvent) {
        if (!isDragging.current || dragStartX.current === null || !trackBarRef.current) return;
        const barW    = trackBarRef.current.getBoundingClientRect().width;
        const deltaPx = e.clientX - dragStartX.current;
        const deltaMs = (deltaPx / barW) * duration;
        const next    = Math.max(0, Math.min(maxStart, dragStartMs.current + deltaMs));
        setStartMs(Math.round(next)); // local only — no player call
    }

    function onPointerUp(e: React.PointerEvent) {
        if (!isDragging.current) return;
        isDragging.current  = false;
        dragStartX.current  = null;
        setCommittedMs(startMs); // triggers cue/warmup
    }

    function handlePlay() {
        if (isYT) {
            if (ytState === 'playing') {
                pauseVideo();
            } else {
                playClip(committedMs / 1000, (committedMs + clipDurationMs) / 1000);
            }
        } else if (streamUrl) {
            if (audioPreviewing) {
                audioStop();
                setAudioPreviewing(false);
            } else {
                setAudioPreviewing(true);
                audioPlay(streamUrl, committedMs / 1000, (committedMs + clipDurationMs) / 1000);
            }
        }
    }

    function handleConfirm() {
        pauseVideo();
        audioStop();
        onConfirm({
            provider:            track.provider,
            trackId:             track.trackId,
            title:               track.title,
            artist:              track.artist,
            artworkUrl:          track.artworkUrl,
            trackUrl:            track.trackUrl,
            durationMs:          duration,
            startMs:             committedMs,
            clipDurationMs,
            previewType:         track.previewType,
            previewVideoId:      track.previewVideoId,
            license:             track.license,
            licenseUrl:          track.licenseUrl,
            attributionText:     track.attributionText,
            attributionRequired: track.attributionRequired,
        });
    }

    // Cleanup on unmount
    useEffect(() => () => { audioStop(); }, [audioStop]);

    const windowPct = (clipDurationMs / duration) * 100;
    const startPct  = (startMs / duration) * 100;
    const endPct    = (endMs / duration) * 100;

    // Deterministic waveform bars
    const BARS     = 120;
    const waveBars = generateWaveBars(BARS, track.trackId + track.title);

    const isPlaying = isYT ? ytState === 'playing' : audioPreviewing;
    const canPlay   = isYT ? (ytState !== 'idle' && ytState !== 'error') : !!streamUrl;

    return (
        <div className="flex flex-col gap-4 p-5">
            {/* Track header */}
            <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-[6px] overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                    {track.artworkUrl && <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{track.title}</p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-xs text-[var(--color-ink-muted)] truncate">{track.artist ?? ''}</p>
                        <span className="text-[10px] text-[var(--color-ink-subtle)] opacity-60">{track.providerLabel}</span>
                    </div>
                </div>
            </div>

            {/* YouTube IFrame Player — hidden visually, must stay in DOM for API */}
            {isYT && videoId && (
                <div className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    <div ref={ytContainerRef} style={{ width: 1, height: 1 }} />
                </div>
            )}

            {/* Visual waveform + draggable clip window */}
            <div>
                <p className="text-xs text-[var(--color-ink-subtle)] mb-2">
                    Geser jendela klip
                </p>

                <div
                    ref={trackBarRef}
                    className="relative h-14 rounded-[6px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] overflow-hidden select-none"
                >
                    {/* Deterministic waveform bars — thin lines */}
                    <div className="absolute inset-0 flex items-end pb-1" style={{ gap: '1px' }}>
                        {waveBars.map((h, i) => {
                            const barPct = (i / BARS) * 100;
                            const inClip = barPct >= startPct && barPct <= endPct;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        flex:            '1 1 0',
                                        minWidth:        0,
                                        height:          `${Math.round(h * 100)}%`,
                                        backgroundColor: inClip
                                            ? 'rgba(163,184,108,0.8)'
                                            : 'rgba(163,184,108,0.2)',
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Draggable selection window overlay */}
                    <div
                        className="absolute top-0 h-full cursor-grab active:cursor-grabbing touch-none border-x-2 border-[var(--color-accent)]"
                        style={{
                            left:            `${startPct}%`,
                            width:           `${windowPct}%`,
                            backgroundColor: 'rgba(163,184,108,0.06)',
                        }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        aria-label="Jendela klip — geser untuk memilih"
                    />

                    {/* Playhead — moves while playing */}
                    {playheadSec !== null && duration > 0 && (
                        <div
                            className="absolute top-0 h-full w-px pointer-events-none"
                            style={{
                                left:            `${Math.min(100, (playheadSec / (duration / 1000)) * 100)}%`,
                                backgroundColor: 'rgba(255,255,255,0.85)',
                                boxShadow:       '0 0 3px rgba(255,255,255,0.5)',
                            }}
                        />
                    )}
                </div>

                <div className="flex justify-between mt-1 text-[10px] text-[var(--color-ink-subtle)] font-mono">
                    <span>0:00</span>
                    <span>{formatMs(duration)}</span>
                </div>
            </div>

            {/* Clip time display */}
            <div className="flex items-center justify-between px-3 py-2 rounded-[6px] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                <span className="text-sm font-mono text-[var(--color-ink)]">{formatMs(committedMs)}</span>
                <span className="text-xs text-[var(--color-ink-subtle)]">— {formatMs(clipDurationMs)} —</span>
                <span className="text-sm font-mono text-[var(--color-ink)]">{formatMs(Math.min(committedMs + clipDurationMs, duration))}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={onBack}
                    className="px-4 py-2 text-sm rounded-[8px] border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-raised)] transition-colors">
                    ← Kembali
                </button>

                <button
                    type="button"
                    onClick={handlePlay}
                    disabled={!canPlay}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-[8px] border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-40"
                    aria-label={isPlaying ? 'Pause' : 'Preview klip'}
                >
                    {isPlaying
                        ? <><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8"/><rect x="6" y="1" width="3" height="8"/></svg> Pause</>
                        : <><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4z"/></svg> Preview</>
                    }
                </button>

                <button type="button" onClick={handleConfirm}
                    className="ml-auto px-5 py-2 text-sm rounded-[8px] bg-[var(--color-accent)] text-[#0B0D0E] font-semibold hover:opacity-90 transition-opacity">
                    Pilih Klip
                </button>
            </div>
        </div>
    );
}
