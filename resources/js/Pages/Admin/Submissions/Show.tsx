import AdminLayout from '@/Layouts/AdminLayout';
import { Alert, Button, Field, PageHeader, SectionTitle, StatusBadge, Textarea } from '@/components/ui';
import { ClassWorkspace, Submission, Tag } from '@/types';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

// Simple regex PII check — warn admin, no server processing
function detectPii(text: string): string[] {
    const warnings: string[] = [];
    if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text)) warnings.push('alamat email');
    if (/(\+62|0)[0-9]{8,13}/.test(text)) warnings.push('nomor telepon');
    return warnings;
}

export default function SubmissionShow({
    class: cls,
    submission,
    class_tags = [],
}: {
    class: ClassWorkspace;
    submission: Submission;
    class_tags?: Tag[];
}) {
    const editForm = useForm({
        target_text:   submission.target_text ?? '',
        alias_text:    submission.alias_text ?? '',
        category:      submission.category ?? '',
        song_text:     submission.song_text ?? '',
        artist_text:   submission.artist_text ?? '',
        tag_ids:       (submission.tags ?? []).map(t => t.id),
        internal_note: submission.internal_note ?? '',
    });

    const approveForm = useForm({
        target_text:   submission.target_text ?? '',
        alias_text:    submission.alias_text ?? '',
        category:      submission.category ?? '',
        song_text:     submission.song_text ?? '',
        artist_text:   submission.artist_text ?? '',
        tag_ids:       (submission.tags ?? []).map(t => t.id),
        internal_note: submission.internal_note ?? '',
    });

    const rejectForm = useForm({ rejection_reason: '', internal_note: submission.internal_note ?? '' });

    const [showReject, setShowReject] = useState(false);

    const piiWarnings = detectPii(submission.original_message);
    const canModerate = ['submitted', 'under_review'].includes(submission.status);

    const fieldClass = 'w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]';

    function syncField(field: string, value: string) {
        editForm.setData(field as never, value as never);
        approveForm.setData(field as never, value as never);
    }

    function toggleTag(id: string) {
        const prev = editForm.data.tag_ids;
        const next = prev.includes(id)
            ? prev.filter(t => t !== id)
            : prev.length < 3 ? [...prev, id] : prev;
        editForm.setData('tag_ids', next);
        approveForm.setData('tag_ids', next);
    }

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: 'Inbox', href: `/admin/classes/${cls.id}/submissions` }}
                title="Detail Pesan"
                action={<StatusBadge status={submission.status} />}
            />

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Original message */}
                    <div>
                        <SectionTitle>Pesan Asli</SectionTitle>
                        <p className="mt-3 text-sm text-[var(--color-ink)] whitespace-pre-wrap leading-relaxed">
                            {submission.original_message}
                        </p>
                        {/* Read-only original metadata */}
                        {(submission.target_text || submission.alias_text) && (
                            <div className="mt-3 flex gap-4 text-xs text-[var(--color-ink-subtle)]">
                                {submission.target_text && <span>Untuk: <span className="text-[var(--color-ink-muted)]">{submission.target_text}</span></span>}
                                {submission.alias_text  && <span>Dari: <span className="text-[var(--color-ink-muted)]">{submission.alias_text}</span></span>}
                            </div>
                        )}
                        {(submission.song_text || submission.artist_text) && (
                            <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                                🎵 {[submission.song_text, submission.artist_text].filter(Boolean).join(' — ')}
                            </p>
                        )}
                        {(submission.tags ?? []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {submission.tags!.map(t => (
                                    <span key={t.id} className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)] border border-[var(--color-border)]">
                                        #{t.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PII warning */}
                    {piiWarnings.length > 0 && (
                        <Alert variant="warning">
                            <strong>Perhatian:</strong> pesan mungkin mengandung {piiWarnings.join(', ')}. Tinjau sebelum menyetujui.
                        </Alert>
                    )}

                    {/* Moderation fields */}
                    <div className="pt-6 border-t border-[var(--color-border)] space-y-4">
                        <SectionTitle>Versi Moderasi</SectionTitle>

                        <p className="text-sm text-[var(--color-ink)] whitespace-pre-wrap leading-relaxed bg-[var(--color-surface-raised)] rounded-[10px] px-3.5 py-3">
                            {submission.original_message}
                        </p>
                        <p className="text-xs text-[var(--color-ink-subtle)]">
                            Pesan asli digunakan untuk generate gambar. Hubungi admin jika ada masalah.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Untuk">
                                <input type="text" className={fieldClass}
                                    value={editForm.data.target_text}
                                    onChange={(e) => syncField('target_text', e.target.value)}
                                />
                            </Field>
                            <Field label="Dari">
                                <input type="text" className={fieldClass}
                                    value={editForm.data.alias_text}
                                    onChange={(e) => syncField('alias_text', e.target.value)}
                                />
                            </Field>
                        </div>

                        <Field label="Kategori">
                            <input type="text" className={fieldClass}
                                value={editForm.data.category}
                                onChange={(e) => syncField('category', e.target.value)}
                            />
                        </Field>

                        {/* Music */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Judul Lagu" hint="Opsional">
                                <input type="text" className={fieldClass}
                                    value={editForm.data.song_text}
                                    onChange={(e) => syncField('song_text', e.target.value)}
                                    maxLength={200}
                                />
                            </Field>
                            <Field label="Artis" hint="Opsional">
                                <input type="text" className={fieldClass}
                                    value={editForm.data.artist_text}
                                    onChange={(e) => syncField('artist_text', e.target.value)}
                                    maxLength={120}
                                />
                            </Field>
                        </div>

                        {/* Tags */}
                        {class_tags.length > 0 && (
                            <Field label="Tag" hint="Maks. 3">
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {class_tags.map(tag => {
                                        const sel = editForm.data.tag_ids.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleTag(tag.id)}
                                                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                                    sel
                                                        ? 'bg-[var(--color-accent)] text-[#0B0D0E] border-[var(--color-accent)] font-medium'
                                                        : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                                                }`}
                                            >
                                                #{tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>
                        )}

                        <Field label="Catatan Internal">
                            <Textarea
                                rows={2}
                                value={editForm.data.internal_note}
                                onChange={(e) => {
                                    syncField('internal_note', e.target.value);
                                    rejectForm.setData('internal_note', e.target.value);
                                }}
                            />
                        </Field>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => editForm.patch(`/admin/classes/${cls.id}/submissions/${submission.id}`)}
                            loading={editForm.processing}
                        >
                            Simpan Draft
                        </Button>
                    </div>

                    {/* Action buttons */}
                    {canModerate && (
                        <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-3">
                            <button
                                onClick={() => approveForm.post(`/admin/classes/${cls.id}/submissions/${submission.id}/approve`)}
                                disabled={approveForm.processing}
                                className="inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-colors px-5 py-2.5 text-sm bg-[var(--color-success)] text-[#0A1A10] hover:opacity-90 disabled:opacity-40"
                            >
                                {approveForm.processing ? 'Memproses…' : 'Setujui'}
                            </button>
                            <Button variant="danger-ghost" size="lg" onClick={() => setShowReject((v) => !v)}>
                                Tolak
                            </Button>
                        </div>
                    )}

                    {/* Reject form */}
                    {showReject && (
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-[var(--color-danger)]">Tolak pesan ini</p>
                            <Field label="Alasan Tolak (internal, opsional)">
                                <input
                                    type="text"
                                    className={fieldClass}
                                    placeholder="Opsional…"
                                    value={rejectForm.data.rejection_reason}
                                    onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                                />
                            </Field>
                            <div className="flex gap-2">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => rejectForm.post(`/admin/classes/${cls.id}/submissions/${submission.id}/reject`)}
                                    loading={rejectForm.processing}
                                >
                                    Konfirmasi Tolak
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>Batal</Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-3 text-sm">
                    <SectionTitle>Meta</SectionTitle>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--color-ink-muted)]">Status</span>
                            <StatusBadge status={submission.status} />
                        </div>
                        {submission.public_id && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[var(--color-ink-muted)]">Public ID</span>
                                <span className="font-mono text-xs text-[var(--color-ink)]">{submission.public_id}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--color-ink-muted)]">Dikirim</span>
                            <span className="text-[var(--color-ink)]">{new Date(submission.created_at).toLocaleString('id-ID')}</span>
                        </div>
                        {submission.approved_at && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[var(--color-ink-muted)]">Disetujui</span>
                                <span className="text-[var(--color-ink)]">{new Date(submission.approved_at).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {submission.rejected_at && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[var(--color-ink-muted)]">Ditolak</span>
                                <span className="text-[var(--color-ink)]">{new Date(submission.rejected_at).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
