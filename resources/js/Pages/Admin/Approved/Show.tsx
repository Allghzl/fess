import AdminLayout from '@/Layouts/AdminLayout';
import { Alert, Button, CopyButton, PageHeader, SectionTitle, Spinner, StatusBadge } from '@/components/ui';
import { ClassDesign, ClassWorkspace, RenderFormat, Submission } from '@/types';
import { Link } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Preset definitions (mirrors ImageRenderer::PRESETS keys) ─────────────────
const PRESETS = [
    {
        key:         'editorial_geometry',
        label:       'Editorial Geometry',
        description: 'Diagonal rule, accent zone, content below',
        // SVG thumbnail: diagonal line + header block
        thumb: (sel: boolean) => (
            <svg viewBox="0 0 48 72" className="w-full h-full">
                <rect width="48" height="72" fill="#1A1F2E"/>
                <line x1="0" y1="22" x2="48" y2="26" stroke="#5878FF" strokeWidth="2"/>
                <rect x="4" y="6" width="28" height="5" rx="1" fill="#5878FF" opacity="0.9"/>
                <rect x="4" y="30" width="40" height="3" rx="1" fill="#F0EEE6" opacity="0.8"/>
                <rect x="4" y="37" width="36" height="3" rx="1" fill="#F0EEE6" opacity="0.6"/>
                <rect x="4" y="44" width="30" height="3" rx="1" fill="#F0EEE6" opacity="0.4"/>
                <rect x="4" y="60" width="18" height="2" rx="1" fill="#787870" opacity="0.5"/>
                {sel && <rect x="0" y="0" width="48" height="72" fill="none" stroke="#5878FF" strokeWidth="2.5"/>}
            </svg>
        ),
    },
    {
        key:         'typographic_poster',
        label:       'Typographic Poster',
        description: 'Message fills canvas, centered giant text',
        thumb: (sel: boolean) => (
            <svg viewBox="0 0 48 72" className="w-full h-full">
                <rect width="48" height="72" fill="#0D0D0D"/>
                <rect x="3" y="5" width="16" height="2" rx="1" fill="#787870" opacity="0.6"/>
                <line x1="3" y1="10" x2="45" y2="10" stroke="#C8F050" strokeWidth="0.8" opacity="0.6"/>
                <rect x="4" y="20" width="40" height="7" rx="1" fill="#FAFAF0" opacity="0.9"/>
                <rect x="6" y="31" width="36" height="7" rx="1" fill="#FAFAF0" opacity="0.9"/>
                <rect x="8" y="42" width="32" height="7" rx="1" fill="#FAFAF0" opacity="0.9"/>
                <rect x="3" y="60" width="22" height="2" rx="1" fill="#787870" opacity="0.4"/>
                {sel && <rect x="0" y="0" width="48" height="72" fill="none" stroke="#C8F050" strokeWidth="2.5"/>}
            </svg>
        ),
    },
    {
        key:         'quiet_editorial',
        label:       'Quiet Editorial',
        description: 'Cream background, left accent bar, generous space',
        thumb: (sel: boolean) => (
            <svg viewBox="0 0 48 72" className="w-full h-full">
                <rect width="48" height="72" fill="#F2EDE4"/>
                <rect x="5" y="6" width="1.5" height="60" rx="0.75" fill="#5A8258" opacity="0.5"/>
                <rect x="10" y="8" width="20" height="3" rx="1" fill="#5A5A52" opacity="0.5"/>
                <line x1="10" y1="14" x2="19" y2="14" stroke="#5A8258" strokeWidth="1"/>
                <rect x="10" y="18" width="34" height="5" rx="1" fill="#1C1814" opacity="0.8"/>
                <rect x="10" y="27" width="32" height="5" rx="1" fill="#1C1814" opacity="0.7"/>
                <rect x="10" y="36" width="28" height="5" rx="1" fill="#1C1814" opacity="0.55"/>
                <rect x="10" y="58" width="16" height="2" rx="1" fill="#828278" opacity="0.4"/>
                {sel && <rect x="0" y="0" width="48" height="72" fill="none" stroke="#5A8258" strokeWidth="2.5"/>}
            </svg>
        ),
    },
    {
        key:         'grid_technical',
        label:       'Grid / Technical',
        description: 'Two-column layout, metadata sidebar, grid overlay',
        thumb: (sel: boolean) => (
            <svg viewBox="0 0 48 72" className="w-full h-full">
                <rect width="48" height="72" fill="#111214"/>
                {/* grid lines */}
                {[0,6,12,18,24,30,36,42,48].map(x => (
                    <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="72" stroke="#00D2B4" strokeWidth="0.3" opacity="0.15"/>
                ))}
                {[0,6,12,18,24,30,36,42,48,54,60,66,72].map(y => (
                    <line key={`gy${y}`} x1="0" y1={y} x2="48" y2={y} stroke="#00D2B4" strokeWidth="0.3" opacity="0.15"/>
                ))}
                <line x1="30" y1="9" x2="30" y2="63" stroke="#00D2B4" strokeWidth="0.8" opacity="0.6"/>
                <rect x="2" y="5" width="16" height="2.5" rx="1" fill="#00D2B4" opacity="0.9"/>
                <rect x="2" y="10" width="26" height="4" rx="1" fill="#E8E4DA" opacity="0.8"/>
                <rect x="2" y="18" width="24" height="4" rx="1" fill="#E8E4DA" opacity="0.7"/>
                <rect x="2" y="26" width="22" height="4" rx="1" fill="#E8E4DA" opacity="0.55"/>
                <rect x="32" y="10" width="13" height="2" rx="1" fill="#00D2B4" opacity="0.7"/>
                <rect x="32" y="15" width="12" height="2" rx="1" fill="#969688" opacity="0.6"/>
                <rect x="32" y="22" width="10" height="2" rx="1" fill="#969688" opacity="0.5"/>
                {sel && <rect x="0" y="0" width="48" height="72" fill="none" stroke="#00D2B4" strokeWidth="2.5"/>}
            </svg>
        ),
    },
    {
        key:         'bold_block',
        label:       'Bold Block',
        description: 'Color split, large class name top, message reversed out',
        thumb: (sel: boolean) => (
            <svg viewBox="0 0 48 72" className="w-full h-full">
                <rect width="48" height="72" fill="#0A0A0C"/>
                <rect width="48" height="28" fill="#FF5A36"/>
                <rect x="3" y="8" width="32" height="6" rx="1" fill="#0A0A0C" opacity="0.85"/>
                <line x1="0" y1="28" x2="48" y2="28" stroke="#FF5A36" strokeWidth="1.5"/>
                <rect x="3" y="35" width="38" height="5" rx="1" fill="#FAFAF0" opacity="0.85"/>
                <rect x="3" y="44" width="35" height="5" rx="1" fill="#FAFAF0" opacity="0.75"/>
                <rect x="3" y="53" width="24" height="5" rx="1" fill="#FAFAF0" opacity="0.6"/>
                <rect x="3" y="62" width="14" height="2" rx="1" fill="#9B9688" opacity="0.4"/>
                {sel && <rect x="0" y="0" width="48" height="72" fill="none" stroke="#FF5A36" strokeWidth="2.5"/>}
            </svg>
        ),
    },
];

