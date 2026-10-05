// Music search modal.
// Accepts lifted query/results state from MusicField so search is preserved
// when navigating back from clip selector.

import { useState, useEffect, useRef, useCallback } from "react";
import type { MusicTrack } from "./types";
import { musicApi } from "./musicApi";
import { useAudioPlayer } from "./useAudioPlayer";
import MusicTrackResult from "./MusicTrackResult";

interface Props {
    // Lifted state from MusicField — preserves search on back navigation
    initialQuery: string;
    initialResults: MusicTrack[];
    onQueryChange: (q: string) => void;
    onResultsChange: (r: MusicTrack[]) => void;
    onSelect: (track: MusicTrack) => void;
    onClose: () => void;
    currentTrackId?: string;
}

export default function MusicPicker({
    initialQuery,
    initialResults,
    onQueryChange,
    onResultsChange,
    onSelect,
    onClose,
    currentTrackId,
}: Props) {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<MusicTrack[]>(initialResults);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
    // YouTube iframe preview
    const [ytVideoId, setYtVideoId] = useState<string | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        state: audioState,
        play,
        stop,
    } = useAudioPlayer({
        onEnded: () => setPreviewTrackId(null),
    });

    useEffect(() => {
        searchRef.current?.focus();
        return () => {
            stop();
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [stop]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                stop();
                setYtVideoId(null);
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose, stop]);

    const doSearch = useCallback(
        async (q: string) => {
            if (q.length < 2) {
                setResults([]);
                onResultsChange([]);
                setError(null);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const res = await musicApi.searchTracks(q);
                // Client-side sort: audius always last, youtube_music first
                const providerOrder: Record<string, number> = {
                    youtube_music: 0,
                    spotify: 1,
                    apple: 2,
                    audius: 99,
                };
                const sorted = [...res.tracks].sort((a, b) => {
                    const pa = providerOrder[a.provider] ?? 50;
                    const pb = providerOrder[b.provider] ?? 50;
                    if (pa !== pb) return pa - pb;
                    // preview available first within same tier
                    if (a.previewAvailable !== b.previewAvailable)
                        return a.previewAvailable ? -1 : 1;
                    return 0;
                });
                setResults(sorted);
                onResultsChange(sorted);
            } catch {
                setError("Gagal memuat lagu. Coba lagi.");
                setResults([]);
                onResultsChange([]);
            } finally {
                setLoading(false);
            }
        },
        [onResultsChange],
    );

    function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setQuery(val);
        onQueryChange(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.length < 2) {
            setResults([]);
            onResultsChange([]);
            setError(null);
            return;
        }
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (debounceRef.current) clearTimeout(debounceRef.current);
            doSearch(query);
        }
    }

    function handlePreview(track: MusicTrack) {
        // YT iframe: trigger on previewType regardless of previewAvailable flag
        if (track.previewType === "youtube_iframe" && track.previewVideoId) {
            if (ytVideoId === track.previewVideoId) {
                setYtVideoId(null);
                setPreviewTrackId(null);
            } else {
                stop();
                setYtVideoId(track.previewVideoId);
                setPreviewTrackId(track.trackId);
            }
            return;
        }

        if (!track.previewAvailable) return;

        // audio_url type
        const url =
            track.previewUrl ??
            (track.provider === "audius"
                ? musicApi.streamUrl(track.provider, track.trackId)
                : null);
        if (!url) return;

        if (previewTrackId === track.trackId && audioState === "playing") {
            stop();
            setPreviewTrackId(null);
        } else {
            setYtVideoId(null);
            setPreviewTrackId(track.trackId);
            play(
                url,
                track.previewStartMs / 1000,
                (track.previewStartMs + track.previewDurationMs) / 1000,
            );
        }
    }

    function handleSelect(track: MusicTrack) {
        stop();
        setYtVideoId(null);
        onSelect(track);
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    stop();
                    setYtVideoId(null);
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Pilih musik"
        >
            <div className="w-full sm:max-w-2xl bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-t-[12px] sm:rounded-[10px] flex flex-col max-h-[90vh] sm:max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
                    <h2 className="text-sm font-semibold text-[var(--color-ink)] uppercase tracking-wide">
                        Musik
                    </h2>
                    <button
                        type="button"
                        aria-label="Tutup"
                        onClick={() => {
                            stop();
                            setYtVideoId(null);
                            onClose();
                        }}
                        className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] transition-colors"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            <line x1="2" y1="2" x2="12" y2="12" />
                            <line x1="12" y1="2" x2="2" y2="12" />
                        </svg>
                    </button>
                </div>

                {/* Search input */}
                <div className="px-5 py-3 border-b border-[var(--color-border)] shrink-0">
                    <div className="flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            stroke="var(--color-ink-subtle)"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                        >
                            <circle cx="6" cy="6" r="4" />
                            <line x1="9.5" y1="9.5" x2="13" y2="13" />
                        </svg>
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={handleQueryChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Cari lagu, artis… (Enter untuk langsung cari)"
                            aria-label="Cari lagu"
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle appearance-none border-none outline-none ring-0 shadow-none focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-none focus:ring-offset-0"
                        />
                        {loading && (
                            <svg
                                className="animate-spin shrink-0"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                stroke="var(--color-ink-subtle)"
                                strokeWidth="2"
                            >
                                <circle
                                    cx="7"
                                    cy="7"
                                    r="5"
                                    strokeOpacity="0.3"
                                />
                                <path d="M12 7a5 5 0 0 0-5-5" />
                            </svg>
                        )}
                    </div>
                    <p className="mt-1.5 text-[10px] text-[var(--color-ink-subtle)]">
                        Pencarian otomatis dalam 3 detik, atau tekan Enter untuk
                        langsung cari.
                    </p>
                </div>

                {/* YouTube iframe preview — shown above results */}
                {ytVideoId && (
                    <div className="px-5 py-3 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface-raised)]">
                        <div
                            className="relative w-full"
                            style={{ paddingTop: "56.25%" }}
                        >
                            <iframe
                                className="absolute inset-0 w-full h-full rounded-[6px]"
                                src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&start=0`}
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                title="YouTube preview"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setYtVideoId(null);
                                setPreviewTrackId(null);
                            }}
                            className="mt-2 text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors"
                        >
                            Tutup preview ×
                        </button>
                    </div>
                )}

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                    {error && (
                        <div className="px-5 py-8 text-center text-sm text-[var(--color-danger)]">
                            {error}
                        </div>
                    )}
                    {!error && query.length < 2 && (
                        <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-subtle)]">
                            Mulai cari lagu atau artis
                        </div>
                    )}
                    {!error &&
                        query.length >= 2 &&
                        !loading &&
                        results.length === 0 && (
                            <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-subtle)]">
                                Tidak ada lagu yang ditemukan.
                            </div>
                        )}
                    {results.map((track) => (
                        <MusicTrackResult
                            key={`${track.provider}:${track.trackId}`}
                            track={track}
                            audioState={audioState}
                            isPreviewingThis={previewTrackId === track.trackId}
                            isCurrent={currentTrackId === track.trackId}
                            onSelect={handleSelect}
                            onPreview={handlePreview}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
