import AdminLayout from '@/Layouts/AdminLayout';
import { Button, Field, PageHeader, SectionTitle, Spinner } from '@/components/ui';
import { ClassWorkspace, DesignPreset, Tag } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
    return (
        <label htmlFor={id} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-[var(--color-ink)]">{label}</span>
            <div className="relative">
                <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
                <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
            </div>
        </label>
    );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PRESET_DEFAULTS: Record<string, string> = {
    editorial_geometry: '#1A1F2E',
    typographic_poster: '#0D0D0D',
    quiet_editorial:    '#F2EDE4',
    grid_technical:     '#111214',
    bold_block:         '#FF5A36',
};

const PRESET_OPTIONS = [
    { key: 'editorial_geometry', label: 'Editorial' },
    { key: 'typographic_poster', label: 'Poster' },
    { key: 'quiet_editorial',    label: 'Editorial Tenang' },
    { key: 'grid_technical',     label: 'Grid' },
    { key: 'bold_block',         label: 'Bold Block' },
];

const PATTERN_OPTIONS: { key: string | null; label: string; style: React.CSSProperties }[] = [
    { key: 'dots',           label: 'Titik',    style: { backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '8px 8px', backgroundColor: '#1E1E21' } },
    { key: 'grid',           label: 'Grid',     style: { backgroundImage: 'linear-gradient(#888 1px, transparent 1px), linear-gradient(90deg, #888 1px, transparent 1px)', backgroundSize: '8px 8px', backgroundColor: '#1E1E21' } },
    { key: 'diagonal_lines', label: 'Garis',    style: { backgroundImage: 'repeating-linear-gradient(45deg, #888, #888 1px, transparent 1px, transparent 8px)', backgroundColor: '#1E1E21' } },
    { key: 'plus',           label: 'Plus',     style: { backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '10px 10px', backgroundColor: '#1E1E21' } },
    { key: 'checker',        label: 'Kotak',    style: { backgroundImage: 'linear-gradient(45deg, #888 25%, transparent 25%, transparent 75%, #888 75%), linear-gradient(45deg, #888 25%, transparent 25%, transparent 75%, #888 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px', backgroundColor: '#1E1E21' } },
    { key: 'circles',        label: 'Lingkaran',style: { backgroundImage: 'radial-gradient(circle, transparent 3px, #888 3px, #888 4px, transparent 4px)', backgroundSize: '10px 10px', backgroundColor: '#1E1E21' } },
    { key: null,             label: 'Tanpa Pola',style: { backgroundColor: '#1E1E21' } },
];

const INPUT_CLS = 'w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]';

function csrfToken(): string {
    return (document.querySelector('meta[name=csrf-token]') as HTMLMetaElement)?.content ?? '';
}

// ─── Kategori Manager ─────────────────────────────────────────────────────────