const PRESET_COLORS: Record<string, string> = {
    editorial_geometry: '#1A1F2E',
    typographic_poster: '#0D0D0D',
    quiet_editorial:    '#F2EDE4',
    grid_technical:     '#111214',
    bold_block:         '#FF5A36',
};

function csrfToken(): string {
    return (document.querySelector('meta[name=csrf-token]') as HTMLMetaElement)?.content ?? '';
}

export default function ApprovedShow({
    class: cls,
    submission,
    designs,
    flash,
}: {
    class: ClassWorkspace;
    submission: Submission;
    designs: ClassDesign[];
    flash?: { approved_public_id?: string };
}) {
    const [format, setFormat]             = useState<RenderFormat>('story');
    const [preset, setPreset]             = useState<string>(
        cls.settings?.default_render?.preset ?? 'editorial_geometry'
    );
    const [bgColor, setBgColor]           = useState<string>(
        cls.settings?.default_render?.background_color ?? PRESET_COLORS['editorial_geometry']
    );
    const [patternKey, setPatternKey]     = useState<string>(
        cls.settings?.default_render?.pattern_key ?? ''
    );
    const [patternOpacity, setPatternOpacity] = useState<number>(
        cls.settings?.default_render?.pattern_opacity ?? 0.06
    );
    const [designId, setDesignId]         = useState<string>('');
    const [showLogo, setShowLogo]         = useState(cls.settings?.default_render?.show_logo ?? true);
    const [showWebsite, setShowWebsite]   = useState(cls.settings?.default_render?.show_website_url ?? true);
    const [textMainColor, setTextMainColor] = useState('#F0EEE6');
    const [textAccentColor, setTextAccentColor] = useState('');  // empty = use preset default

    const [previewSrc, setPreviewSrc]         = useState<string | null>(null);
    const [previewing, setPreviewing]         = useState(false);
    const [rendering, setRendering]           = useState(false);
    const [previewError, setPreviewError]     = useState<string | null>(null);
    const [downloadError, setDownloadError]   = useState<string | null>(null);

    const isTakenDown = submission.status === 'taken_down';

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef    = useRef<AbortController | null>(null);

    // Sync bgColor default when preset changes
    function handlePresetChange(key: string) {
        setPreset(key);
        if (!designId) {
            setBgColor(PRESET_COLORS[key] ?? '#1A1F2E');
        }
    }

    function buildDesignPayload() {
        if (designId) return { source: 'custom', class_design_id: designId, format };
        return {
            source:          'builtin',
            preset,
            background_color: bgColor,
            pattern_key:     patternKey || null,
            pattern_color:   '#FFFFFF',
            pattern_opacity: patternOpacity,
        };
    }

    const triggerAutoPreview = useCallback(() => {
        if (isTakenDown) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            abortRef.current?.abort();
            abortRef.current = new AbortController();
            const signal = abortRef.current.signal;

            setPreviewing(true);
            setPreviewError(null);
            try {
                const body = {
                    format,
                    show_logo:        showLogo,
                    show_website_url: showWebsite,
                    design:           buildDesignPayload(),
                };
                const res = await fetch(
                    `/admin/classes/${cls.id}/approved/${submission.id}/preview`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                        body: JSON.stringify(body),
                        signal,
                    }
                );
                if (!res.ok) throw new Error(await res.text());
                const blob = await res.blob();
                if (previewSrc) URL.revokeObjectURL(previewSrc);
                setPreviewSrc(URL.createObjectURL(blob));
            } catch (e) {
                if ((e as Error).name !== 'AbortError') setPreviewError('Preview gagal.');
            } finally {
                if (!signal.aborted) setPreviewing(false);
            }
        }, 800);
    }, [format, preset, bgColor, patternKey, patternOpacity, designId, showLogo, showWebsite, isTakenDown]); // eslint-disable-line

    useEffect(() => {
        triggerAutoPreview();
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [triggerAutoPreview]);

    async function handleDownload() {
        setRendering(true);
        setDownloadError(null);
        try {
            const body = { format, show_logo: showLogo, show_website_url: showWebsite, design: buildDesignPayload() };
            const res  = await fetch(
                `/admin/classes/${cls.id}/approved/${submission.id}/render`,
                { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() }, body: JSON.stringify(body) }
            );
            if (!res.ok) throw new Error(await res.text());
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = (submission.public_id ?? submission.id) + '_' + format + '.png';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setDownloadError('Render gagal: ' + (e as Error).message);
        } finally {
            setRendering(false);
        }
    }

    const PATTERNS = [
        { key: '',               label: 'Tanpa' },
        { key: 'dots',           label: 'Dots' },
        { key: 'grid',           label: 'Grid' },
        { key: 'diagonal_lines', label: 'Lines' },
        { key: 'plus',           label: 'Plus' },
        { key: 'circles',        label: 'Circles' },
        { key: 'checker',        label: 'Checker' },
        { key: 'waves',          label: 'Waves' },
    ];

    const fieldCls = 'w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] text-sm px-3 py-2 focus:outline-none focus:border-[var(--color-accent)]';

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: 'Konten Disetujui', href: `/admin/classes/${cls.id}/approved` }}
                title="Detail Konten"
            />

            {flash?.approved_public_id && (
                <Alert variant="success" className="mb-5 flex items-center justify-between gap-4">
                    <span>Disetujui · <span style={{ fontFamily: 'DM Mono, monospace' }}>{flash.approved_public_id}</span></span>
                    <CopyButton value={flash.approved_public_id} label="Salin ID" />
                </Alert>
            )}
            {isTakenDown && (
                <Alert variant="error" className="mb-5">Konten ini telah diturunkan. Pembuatan gambar baru tidak dapat dilakukan.</Alert>
            )}

            <div className="grid gap-8 lg:grid-cols-[360px_1fr] items-start">
                {/* ── Left: Controls ──────────────────────────────────── */}
                <div className="space-y-0">

                    {/* Metadata preview — informational */}
                    <div>
                        <SectionTitle>Konten</SectionTitle>
                        <p className="text-sm text-[var(--color-ink)] whitespace-pre-wrap leading-relaxed break-words">
                            {submission.moderated_message ?? submission.original_message}
                        </p>
                        {(submission.target_text || submission.alias_text) && (
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                {submission.target_text && (
                                    <div>
                                        <span className="text-[var(--color-ink-subtle)] uppercase tracking-wide text-[10px]">Kepada</span>
                                        <p className="text-[var(--color-ink-muted)] mt-0.5">{submission.target_text}</p>
                                    </div>
                                )}
                                {submission.alias_text && (
                                    <div>
                                        <span className="text-[var(--color-ink-subtle)] uppercase tracking-wide text-[10px]">Dari</span>
                                        <p className="text-[var(--color-ink-muted)] mt-0.5">{submission.alias_text}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {(submission.song_text || submission.artist_text) && (
                            <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
                                🎵 {[submission.song_text, submission.artist_text].filter(Boolean).join(' — ')}
                                {submission.song_start_seconds != null && (
                                    <span className="ml-1 font-mono">
                                        ({Math.floor(submission.song_start_seconds / 60)}:{String(submission.song_start_seconds % 60).padStart(2,'0')} — {Math.floor((submission.song_start_seconds + 30) / 60)}:{String((submission.song_start_seconds + 30) % 60).padStart(2,'0')})
                                    </span>
                                )}
                            </p>
                        )}
                        {(submission.tags ?? []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {submission.tags!.map(t => (
                                    <span key={t.id} className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-surface-raised)] text-[var(--color-ink-subtle)] border border-[var(--color-border)]">
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {!isTakenDown && (<>
                        {/* Format */}
                        <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                            <SectionTitle>Format</SectionTitle>
                            <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] text-sm font-medium">
                                {(['story', 'feed_portrait'] as RenderFormat[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFormat(f)}
                                        className={`flex-1 px-3 py-2 transition-colors ${format === f ? 'bg-[var(--color-accent)] text-[#0B0D0E] font-semibold' : 'bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]'}`}
                                    >
                                        {f === 'story' ? 'Story 9:16' : 'Feed 4:5'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Design Preset */}
                        <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                            <SectionTitle>Preset Desain</SectionTitle>
                            <div
                                className="grid grid-cols-5 gap-2"
                                role="radiogroup"
                                aria-label="Pilih preset desain"
                            >
                                {PRESETS.map(p => {
                                    const sel = !designId && preset === p.key;
                                    return (
                                        <button
                                            key={p.key}
                                            role="radio"
                                            aria-checked={sel}
                                            onClick={() => { handlePresetChange(p.key); setDesignId(''); }}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { handlePresetChange(p.key); setDesignId(''); } }}
                                            title={p.label + ' — ' + p.description}
                                            className={`group flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-lg p-1`}
                                        >
                                            <div className={`w-full aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all ${sel ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-canvas)]' : 'border-transparent group-hover:border-[var(--color-border-strong)]'}`}>
                                                {p.thumb(sel)}
                                            </div>
                                            <span className={`text-[9px] text-center leading-tight transition-colors ${sel ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-subtle)]'}`}>
                                                {p.label.split(' ')[0]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Preset description */}
                            {!designId && (
                                <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
                                    {PRESETS.find(p => p.key === preset)?.description}
                                </p>
                            )}
                        </div>

                        {/* Colorway */}
                        <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                            <SectionTitle>Warna</SectionTitle>

                            {/* Custom designs */}
                            {designs.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] text-[var(--color-ink-subtle)] uppercase tracking-wide mb-2">Background Kustom</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => setDesignId('')} title="Pakai preset bawaan" className="flex flex-col items-center gap-1 group">
                                            <div className={`w-10 h-10 rounded-[8px] border-2 flex items-center justify-center transition-all bg-[var(--color-surface-raised)] ${!designId ? 'border-[var(--color-accent)]' : 'border-transparent group-hover:border-[var(--color-border-strong)]'}`}>
                                                <span className="text-[8px] text-[var(--color-ink-subtle)]">Bawaan</span>
                                            </div>
                                        </button>
                                        {designs.map(d => {
                                            const sel = designId === d.id;
                                            return (
                                                <button key={d.id} onClick={() => setDesignId(d.id)} className="flex flex-col items-center gap-1 group">
                                                    <div className={`w-10 h-10 rounded-[8px] bg-[var(--color-surface-raised)] border-2 flex items-center justify-center transition-all ${sel ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)] group-hover:border-[var(--color-border-strong)]'}`}>
                                                        <span className="text-[7px] text-[var(--color-ink-subtle)] uppercase">{d.format === 'story' ? 'S' : 'F'}</span>
                                                    </div>
                                                    <span className="text-[9px] text-[var(--color-ink-subtle)] text-center w-full truncate">{d.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {!designId && (
                                <div className="space-y-3">
                                    {/* Background color */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs text-[var(--color-ink-muted)] w-28 shrink-0">Warna Background</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                                                className="h-7 w-7 rounded cursor-pointer border border-[var(--color-border)] bg-transparent p-0.5" />
                                            <input type="text" value={bgColor}
                                                onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setBgColor(e.target.value)}
                                                className="w-20 text-xs font-mono px-2 py-1 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)]" maxLength={7} />
                                        </div>
                                    </div>

                                    {/* Text main color */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs text-[var(--color-ink-muted)] w-28 shrink-0">Warna Teks Utama</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={textMainColor} onChange={e => setTextMainColor(e.target.value)}
                                                className="h-7 w-7 rounded cursor-pointer border border-[var(--color-border)] bg-transparent p-0.5" />
                                            <input type="text" value={textMainColor}
                                                onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setTextMainColor(e.target.value)}
                                                className="w-20 text-xs font-mono px-2 py-1 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)]" maxLength={7} />
                                        </div>
                                    </div>

                                    {/* Accent / header color */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs text-[var(--color-ink-muted)] w-28 shrink-0">Warna Header / Aksen</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={textAccentColor || '#5878FF'} onChange={e => setTextAccentColor(e.target.value)}
                                                className="h-7 w-7 rounded cursor-pointer border border-[var(--color-border)] bg-transparent p-0.5" />
                                            <input type="text" value={textAccentColor}
                                                onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setTextAccentColor(e.target.value)}
                                                placeholder="Preset default"
                                                className="w-20 text-xs font-mono px-2 py-1 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)]" maxLength={7} />
                                            {textAccentColor && (
                                                <button type="button" onClick={() => setTextAccentColor('')}
                                                    className="text-[10px] text-[var(--color-ink-subtle)] hover:text-[var(--color-danger)]">Reset</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pattern */}
                                    <div className="flex items-start gap-3">
                                        <label className="text-xs text-[var(--color-ink-muted)] w-28 shrink-0 mt-1">Pattern</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {PATTERNS.map(pt => (
                                                <button key={pt.key} onClick={() => setPatternKey(pt.key)}
                                                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${patternKey === pt.key ? 'bg-[var(--color-accent)] text-[#0B0D0E] border-[var(--color-accent)]' : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'}`}>
                                                    {pt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {patternKey && (
                                        <div className="flex items-center gap-3">
                                            <label className="text-xs text-[var(--color-ink-muted)] w-28 shrink-0">Opasitas Pattern</label>
                                            <div className="flex items-center gap-2 flex-1">
                                                <input type="range" min={0} max={0.5} step={0.02} value={patternOpacity}
                                                    onChange={e => setPatternOpacity(parseFloat(e.target.value))}
                                                    className="flex-1 accent-[var(--color-accent)]" />
                                                <span className="text-xs text-[var(--color-ink-subtle)] w-8 text-right">{Math.round(patternOpacity * 100)}%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Branding */}
                        <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                            <SectionTitle>Branding</SectionTitle>
                            <div className="space-y-2.5">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} className="accent-[var(--color-accent)] h-4 w-4" />
                                    <span className="text-sm text-[var(--color-ink)]">Tampilkan Logo</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={showWebsite} onChange={e => setShowWebsite(e.target.checked)} className="accent-[var(--color-accent)] h-4 w-4" />
                                    <span className="text-sm text-[var(--color-ink)]">Tampilkan Instagram / Website</span>
                                </label>
                                <div className="flex items-center gap-2.5">
                                    <Lock size={13} className="text-[var(--color-ink-subtle)] shrink-0" />
                                    <span className="text-xs text-[var(--color-ink-subtle)]">Menfess ID · Selalu ditampilkan</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                            {previewError  && <Alert variant="error" className="mb-3">{previewError}</Alert>}
                            {downloadError && <Alert variant="error" className="mb-3">{downloadError}</Alert>}
                            <Button variant="primary" onClick={handleDownload} loading={rendering} className="w-full">
                                Unduh PNG
                            </Button>
                        </div>
                    </>)}

                    {/* Meta */}
                    <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                        <SectionTitle>Meta</SectionTitle>
                        <dl className="space-y-2 text-sm">
                            <div>
                                <dt className="text-[10px] text-[var(--color-ink-subtle)] uppercase tracking-wide mb-0.5">Public ID</dt>
                                <dd className="font-mono font-medium text-[var(--color-ink)]">{submission.public_id}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] text-[var(--color-ink-subtle)] uppercase tracking-wide mb-0.5">Status</dt>
                                <dd><StatusBadge status={submission.status} /></dd>
                            </div>
                            {submission.approved_at && (
                                <div>
                                    <dt className="text-[10px] text-[var(--color-ink-subtle)] uppercase tracking-wide mb-0.5">Disetujui</dt>
                                    <dd className="text-[var(--color-ink-muted)]">{new Date(submission.approved_at).toLocaleString('id-ID')}</dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-[10px] text-[var(--color-ink-subtle)] uppercase tracking-wide mb-0.5">Diposting</dt>
                                <dd className="text-[var(--color-ink-muted)]">{submission.posted_at ? new Date(submission.posted_at).toLocaleString('id-ID') : 'Belum'}</dd>
                            </div>
                        </dl>

                        {!isTakenDown && (
                            <Link
                                href={`/admin/classes/${cls.id}/approved/${submission.id}/mark-posted`}
                                method="post"
                                as="button"
                                className="mt-4 inline-flex items-center px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)] transition-colors"
                            >
                                {submission.posted_at ? 'Batal Tandai Diposting' : 'Tandai Sudah Diposting'}
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Right: Preview — half-width, aspect-correct, no float ── */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden"
                        style={{ backgroundColor: 'var(--color-canvas)', maxWidth: '270px', margin: '0 auto' }}>
                        {previewing ? (
                            <div className="min-h-[180px] flex items-center justify-center">
                                <Spinner size={24} className="text-[var(--color-ink-muted)]" />
                            </div>
                        ) : previewSrc ? (
                            <img src={previewSrc} alt="Preview" className="w-full h-auto block" />
                        ) : (
                            <div className="min-h-[180px] flex items-center justify-center">
                                <span className="text-xs text-[var(--color-ink-subtle)] px-4 text-center">
                                    Preview akan muncul otomatis
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
