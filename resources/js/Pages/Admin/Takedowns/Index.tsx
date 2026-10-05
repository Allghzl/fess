import AdminLayout from '@/Layouts/AdminLayout';
import { ClassWorkspace, TakedownRequest } from '@/types';
import { Link } from '@inertiajs/react';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';

interface Paginated<T> {
    data: T[];
    next_page_url: string | null;
    prev_page_url: string | null;
}

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

const FILTER_LABELS: [string, string][] = [
    ['pending',  'Menunggu'],
    ['approved', 'Disetujui'],
    ['rejected', 'Ditolak'],
    ['all',      'Semua'],
];

export default function TakedownsIndex({
    class: cls,
    requests,
    filter,
}: {
    class: ClassWorkspace;
    requests: Paginated<TakedownRequest>;
    filter: string;
}) {
    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: cls.name, href: `/admin/classes/${cls.id}` }}
                title="Antrian Takedown"
            />

            {/* Filter tabs */}
            <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
                {FILTER_LABELS.map(([v, l]) => (
                    <Link
                        key={v}
                        href={`/admin/classes/${cls.id}/takedowns?filter=${v}`}
                        className={[
                            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                            filter === v
                                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                        ].join(' ')}
                    >
                        {l}
                    </Link>
                ))}
            </div>

            {requests.data.length === 0 ? (
                <EmptyState title="Tidak ada permintaan ditemukan." />
            ) : (
                <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                    {requests.data.map((req) => (
                        <div key={req.id} className="flex items-center justify-between py-4 gap-4 hover:bg-[var(--color-surface-raised)] transition-colors px-1">
                            <div className="min-w-0">
                                <p className="font-mono text-sm font-medium text-[var(--color-ink)]">
                                    {req.public_id_snapshot}
                                </p>
                                <p className="text-xs text-[var(--color-ink-subtle)] mt-0.5">
                                    {REASON_LABEL[req.reason_code] ?? req.reason_code}
                                    {' · '}
                                    {new Date(req.created_at).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <StatusBadge status={req.status} />
                                <Link
                                    href={`/admin/classes/${cls.id}/takedowns/${req.id}`}
                                    className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-text)] transition-colors"
                                >
                                    Buka
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(requests.prev_page_url || requests.next_page_url) && (
                <div className="mt-5 flex justify-between">
                    {requests.prev_page_url
                        ? <Link href={requests.prev_page_url} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">← Sebelumnya</Link>
                        : <span />}
                    {requests.next_page_url
                        ? <Link href={requests.next_page_url} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">Berikutnya →</Link>
                        : <span />}
                </div>
            )}
        </AdminLayout>
    );
}