function KategoriManager({ classId, tags }: { classId: string; tags: Tag[] }) {
    const [newName, setNewName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        setSubmitting(true);
        router.post(`/admin/classes/${classId}/tags`, { name: newName.trim() }, {
            preserveScroll: true,
            onFinish: () => { setSubmitting(false); setNewName(''); },
        });
    }

    function handleDelete(tagId: string) {
        setDeletingId(tagId);
        router.delete(`/admin/classes/${classId}/tags/${tagId}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    }

    return (
        <div>
            <SectionTitle>Kategori</SectionTitle>
            <p className="text-xs text-[var(--color-ink-subtle)] mb-3">
                Ditampilkan sebagai pilihan saat user kirim pesan. Maks. 20.
            </p>

            {/* Existing tags */}
            <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(tag => (
                    <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-ink-muted)]"
                    >
                        {tag.name}
                        <button
                            type="button"
                            onClick={() => handleDelete(tag.id)}
                            disabled={deletingId === tag.id}
                            className="text-[var(--color-ink-subtle)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-40 leading-none"
                            aria-label={`Hapus kategori ${tag.name}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                {tags.length === 0 && (
                    <p className="text-xs text-[var(--color-ink-subtle)] italic">Belum ada kategori.</p>
                )}
            </div>

            {/* Add new */}
            {tags.length < 20 && (
                <form onSubmit={handleAdd} className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Nama kategori…"
                        maxLength={60}
                        className="flex-1 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] text-sm px-3 py-1.5 focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        loading={submitting}
                        disabled={!newName.trim()}
                    >
                        Tambah
                    </Button>
                </form>
            )}
        </div>
    );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

type RenderFormat = 'story' | 'feed_portrait';

function SettingsPreview({ classId, settingsVersion }: { classId: string; settingsVersion: number }) {
    const [format, setFormat]         = useState<RenderFormat>('story');
    const [loremChars, setLoremChars] = useState(300);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState<string | null>(null);

    const abortRef  = useRef<AbortController | null>(null);
    const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchPreview = useCallback(() => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(async () => {
            abortRef.current?.abort();
            abortRef.current = new AbortController();
            const signal = abortRef.current.signal;

            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/admin/classes/${classId}/settings/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                    body: JSON.stringify({ format, lorem_chars: loremChars }),
                    signal,
                });
                if (!res.ok) throw new Error(await res.text());
                const blob = await res.blob();
                if (previewSrc) URL.revokeObjectURL(previewSrc);
                setPreviewSrc(URL.createObjectURL(blob));
            } catch (e) {
                if ((e as Error).name !== 'AbortError') setError('Preview gagal.');
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        }, 600);
    }, [classId, format, loremChars, settingsVersion]); // eslint-disable-line

    useEffect(() => {
        fetchPreview();
        return () => { if (debounce.current) clearTimeout(debounce.current); };
    }, [fetchPreview]);

    const isStory = format === 'story';

    return (
        <div className="space-y-4">
            <SectionTitle>Preview Tampilan Default</SectionTitle>

            {/* Format selector */}
            <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] text-xs font-medium w-fit">
                {(['story', 'feed_portrait'] as RenderFormat[]).map(f => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={`px-3 py-1.5 transition-colors ${format === f ? 'bg-[var(--color-accent)] text-[#0B0D0E]' : 'bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
                    >
                        {f === 'story' ? 'Story' : 'Feed'}
                    </button>
                ))}
            </div>

            {/* Lorem chars slider */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-ink-muted)]">Panjang teks</span>
                    <span className="text-xs font-mono text-[var(--color-ink-subtle)]">{loremChars} karakter</span>
                </div>
                <input
                    type="range"
                    min={100}
                    max={2000}
                    step={100}
                    value={loremChars}
                    onChange={e => setLoremChars(parseInt(e.target.value))}
                    className="w-full accent-[var(--color-accent)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--color-ink-subtle)]">
                    <span>100</span>
                    <span>1000</span>
                    <span>2000</span>
                </div>
            </div>

            {/* Preview image */}
            <div
                className={`relative rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center ${isStory ? 'aspect-[9/16]' : 'aspect-[4/5]'}`}
                style={{ maxWidth: isStory ? '220px' : '260px' }}
            >
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]/80 z-10">
                        <Spinner size={20} />
                    </div>
                )}
                {previewSrc && !error ? (
                    <img src={previewSrc} alt="Preview" className="w-full h-full object-contain" />
                ) : !loading && (
                    <span className="text-xs text-[var(--color-ink-subtle)] text-center px-4">
                        {error ?? 'Memuat preview…'}
                    </span>
                )}
            </div>

            <p className="text-[10px] text-[var(--color-ink-subtle)]">
                Preview menggunakan teks Lorem Ipsum. Simpan pengaturan untuk memperbarui.
            </p>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsIndex({ class: cls, tags = [] }: { class: ClassWorkspace; tags?: Tag[] }) {
    const dr = cls.settings?.default_render ?? {};
    // bump this after save so preview auto-refreshes
    const [savedVersion, setSavedVersion] = useState(0);

    const { data, setData, post, processing, errors } = useForm({
        _method:                  'PATCH' as const,
        name:                     cls.name,
        short_code:               cls.short_code,
        instagram_handle:         cls.instagram_handle ?? '',
        website_label:            cls.website_label ?? '',
        logo:                     null as File | null,
        default_show_logo:        dr.show_logo ?? true,
        default_show_website_url: dr.show_website_url ?? true,
        default_preset:           dr.preset ?? 'editorial_geometry',
        default_background_color: dr.background_color ?? '#1A1F2E',
        default_pattern_key:      dr.pattern_key ?? '',
        default_pattern_color:    dr.pattern_color ?? '#FFFFFF',
        default_pattern_opacity:  dr.pattern_opacity ?? 0.06,
    });

    const [logoFileName, setLogoFileName] = useState('');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/classes/${cls.id}/settings`, {
            forceFormData: true,
            onSuccess: () => setSavedVersion(v => v + 1),
        });
    };

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: cls.name, href: `/admin/classes/${cls.id}` }}
                title="Pengaturan Kelas"
            />

            {/* Two-column on large screens: form left, preview right */}
            <div className="flex flex-col lg:flex-row gap-10 max-w-5xl">

                {/* ── Form ── */}
                <form onSubmit={submit} className="flex-1 space-y-0 min-w-0">
                    {/* Basic Info */}
                    <div>
                        <SectionTitle>Informasi Dasar</SectionTitle>
                        <div className="space-y-4">
                            <Field label="Nama Base" error={errors.name}>
                                <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={INPUT_CLS} required />
                            </Field>
                            <Field label="Kode Base" error={errors.short_code}>
                                <input type="text" value={data.short_code} onChange={(e) => setData('short_code', e.target.value)} className={`${INPUT_CLS} font-mono`} required />
                            </Field>
                            <Field label="Instagram Handle" error={errors.instagram_handle}>
                                <div className="flex rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)] overflow-hidden">
                                    <span className="flex items-center px-3 text-sm text-[var(--color-ink-muted)] border-r border-[var(--color-border)] select-none">@</span>
                                    <input type="text" value={data.instagram_handle} onChange={(e) => setData('instagram_handle', e.target.value)} placeholder="username" className="flex-1 px-3.5 py-2 text-sm bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] focus:outline-none" />
                                </div>
                            </Field>
                            <Field label="Website / Tautan" error={errors.website_label}>
                                <input type="text" value={data.website_label} onChange={(e) => setData('website_label', e.target.value)} placeholder="https://example.com" className={INPUT_CLS} />
                            </Field>
                            <Field label="Logo" error={errors.logo as string | undefined}>
                                <label className="flex items-center gap-3 cursor-pointer rounded-[10px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 py-3 hover:border-[var(--color-accent)] transition-colors">
                                    <span className="text-sm text-[var(--color-ink-muted)] truncate min-w-0">{logoFileName || 'Pilih Gambar Logo'}</span>
                                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0] ?? null; setData('logo', f); setLogoFileName(f?.name ?? ''); }} />
                                </label>
                                {cls.logo_asset_key && <p className="text-xs text-[var(--color-ink-subtle)] mt-1">Saat ini: {cls.logo_asset_key}</p>}
                            </Field>
                        </div>
                    </div>

                    {/* Render Settings */}
                    <div className="pt-6 mt-6 border-t border-[var(--color-border)] space-y-5">
                        <SectionTitle>Tampilan Default Render</SectionTitle>
                        <Toggle id="show_logo"    label="Tampilkan Logo"    checked={data.default_show_logo}        onChange={(v) => setData('default_show_logo', v)} />
                        <Toggle id="show_website" label="Tampilkan Website" checked={data.default_show_website_url} onChange={(v) => setData('default_show_website_url', v)} />

                        {/* Preset picker */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">Preset Desain Default</p>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_OPTIONS.map((p) => {
                                    const selected = data.default_preset === p.key;
                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => {
                                                setData('default_preset', p.key as DesignPreset);
                                                setData('default_background_color', PRESET_DEFAULTS[p.key] ?? '#1A1F2E');
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selected ? 'bg-[var(--color-accent)] text-[#0B0D0E] border-[var(--color-accent)] font-medium' : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'}`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Background color */}
                        <Field label="Warna Background" error={errors.default_background_color}>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={data.default_background_color} onChange={(e) => setData('default_background_color', e.target.value)} className="h-9 w-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] cursor-pointer p-0.5" />
                                <input type="text" value={data.default_background_color} onChange={(e) => setData('default_background_color', e.target.value)} className={`${INPUT_CLS} font-mono`} placeholder="#F5DCE8" />
                            </div>
                        </Field>

                        {/* Pattern picker */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">Pola</p>
                            <div className="flex flex-wrap gap-2">
                                {PATTERN_OPTIONS.map((p) => {
                                    const selected = data.default_pattern_key === p.key;
                                    return (
                                        <button key={p.key ?? '__none__'} type="button" onClick={() => setData('default_pattern_key', p.key ?? '')} className="flex flex-col items-center gap-1.5">
                                            <div className={`w-10 h-10 rounded-lg transition-all ${selected ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-canvas)]' : 'ring-1 ring-[var(--color-border)]'}`} style={p.style} />
                                            <span className="text-[10px] text-[var(--color-ink-subtle)]">{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pattern color */}
                        <Field label="Warna Pola" error={errors.default_pattern_color}>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={data.default_pattern_color} onChange={(e) => setData('default_pattern_color', e.target.value)} className="h-9 w-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] cursor-pointer p-0.5" />
                                <input type="text" value={data.default_pattern_color} onChange={(e) => setData('default_pattern_color', e.target.value)} className={`${INPUT_CLS} font-mono`} placeholder="#FFFFFF" />
                            </div>
                        </Field>

                        {/* Pattern opacity */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                                Opacity Pola — <span className="normal-case text-[var(--color-ink-subtle)]">{data.default_pattern_opacity.toFixed(2)}</span>
                            </p>
                            <input type="range" min="0" max="1" step="0.01" value={data.default_pattern_opacity} onChange={(e) => setData('default_pattern_opacity', parseFloat(e.target.value))} className="w-full accent-[var(--color-accent)]" />
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--color-border)]">
                        <Button type="submit" loading={processing}>Simpan Pengaturan</Button>
                    </div>
                </form>

                {/* ── Right column ── */}
                <div className="lg:w-72 shrink-0 space-y-8">
                    {/* Kategori */}
                    <KategoriManager classId={cls.id} tags={tags} />
                    {/* Preview */}
                    <div className="lg:sticky lg:top-6">
                        <SettingsPreview classId={cls.id} settingsVersion={savedVersion} />
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
