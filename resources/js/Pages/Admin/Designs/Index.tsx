import AdminLayout from '@/Layouts/AdminLayout';
import { Button, ConfirmDialog, PageHeader, SectionTitle } from '@/components/ui';
import { ClassDesign, ClassWorkspace, RenderFormat } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Trash2, UploadCloud } from 'lucide-react';
import { useState } from 'react';

const FORMAT_LABELS: Record<RenderFormat, string> = {
    story:         'Story (9:16)',
    feed_portrait: 'Feed Portrait (4:5)',
};

const SELECT_CLS =
    'w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] appearance-none cursor-pointer';

const INPUT_CLS =
    'w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]';

export default function DesignsIndex({
    class: cls,
    designs,
}: {
    class: ClassWorkspace;
    designs: ClassDesign[];
}) {
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting]           = useState(false);
    const [fileName, setFileName]           = useState('');

    const { data, setData, post, processing, errors, reset } = useForm<{
        format:     RenderFormat;
        slot_index: number;
        name:       string;
        image:      File | null;
    }>({
        format:     'story',
        slot_index: 1,
        name:       '',
        image:      null,
    });

    const usedSlots      = (fmt: RenderFormat) => new Set(designs.filter((d) => d.format === fmt).map((d) => d.slot_index));
    const availableSlots = (fmt: RenderFormat) => ([1, 2, 3] as const).filter((s) => !usedSlots(fmt).has(s));

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/admin/classes/${cls.id}/designs`, {
            forceFormData: true,
            onSuccess: () => { reset(); setFileName(''); },
        });
    }

    function doDelete() {
        if (!confirmDelete) return;
        setDeleting(true);
        router.delete(`/admin/classes/${cls.id}/designs/${confirmDelete.id}`, {
            onFinish: () => { setDeleting(false); setConfirmDelete(null); },
        });
    }

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: cls.name, href: `/admin/classes/${cls.id}` }}
                title="Desain Background"
            />

            {(['story', 'feed_portrait'] as RenderFormat[]).map((fmt) => (
                <section key={fmt} className="mb-8">
                    <SectionTitle>{FORMAT_LABELS[fmt]}</SectionTitle>
                    <div className="grid gap-px sm:grid-cols-3 bg-[var(--color-border)]">
                        {([1, 2, 3] as const).map((slot) => {
                            const design = designs.find((d) => d.format === fmt && d.slot_index === slot);
                            return design ? (
                                <div
                                    key={slot}
                                    className="bg-[var(--color-canvas)] p-4 flex flex-col gap-3"
                                >
                                    <div>
                                        <p className="text-[10px] text-[var(--color-ink-subtle)] mb-0.5 font-mono">Slot {slot}</p>
                                        <p className="text-sm font-medium text-[var(--color-ink)] truncate">{design.name}</p>
                                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                                            {design.source_width}×{design.source_height}
                                            {design.feed_fallback_crop && (
                                                <span className="ml-1.5 text-[var(--color-success)]">· fallback</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5 mt-auto">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.visit(`/admin/classes/${cls.id}/designs/${design.id}`)}
                                        >
                                            Edit Focal
                                        </Button>
                                        <Button
                                            variant="danger-ghost"
                                            size="sm"
                                            icon={<Trash2 size={12} />}
                                            className="ml-auto"
                                            onClick={() => setConfirmDelete({ id: design.id, name: design.name })}
                                        >
                                            Hapus
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={slot}
                                    className="bg-[var(--color-canvas)] p-4 flex flex-col items-center justify-center min-h-[100px] border border-dashed border-[var(--color-border-strong)]"
                                >
                                    <p className="text-[10px] font-mono text-[var(--color-ink-subtle)] mb-1">Slot {slot}</p>
                                    <p className="text-xs text-[var(--color-ink-subtle)]">Kosong</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}

            {/* Upload form — flat, no card */}
            <div className="pt-6 border-t border-[var(--color-border)]">
                <SectionTitle>Upload Desain Baru</SectionTitle>
                <form onSubmit={submit} encType="multipart/form-data" className="space-y-4 max-w-lg">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                                Format
                            </label>
                            <select
                                value={data.format}
                                onChange={(e) => {
                                    const fmt = e.target.value as RenderFormat;
                                    setData('format', fmt);
                                    setData('slot_index', availableSlots(fmt)[0] ?? 1);
                                }}
                                className={SELECT_CLS}
                            >
                                <option value="story">Story (9:16 · 1080×1920)</option>
                                <option value="feed_portrait">Feed Portrait (4:5 · 1080×1350)</option>
                            </select>
                            {errors.format && <p className="text-xs text-[var(--color-danger)]">{errors.format}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                                Slot
                            </label>
                            <select
                                value={data.slot_index}
                                onChange={(e) => setData('slot_index', parseInt(e.target.value))}
                                className={SELECT_CLS}
                            >
                                {([1, 2, 3] as const).map((s) => {
                                    const taken = usedSlots(data.format).has(s);
                                    return (
                                        <option key={s} value={s} disabled={taken}>
                                            Slot {s}{taken ? ' (terisi)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            {errors.slot_index && <p className="text-xs text-[var(--color-danger)]">{errors.slot_index}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                            Nama (opsional)
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="mis. Pink Gradient"
                            className={INPUT_CLS}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                            Gambar (JPG / PNG / WebP, maks 20 MB, maks 6000px)
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer rounded-[10px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 py-3 hover:border-[var(--color-accent)] transition-colors">
                            <UploadCloud size={16} className="text-[var(--color-ink-muted)] shrink-0" />
                            <span className="text-sm text-[var(--color-ink-muted)] truncate min-w-0">
                                {fileName || 'Pilih file gambar…'}
                            </span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                required
                                onChange={(e) => {
                                    const f = e.target.files?.[0] ?? null;
                                    setData('image', f);
                                    setFileName(f?.name ?? '');
                                }}
                            />
                        </label>
                        {errors.image && <p className="text-xs text-[var(--color-danger)]">{errors.image}</p>}
                    </div>

                    <Button type="submit" loading={processing} icon={<UploadCloud size={14} />}>
                        Upload Desain
                    </Button>
                </form>
            </div>

            <ConfirmDialog
                open={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={doDelete}
                title={`Hapus "${confirmDelete?.name}"?`}
                description="Desain akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Hapus"
                danger
                loading={deleting}
            />
        </AdminLayout>
    );
}
