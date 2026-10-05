// Single track result row.

import type { MusicTrack } from './types';
import { formatMs } from './types';
import type { AudioState } from './useAudioPlayer';

interface Props {
    track: MusicTrack;
    audioState: AudioState;
    isPreviewingThis: boolean;
    isCurrent: boolean;
    onSelect: (track: MusicTrack) => void;
    onPreview: (track: MusicTrack) => void;
}

export default function MusicTrackResult({ track, audioState, isPreviewingThis, isCurrent, onSelect, onPreview }: Props) {
    const isLoading  = isPreviewingThis && audioState === 'loading';
    const isPlaying  = isPreviewingThis && audioState === 'playing';
    const isYT       = track.previewType === 'youtube_iframe';

    // Show preview button for YT (has videoId) or audio_url / audius
    const canPreview = (isYT && !!track.previewVideoId)
        || (track.previewAvailable && (track.previewType === 'audio_url' || track.provider === 'audius'));

    // Full duration of track — always show full track length, not clip preview length
    const displayDuration = track.durationMs != null && track.durationMs > 0
        ? formatMs(track.durationMs)
        : null;

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer group ${isCurrent ? 'bg-[var(--color-surface-raised)]' : ''}`}
            onClick={() => onSelect(track)}
        >
            {/* Artwork */}
            <div className="shrink-0 w-10 h-10 rounded-[6px] overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                {track.artworkUrl ? (
                    <img src={track.artworkUrl} alt="" className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-ink-subtle)]">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 3v7.5a2.5 2.5 0 1 1-1-2V5L5 6V4l4-1z"/></svg>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-sm text-[var(--color-ink)] font-medium truncate">{track.title}</p>
                    {isCurrent && (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-[#0B0D0E] font-semibold uppercase tracking-wide">dipilih</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <p className="text-xs text-[var(--color-ink-muted)] truncate">{track.artist ?? ''}</p>
                    {track.explicit && (
                        <span className="shrink-0 text-[9px] px-1 rounded border border-[var(--color-border)] text-[var(--color-ink-subtle)]">E</span>
                    )}
                    <span className="shrink-0 text-[10px] text-[var(--color-ink-subtle)] opacity-60">{track.providerLabel}</span>
                </div>
            </div>

            {/* Full track duration — always show track length, not preview clip */}
            {displayDuration && (
                <span className="text-xs text-[var(--color-ink-subtle)] shrink-0 tabular-nums">{displayDuration}</span>
            )}

            {/* Preview button */}
            {canPreview && (
                <button
                    type="button"
                    aria-label={isPlaying ? 'Pause preview' : isYT ? 'Buka preview YouTube' : 'Preview lagu'}
                    onClick={e => { e.stopPropagation(); onPreview(track); }}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
                    title={isYT ? 'Preview via YouTube' : 'Preview audio'}
                >
                    {isLoading ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="7" cy="7" r="5" strokeOpacity="0.3"/><path d="M12 7a5 5 0 0 0-5-5"/>
                        </svg>
                    ) : isPlaying && !isYT ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <rect x="2" y="2" width="3" height="8"/><rect x="7" y="2" width="3" height="8"/>
                        </svg>
                    ) : isYT ? (
                        /* YouTube icon */
                        <svg width="13" height="9" viewBox="0 0 13 9" fill="currentColor">
                            <path d="M12.7 1.4A1.6 1.6 0 0 0 11.6.3C10.6 0 6.5 0 6.5 0S2.4 0 1.4.3A1.6 1.6 0 0 0 .3 1.4C0 2.4 0 4.5 0 4.5s0 2.1.3 3.1A1.6 1.6 0 0 0 1.4 8.7C2.4 9 6.5 9 6.5 9s4.1 0 5.1-.3a1.6 1.6 0 0 0 1.1-1.1C13 6.6 13 4.5 13 4.5s0-2.1-.3-3.1ZM5.2 6.4V2.6l3.4 1.9-3.4 1.9Z"/>
                        </svg>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 2l7 4-7 4z"/></svg>
                    )}
                </button>
            )}
        </div>
    );
}
