import AdminLayout from '@/Layouts/AdminLayout';
import { Alert, Button, EmptyState, PageHeader, Select, Tabs } from '@/components/ui';
import { ClassDesign, ClassWorkspace, RenderFormat, Submission } from '@/types';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

const PRESETS = [
    { key: 'editorial_geometry', label: 'Editorial',    bg: '#1A1F2E' },
    { key: 'typographic_poster', label: 'Poster',       bg: '#0D0D0D' },
    { key: 'quiet_editorial',    label: 'Quiet',        bg: '#E8E0D4' },
    { key: 'grid_technical',     label: 'Grid',         bg: '#111214' },
    { key: 'bold_block',         label: 'Bold Block',   bg: '#E84B2A' },
];

function csrfToken(): string {
    return (document.querySelector('meta[name=csrf-token]') as HTMLMetaElement)?.content ?? '';
}

export default function ApprovedIndex({
    class: cls,
    submissions,
    designs,
    filter,
}: {
    class: ClassWorkspace;
    submissions: Paginated<Submission>;
    designs: ClassDesign[];
    filter: string;
}) {
    const [selected, setSelected]           = useState<Set<string>>(new Set());
    const [showBulk, setShowBulk]           = useState(false);
    const [batchFormat, setBatchFormat]   = useState<RenderFormat>('story');
    const [batchPreset, setBatchPreset]   = useState('editorial_geometry');
    const [batchDesignId, setBatchDesignId] = useState<string>('');
    const [overrides, setOverrides]         = useState<Record<string, string>>({});
    const [bulkLoading, setBulkLoading]     = useState(false);
    const [bulkError, setBulkError]         = useState<string | null>(null);

    const eligibleIds = submissions.data
        .filter((s) => s.status === 'approved')
        .map((s) => s.id);

    const allChecked = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

    const toggleAll = () => setSelected(allChecked ? new Set() : new Set(eligibleIds));

    const toggle = (id: string) => {
        const next = new Set(selected);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelected(next);
    };

    function buildBulkConfig() {
        if (batchDesignId) return { source: 'custom', class_design_id: batchDesignId };
        const p = PRESETS.find(p => p.key === batchPreset)!;
        return { source: 'builtin', preset: batchPreset, background_color: p?.bg ?? '#1A1F2E' };
    }

    async function sendBulkRender() {
        setBulkLoading(true);
        setBulkError(null);
        try {
            const itemOverrides: Record<string, object> = {};
            for (const [id, key] of Object.entries(overrides)) {
                if (!key) continue;
                if (designs.some((d) => d.id === key)) {
                    itemOverrides[id] = { design: { source: 'custom', class_design_id: key } };
                } else {
                    const preset = PRESETS.find((p) => p.key === key);
                    if (preset) {
                        itemOverrides[id] = { design: { source: 'builtin', preset: key, background_color: preset.bg } };
                    }
                }
            }

            const res = await fetch(`/admin/classes/${cls.id}/approved/bulk-render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':  csrfToken(),
                },
                body: JSON.stringify({
                    submission_ids: Array.from(selected),
                    format:         batchFormat,
                    bulk_config:    { design: buildBulkConfig() },
                    item_overrides: itemOverrides,
                }),
            });

            if (!res.ok) {
                const txt = await res.text();
                setBulkError('Bulk render gagal: ' + txt);
                return;
            }

            const blob        = await res.blob();
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const fnMatch     = disposition.match(/filename="([^"]+)"/);
            const filename    = fnMatch?.[1] ?? `bulk_${batchFormat}.zip`;

            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href    = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            setSelected(new Set());
            setShowBulk(false);
        } finally {
            setBulkLoading(false);
        }
    }

    const FILTER_TABS = [
        { value: 'all',        label: 'Semua' },
        { value: 'not_posted', label: 'Belum Diposting' },
        { value: 'posted',     label: 'Sudah Diposting' },
        { value: 'taken_down', label: 'Diturunkan' },
    ];

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: cls.name, href: `/admin/classes/${cls.id}` }}
                title="Konten Disetujui"
            />

            <Tabs
                items={FILTER_TABS}
                value={filter}
                onChange={(v) => router.visit(`/admin/classes/${cls.id}/approved?filter=${v}`)}
                className="mb-6"
            />

            {submissions.data.length === 0 ? (
                <EmptyState
                    title="Belum ada konten"
                    description="Konten yang disetujui akan muncul di sini."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="px-3 py-2.5 w-8">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={toggleAll}
                                        aria-label="Pilih semua"
                                        className="accent-[var(--color-accent)]"
                                    />
                                </th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">Public ID</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">Pesan</th>
                                <th className="hidden md:table-cell px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">Kategori</th>
                                <th className="hidden md:table-cell px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">Disetujui</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">Diposting</th>
                                <th className="px-3 py-2.5 w-12" />
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.data.map((sub) => {
                                const takenDown = sub.status === 'taken_down';
                                return (
                                    <tr
                                        key={sub.id}
                                        onClick={() => router.visit(`/admin/classes/${cls.id}/approved/${sub.id}`)}
                                        className={`border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-raised)] cursor-pointer ${takenDown ? 'opacity-50' : ''}`}
                                    >
                                        <td className="px-3 py-3">
                                            <div
                                                onClick={e => { e.stopPropagation(); if (!takenDown) toggle(sub.id); }}
                                                className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors cursor-pointer ${
                                                    selected.has(sub.id)
                                                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                                                        : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]'
                                                }`}
                                                role="checkbox"
                                                aria-checked={selected.has(sub.id)}
                                                aria-label={`Pilih ${sub.public_id}`}
                                            >
                                                {selected.has(sub.id) && (
                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                        <path d="M1 4L3.5 6.5L9 1" stroke="#0B0D0E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`font-mono text-xs font-medium ${takenDown ? 'line-through text-[var(--color-ink-subtle)]' : 'text-[var(--color-ink)]'}`}
                                            >
                                                {sub.public_id}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 max-w-xs">
                                            <p className={`line-clamp-1 text-sm ${takenDown ? 'line-through text-[var(--color-ink-subtle)]' : 'text-[var(--color-ink-muted)]'}`}>
                                                {sub.moderated_message ?? sub.original_message}
                                            </p>
                                        </td>
                                        <td className="hidden md:table-cell px-3 py-3 text-xs text-[var(--color-ink-subtle)]">
                                            {sub.category ?? '—'}
                                        </td>
                                        <td className="hidden md:table-cell px-3 py-3 text-xs text-[var(--color-ink-subtle)]">
                                            {sub.approved_at ? new Date(sub.approved_at).toLocaleDateString('id-ID') : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-xs">
                                            {sub.posted_at
                                                ? <span className="text-[var(--color-success)]">Sudah</span>
                                                : <span className="text-[var(--color-ink-subtle)]">Belum</span>}
                                        </td>
                                        <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                                            <Link
                                                href={`/admin/classes/${cls.id}/approved/${sub.id}`}
                                                className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-text)] transition-colors"
                                            >
                                                Buka
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {(submissions.prev_page_url || submissions.next_page_url) && (
                <div className="mt-5 flex justify-between">
                    {submissions.prev_page_url
                        ? <Link href={submissions.prev_page_url} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">← Sebelumnya</Link>
                        : <span />}
                    {submissions.next_page_url
                        ? <Link href={submissions.next_page_url} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">Berikutnya →</Link>
                        : <span />}
                </div>
            )}

            {/* Sticky bulk bar */}
            {selected.size > 0 && (
                <div className="fixed bottom-0 inset-x-0 z-20 flex items-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm px-6 py-3">
                    <span className="text-sm font-medium text-[var(--color-ink)]">{selected.size} dipilih</span>
                    <Button variant="primary" size="sm" onClick={() => setShowBulk(true)}>
                        Buat Gambar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="ml-auto">
                        Batalkan
                    </Button>
                </div>
            )}

            {/* Bulk config modal */}
            {showBulk && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
                            <h2 className="text-base font-semibold text-[var(--color-ink)]">
                                Buat Gambar ({selected.size} item)
                            </h2>
                            <button
                                onClick={() => setShowBulk(false)}
                                aria-label="Tutup"
                                className="text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {bulkError && (
                                <Alert variant="error">{bulkError}</Alert>
                            )}

                            {/* Format */}
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] mb-2">Format</p>
                                <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] text-sm font-medium">
                                    {(['story', 'feed_portrait'] as RenderFormat[]).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setBatchFormat(f)}
                                            className={`flex-1 px-3 py-2 transition-colors ${batchFormat === f ? 'bg-[var(--color-accent)] text-[#0B0D0E]' : 'bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]'}`}
                                        >
                                            {f === 'story' ? 'Story' : 'Feed Portrait'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preset picker */}
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] mb-2">Desain</p>
                                <div className="flex flex-wrap gap-2">
                                    {PRESETS.map((p) => {
                                        const isSel = !batchDesignId && batchPreset === p.key;
                                        return (
                                            <button
                                                key={p.key}
                                                onClick={() => { setBatchPreset(p.key); setBatchDesignId(''); }}
                                                className={`px-3 py-1.5 rounded-[8px] text-sm border transition-colors ${isSel ? 'bg-[var(--color-accent)] text-[#0B0D0E] border-[var(--color-accent)] font-medium' : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'}`}
                                            >
                                                {p.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {designs.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[9px] text-[var(--color-ink-subtle)] uppercase tracking-wide mb-2">Background Kustom</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {designs.map((d) => {
                                                const isSel = batchDesignId === d.id;
                                                return (
                                                    <button
                                                        key={d.id}
                                                        onClick={() => { setBatchDesignId(d.id); setBatchPreset(''); }}
                                                        className="flex flex-col items-center gap-1.5 group"
                                                    >
                                                        <div className={`w-10 h-10 rounded-[8px] bg-[var(--color-surface-raised)] border-2 flex items-center justify-center transition-all ${isSel ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)] group-hover:border-[var(--color-border-strong)]'}`}>
                                                            <span className="text-[8px] text-[var(--color-ink-subtle)] uppercase">{d.format === 'story' ? 'S' : 'F'}</span>
                                                        </div>
                                                        <span className="text-[10px] text-[var(--color-ink-muted)] text-center leading-tight w-full truncate">{d.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Per-item overrides */}
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] mb-2">Override per Item (opsional)</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {Array.from(selected).map((id) => {
                                        const sub = submissions.data.find((s) => s.id === id);
                                        return (
                                            <div key={id} className="flex items-center gap-2 text-sm">
                                                <span className="font-mono text-xs text-[var(--color-ink-muted)] w-28 shrink-0 truncate">
                                                    {sub?.public_id ?? id.slice(0, 8)}
                                                </span>
                                                <Select
                                                    value={overrides[id] ?? ''}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setOverrides((prev) =>
                                                            v ? { ...prev, [id]: v }
                                                              : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id))
                                                        );
                                                    }}
                                                    className="flex-1 text-xs"
                                                >
                                                    <option value="">Gunakan desain batch</option>
                                                    {PRESETS.map((p) => (
                                                        <option key={p.key} value={p.key}>{p.label}</option>
                                                    ))}
                                                    {designs.map((d) => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </Select>
                                                {overrides[id] && (
                                                    <span className="text-[10px] text-[var(--color-accent)] shrink-0">Override</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <Button variant="primary" onClick={sendBulkRender} loading={bulkLoading}>
                                    Generate &amp; Unduh ZIP
                                </Button>
                                <Button variant="ghost" onClick={() => setShowBulk(false)}>
                                    Batal
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
