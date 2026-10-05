import AdminLayout from '@/Layouts/AdminLayout';
import { Button, ConfirmDialog, PageHeader, SectionTitle } from '@/components/ui';
import { ClassDesign, ClassWorkspace } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

// Aspect ratios for crop overlay: story=9:16, feed_portrait=4:5
const CROP_AR: Record<string, number> = { story: 9 / 16, feed_portrait: 4 / 5 };

export default function DesignShow({
    class: cls,
    design,
    previewUrl,
}: {
    class: ClassWorkspace;
    design: ClassDesign;
    previewUrl: string | null;
}) {
    const { data, setData, patch, processing, errors } = useForm({
        name:    design.name,
        focal_x: design.focal_x ?? 0.5,
        focal_y: design.focal_y ?? 0.5,
    });

    const [feedFallback, setFeedFallback] = useState(design.feed_fallback_crop);
    const [derivingFeed, setDerivingFeed] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting]           = useState(false);

    const imgContainerRef = useRef<HTMLDivElement>(null);
    const dragging        = useRef(false);

    const INPUT_CLS = 'w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]';

    function save(e: React.FormEvent) {
        e.preventDefault();
        patch(`/admin/classes/${cls.id}/designs/${design.id}`);
    }

    async function deriveFeed() {
        setDerivingFeed(true);
        try {
            const res = await fetch(`/admin/classes/${cls.id}/designs/${design.id}/derive-feed`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name=csrf-token]') as HTMLMetaElement)?.content ?? '',
                },
                body: JSON.stringify({ focal_x: data.focal_x, focal_y: data.focal_y }),
            });
            const json = await res.json();
            setFeedFallback(json.feed_fallback_crop);
        } finally {
            setDerivingFeed(false);
        }
    }

    function doDelete() {
        setDeleting(true);
        router.delete(`/admin/classes/${cls.id}/designs/${design.id}`, {
            onFinish: () => { setDeleting(false); setConfirmDelete(false); },
        });
    }

    const updateFocalFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
        const el = imgContainerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (e.clientY - rect.top)  / rect.height));
        setData((prev) => ({ ...prev, focal_x: parseFloat(x.toFixed(2)), focal_y: parseFloat(y.toFixed(2)) }));
    }, [setData]);

    function onMouseDown(e: React.MouseEvent) {
        dragging.current = true;
        updateFocalFromEvent(e);

        const onMove = (ev: MouseEvent) => { if (dragging.current) updateFocalFromEvent(ev); };
        const onUp   = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    }

    // Crop overlay dimensions (as % of container)
    const ar    = CROP_AR[design.format] ?? 1;
    const cropW = ar < 1 ? `${ar * 100}%` : '100%';
    const cropH = ar < 1 ? '100%' : `${(1 / ar) * 100}%`;

    const crop = design.crop_x != null
        ? `${Math.round(design.crop_x)}, ${Math.round(design.crop_y ?? 0)}  ${Math.round(design.crop_width ?? 0)}×${Math.round(design.crop_height ?? 0)}`
        : 'Full image';

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: 'Desain', href: `/admin/classes/${cls.id}/designs` }}
                title={design.name}
                subtitle={`${design.format === 'story' ? 'Story (9:16)' : 'Feed Portrait (4:5)'} · Slot ${design.slot_index} · ${design.source_width}×${design.source_height}`}
            />

            <div className="grid gap-8 lg:grid-cols-2">
                {/* LEFT — visual focal point editor (KEEP EXACTLY AS IS) */}
                <div className="space-y-3">
                    <div
                        ref={imgContainerRef}
                        className="relative select-none rounded-xl overflow-hidden border border-[var(--color-border)] cursor-crosshair bg-[var(--color-surface)]"
                        onMouseDown={onMouseDown}
                    >
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Design source"
                                className="w-full object-contain max-h-[600px] pointer-events-none"
                                draggable={false}
                            />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-[var(--color-ink-subtle)] text-sm">
                                Preview tidak tersedia
                            </div>
                        )}

                        {/* Crop overlay */}
                        <div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            aria-hidden
                        >
                            <div
                                style={{ width: cropW, height: cropH }}
                                className="border-2 border-white/40 rounded-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]"
                            />
                        </div>

                        {/* Focal dot */}
                        <div
                            className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ left: `${data.focal_x * 100}%`, top: `${data.focal_y * 100}%` }}
                            aria-hidden
                        >
                            <div className="w-5 h-5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] bg-[var(--color-accent)]/60" />
                            <div className="absolute left-1/2 top-0 w-px h-5 bg-white/60 -translate-x-px" />
                            <div className="absolute top-1/2 left-0 h-px w-5 bg-white/60 -translate-y-px" />
                        </div>
                    </div>

                    <div className="text-xs font-mono text-[var(--color-ink-subtle)]">
                        Focal: {data.focal_x.toFixed(2)}, {data.focal_y.toFixed(2)} · Crop: {crop}
                        {feedFallback && (
                            <span className="ml-2 text-[var(--color-success)]">
                                · Feed fallback: {Math.round((feedFallback as any).x)},{Math.round((feedFallback as any).y)} {Math.round((feedFallback as any).width)}×{Math.round((feedFallback as any).height)}
                            </span>
                        )}
                    </div>
                </div>

                {/* RIGHT — controls, flat sections */}
                <div>
                    <form onSubmit={save} className="space-y-4">
                        <SectionTitle>Simpan Perubahan</SectionTitle>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">Nama</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className={INPUT_CLS}
                            />
                            {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                                Focal X — <span className="normal-case text-[var(--color-ink-subtle)]">{data.focal_x.toFixed(2)}</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={data.focal_x}
                                onChange={(e) => setData('focal_x', parseFloat(e.target.value))}
                                className="w-full accent-[var(--color-accent)]"
                            />
                            {errors.focal_x && <p className="text-xs text-[var(--color-danger)]">{errors.focal_x}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                                Focal Y — <span className="normal-case text-[var(--color-ink-subtle)]">{data.focal_y.toFixed(2)}</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={data.focal_y}
                                onChange={(e) => setData('focal_y', parseFloat(e.target.value))}
                                className="w-full accent-[var(--color-accent)]"
                            />
                        </div>

                        <Button type="submit" loading={processing}>
                            Simpan Perubahan
                        </Button>
                    </form>

                    {design.format === 'story' && (
                        <div className="pt-5 mt-5 border-t border-[var(--color-border)] space-y-3">
                            <SectionTitle>Fallback Feed</SectionTitle>
                            {feedFallback ? (
                                <p className="text-xs text-[var(--color-success)]">Fallback crop sudah dikonfigurasi</p>
                            ) : (
                                <p className="text-xs text-[var(--color-warning)]">Belum ada fallback crop</p>
                            )}
                            <p className="text-xs text-[var(--color-ink-subtle)]">
                                Menghasilkan versi Feed Portrait (4:5) dari gambar Story ini menggunakan focal point saat ini.
                            </p>
                            <Button variant="secondary" loading={derivingFeed} onClick={deriveFeed} type="button">
                                Hitung Ulang Feed Fallback
                            </Button>
                        </div>
                    )}

                    <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                        <SectionTitle>Hapus Desain</SectionTitle>
                        <Button
                            variant="danger-ghost"
                            icon={<Trash2 size={14} />}
                            onClick={() => setConfirmDelete(true)}
                            type="button"
                        >
                            Hapus Desain Ini
                        </Button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={doDelete}
                title="Hapus desain ini?"
                description="Desain akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Hapus"
                danger
                loading={deleting}
            />
        </AdminLayout>
    );
}
