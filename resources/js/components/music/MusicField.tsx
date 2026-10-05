// MusicField — main music attachment UI shown in the submission form.
// Lifts query+results state so going back to picker preserves search.

import { useState, useRef } from 'react';
import type { MusicTrack, SelectedMusic } from './types';
import { formatMs, selectedMusicToPayload } from './types';
import MusicPicker from './MusicPicker';
import MusicClipSelector from './MusicClipSelector';

interface Props {
    value: SelectedMusic | null;
    onChange: (music: SelectedMusic | null) => void;
}

type Step = 'closed' | 'picker' | 'clip';

export default function MusicField({ value, onChange }: Props) {
    const [step, setStep]                 = useState<Step>('closed');
    const [pendingTrack, setPendingTrack] = useState<MusicTrack | null>(null);
    // Lifted state — preserved when navigating picker → clip → back
    const [pickerQuery, setPickerQuery]   = useState('');
    const [pickerResults, setPickerResults] = useState<MusicTrack[]>([]);
    const triggerRef = useRef<HTMLButtonElement>(null);

    function openPicker() { setStep('picker'); }

    function handleTrackSelected(track: MusicTrack) {
        setPendingTrack(track);
        setStep('clip');
    }

    function handleClipConfirmed(selection: SelectedMusic) {
        onChange(selection);
        setStep('closed');
        setPendingTrack(null);
        setTimeout(() => triggerRef.current?.focus(), 50);
    }

    function handleClose() {
        setStep('closed');
        setPendingTrack(null);
        setTimeout(() => triggerRef.current?.focus(), 50);
    }

    function handleRemove() { onChange(null); }
    function handleChange() { setStep('picker'); }

    return (
        <div>
            <p className="text-xs text-[var(--color-ink-muted)] mb-2 uppercase tracking-wide font-medium">Musik</p>

            {!value ? (
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={openPicker}
                    className="flex items-center gap-2 text-sm text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] border border-dashed border-[var(--color-border)] rounded-[8px] px-4 py-2.5 w-full transition-colors hover:border-[var(--color-border-strong)]"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M7 3v8M3 7h8"/>
                    </svg>
                    Tambahkan musik
                </button>
            ) : (
                <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-[6px] overflow-hidden bg-[var(--color-canvas)] border border-[var(--color-border)]">
                            {value.artworkUrl ? (
                                <img src={value.artworkUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--color-ink-subtle)]">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 3v7.5a2.5 2.5 0 1 1-1-2V5L5 6V4l4-1z"/></svg>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{value.title}</p>
                            <p className="text-xs text-[var(--color-ink-muted)] truncate">{value.artist ?? ''}</p>
                            <p className="text-xs text-[var(--color-ink-subtle)] font-mono mt-0.5">
                                {formatMs(value.startMs)} — {formatMs(value.startMs + value.clipDurationMs)}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button type="button" onClick={handleChange}
                            className="text-xs px-3 py-1.5 rounded-[6px] border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas)] transition-colors">
                            Ganti
                        </button>
                        <button type="button" onClick={handleRemove}
                            className="text-xs px-3 py-1.5 rounded-[6px] border border-[var(--color-border)] text-[var(--color-ink-subtle)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
                            aria-label="Hapus musik">
                            Hapus
                        </button>
                    </div>
                </div>
            )}

            {step === 'picker' && (
                <MusicPicker
                    initialQuery={pickerQuery}
                    initialResults={pickerResults}
                    onQueryChange={setPickerQuery}
                    onResultsChange={setPickerResults}
                    onSelect={handleTrackSelected}
                    onClose={handleClose}
                    currentTrackId={value?.trackId}
                />
            )}

            {step === 'clip' && pendingTrack && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
                    role="dialog" aria-modal="true" aria-label="Pilih klip musik">
                    <div className="w-full sm:max-w-xl bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-t-[12px] sm:rounded-[10px] max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                            <h2 className="text-sm font-semibold text-[var(--color-ink)] uppercase tracking-wide">Pilih Klip</h2>
                            <button type="button" aria-label="Tutup" onClick={handleClose}
                                className="w-7 h-7 flex items-center justify-center text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] transition-colors">
                                <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                                </svg>
                            </button>
                        </div>
                        <MusicClipSelector
                            track={pendingTrack}
                            initialStartMs={value?.trackId === pendingTrack.trackId ? value.startMs : 0}
                            onConfirm={handleClipConfirmed}
                            onBack={() => setStep('picker')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export { selectedMusicToPayload };
export type { SelectedMusic };
