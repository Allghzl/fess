import AdminLayout from '@/Layouts/AdminLayout';
import { ClassWorkspace, Submission, TakedownRequest } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    PageHeader, Alert, SectionTitle, StatusBadge,
    Button, ConfirmDialog, Textarea,
} from '@/components/ui';

const REASON_LABEL: Record<string, string> = {
    privacy:          'Privasi',
    personal_data:    'Data Pribadi',
    harassment:       'Pelecehan',
    defamation:       'Pencemaran',
    sender_request:   'Permintaan Pengirim',
    subject_request:  'Permintaan Subjek',
    wrong_submission: 'Salah Kirim',
    other:            'Lainnya',
};

export default function TakedownShow({
    class: cls,
    takedown,
    flash,
}: {
    class: ClassWorkspace;
    takedown: TakedownRequest & { submission?: Submission };
    flash?: { takedown_approved?: boolean };
}) {
    const [confirmApprove, setConfirmApprove] = useState(false);
    const approveForm = useForm({ admin_note: '' });
    const rejectForm  = useForm({ admin_note: '' });

    const canHandle = ['pending', 'reviewing'].includes(takedown.status);

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: 'Antrian Takedown', href: `/admin/classes/${cls.id}/takedowns` }}
                title="Detail Takedown"
            />

            {flash?.takedown_approved && (
                <Alert variant="warning" className="mb-5">
                    Konten sudah ditandai diturunkan. Jika masih ada di Instagram, hapus secara manual.
                </Alert>
            )}

            <ConfirmDialog
                open={confirmApprove}
                onClose={() => setConfirmApprove(false)}
                onConfirm={() => {
                    setConfirmApprove(false);
                    approveForm.post(`/admin/classes/${cls.id}/takedowns/${takedown.id}/approve`);
                }}
                title="Yakin ingin menyetujui takedown?"
                description="Konten akan ditandai sebagai diturunkan. Penghapusan dari Instagram tetap manual."
                confirmLabel="Setujui Takedown"
                danger
                loading={approveForm.processing}
            />

            <div className="max-w-2xl space-y-0">
                {/* Request info */}
                <div>
                    <SectionTitle>Info Permintaan</SectionTitle>
                    <dl className="space-y-2.5 text-sm">
                        <div className="flex gap-2">
                            <dt className="text-[var(--color-ink-muted)] shrink-0 w-24">Public ID</dt>
                            <dd className="font-mono font-medium text-[var(--color-ink)]">{takedown.public_id_snapshot}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-[var(--color-ink-muted)] shrink-0 w-24">Alasan</dt>
                            <dd className="text-[var(--color-ink)]">{REASON_LABEL[takedown.reason_code] ?? takedown.reason_code}</dd>
                        </div>
                        {takedown.reason_text && (
                            <div>
                                <dt className="text-[var(--color-ink-muted)] mb-1">Penjelasan</dt>
                                <dd className="text-[var(--color-ink)] whitespace-pre-wrap">{takedown.reason_text}</dd>
                            </div>
                        )}
                        {takedown.contact && (
                            <div className="flex gap-2">
                                <dt className="text-[var(--color-ink-muted)] shrink-0 w-24">Kontak</dt>
                                <dd className="text-[var(--color-ink)]">{takedown.contact}</dd>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <dt className="text-[var(--color-ink-muted)] shrink-0 w-24">Dikirim</dt>
                            <dd className="text-[var(--color-ink)]">{new Date(takedown.created_at).toLocaleString('id-ID')}</dd>
                        </div>
                        <div className="flex items-center gap-2">
                            <dt className="text-[var(--color-ink-muted)] shrink-0 w-24">Status</dt>
                            <dd><StatusBadge status={takedown.status} /></dd>
                        </div>
                        {takedown.handled_at && (
                            <div className="flex gap-2">
                                <dt className="text-[var(--color-ink-muted)] shrink-0 w-24">Diselesaikan</dt>
                                <dd className="text-[var(--color-ink)]">{new Date(takedown.handled_at).toLocaleString('id-ID')}</dd>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <dt className="text-[var(--color-ink-muted)] shrink-0 w-24">Base</dt>
                            <dd className="text-[var(--color-ink)]">{cls.name}{cls.short_code ? ` · ${cls.short_code}` : ''}</dd>
                        </div>
                    </dl>
                </div>

                {/* Submission content */}
                {takedown.submission && (
                    <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                        <SectionTitle>Konten Kiriman</SectionTitle>
                        <div className="mb-3">
                            <StatusBadge status={takedown.submission.status} />
                        </div>
                        <p className="text-sm text-[var(--color-ink)] whitespace-pre-wrap">
                            {takedown.submission.moderated_message ?? takedown.submission.original_message}
                        </p>
                    </div>
                )}

                {/* Admin note */}
                {takedown.admin_note && (
                    <div className="pt-5 mt-5 border-t border-[var(--color-border)]">
                        <SectionTitle>Catatan Admin</SectionTitle>
                        <p className="text-sm text-[var(--color-ink)]">{takedown.admin_note}</p>
                    </div>
                )}

                {/* Actions */}
                {canHandle && (
                    <div className="pt-5 mt-5 border-t border-[var(--color-border)] space-y-4">
                        <SectionTitle>Tindakan</SectionTitle>

                        {takedown.status === 'pending' && (
                            <Link
                                href={`/admin/classes/${cls.id}/takedowns/${takedown.id}/start-review`}
                                method="post"
                                as="button"
                                className="inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-colors px-4 py-2 text-sm h-9 bg-[var(--color-info-dim)] text-[var(--color-info)] border border-[var(--color-info)] hover:opacity-90"
                            >
                                Mulai Tinjau
                            </Link>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Approve */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)]">Setujui Takedown</p>
                                <Textarea
                                    rows={2}
                                    placeholder="Catatan admin (opsional)"
                                    value={approveForm.data.admin_note}
                                    onChange={(e) => approveForm.setData('admin_note', e.target.value)}
                                />
                                <Button
                                    variant="danger"
                                    className="w-full"
                                    onClick={() => setConfirmApprove(true)}
                                    disabled={approveForm.processing}
                                >
                                    Setujui Takedown
                                </Button>
                            </div>

                            {/* Reject */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)]">Tolak Permintaan</p>
                                <Textarea
                                    rows={2}
                                    placeholder="Alasan penolakan (opsional)"
                                    value={rejectForm.data.admin_note}
                                    onChange={(e) => rejectForm.setData('admin_note', e.target.value)}
                                />
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => rejectForm.post(`/admin/classes/${cls.id}/takedowns/${takedown.id}/reject`)}
                                    disabled={rejectForm.processing}
                                    loading={rejectForm.processing}
                                >
                                    Tolak Permintaan
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
