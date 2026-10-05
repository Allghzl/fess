import AdminLayout from '@/Layouts/AdminLayout';
import { Button, EmptyState, PageHeader, Select, StatusBadge } from '@/components/ui';
import { ClassWorkspace, Submission } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { Eye, Inbox } from 'lucide-react';

interface SubmissionWithRead extends Submission {
    is_read: boolean;
    read_by_count: number;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
    total: number;
}

interface Filters {
    status?: string;
    category?: string;
    search?: string;
    sort?: string;
    unread_only?: boolean;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'baru saja';
    if (mins < 60) return `${mins}m lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}j lalu`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}h lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function SubmissionCard({ sub, classId }: { sub: SubmissionWithRead; classId: string }) {
    const categories = sub.category ? sub.category.split(',').map(c => c.trim()).filter(Boolean) : [];
    const primaryCat = categories[0];
    const extraCats  = categories.slice(1);

    return (
        <Link
            href={`/admin/classes/${classId}/submissions/${sub.id}`}
            className={`group block px-4 py-3.5 transition-colors ${
                sub.is_read
                    ? 'hover:bg-[var(--color-surface-hover)]'
                    : 'border-l-2 border-l-[var(--color-accent)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] pl-[14px]'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="mt-1.5 shrink-0">
                    {!sub.is_read
                        ? <span className="block h-2 w-2 rounded-full bg-[var(--color-accent)]" title="Belum dibaca" />
                        : <span className="block h-2 w-2" />
                    }
                </div>

                <div className="min-w-0 flex-1">
                    <p className={`text-sm line-clamp-2 leading-relaxed ${
                        sub.is_read ? 'text-[var(--color-ink-muted)]' : 'text-[var(--color-ink)] font-medium'
                    }`}>
                        {sub.original_message}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {primaryCat && (
                            <span className="inline-flex items-center rounded-full bg-[var(--color-surface-hover)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]">
                                {primaryCat}
                            </span>
                        )}
                        {extraCats.length > 0 && (
                            <span
                                className="relative inline-flex items-center rounded-full bg-[var(--color-surface-hover)] px-2 py-0.5 text-xs text-[var(--color-ink-subtle)] cursor-default"
                                title={extraCats.join(', ')}
                            >
                                +{extraCats.length}
                                <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-ink)] whitespace-nowrap shadow-lg">
                                    {extraCats.join(', ')}
                                </span>
                            </span>
                        )}
                        {sub.target_text && (
                            <span className="text-xs text-[var(--color-ink-subtle)]">→ {sub.target_text}</span>
                        )}
                        {sub.read_by_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-subtle)]" title={`Dibaca oleh ${sub.read_by_count} admin`}>
                                <Eye size={12} /> {sub.read_by_count}
                            </span>
                        )}
                    </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <StatusBadge status={sub.status} />
                    <span className="text-xs text-[var(--color-ink-subtle)]">{timeAgo(sub.created_at)}</span>
                </div>
            </div>
        </Link>
    );
}

export default function SubmissionsIndex({
    class: cls,
    submissions,
    filters,
}: {
    class: ClassWorkspace;
    submissions: Paginated<SubmissionWithRead>;
    filters: Filters;
}) {
    const { data, setData, get } = useForm({
        status:      filters.status      ?? 'pending',
        search:      filters.search      ?? '',
        sort:        filters.sort        ?? 'asc',
        unread_only: filters.unread_only ?? false,
    });

    const apply = () => get(`/admin/classes/${cls.id}/submissions`, { preserveScroll: true });

    const unreadCount = submissions.data.filter(s => !s.is_read).length;

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                title="Inbox"
                subtitle={`${submissions.total} pesan${unreadCount > 0 ? ` · ${unreadCount} baru` : ''}`}
            />

            {/* Filter bar — flat, no card */}
            <div className="flex flex-wrap gap-2 items-center mb-4">
                <Select
                    value={data.status}
                    onChange={e => setData('status', e.target.value)}
                    className="w-auto flex-none"
                >
                    <option value="pending">Pending</option>
                    <option value="all">Semua</option>
                    <option value="submitted">Masuk</option>
                    <option value="under_review">Ditinjau</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="takedown_requested">Takedown</option>
                    <option value="taken_down">Diturunkan</option>
                </Select>

                <Select
                    value={data.sort}
                    onChange={e => setData('sort', e.target.value)}
                    className="w-auto flex-none"
                >
                    <option value="asc">Terlama dulu</option>
                    <option value="desc">Terbaru dulu</option>
                </Select>

                <label className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={!!data.unread_only}
                        onChange={e => setData('unread_only', e.target.checked)}
                        className="rounded border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    Belum dibaca saja
                </label>

                <input
                    type="text"
                    placeholder="Cari pesan…"
                    value={data.search}
                    onChange={e => setData('search', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && apply()}
                    className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-3.5 py-2 text-sm flex-1 min-w-36 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                />

                <Button onClick={apply} size="md">Filter</Button>
            </div>

            {/* List */}
            {submissions.data.length === 0 ? (
                <EmptyState
                    icon={<Inbox size={40} />}
                    title="Tidak ada pesan"
                    description="Tidak ada pesan yang sesuai filter."
                />
            ) : (
                <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                    {submissions.data.map(sub => (
                        <SubmissionCard key={sub.id} sub={sub} classId={cls.id} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {(submissions.prev_page_url || submissions.next_page_url) && (
                <div className="mt-4 flex justify-between items-center">
                    {submissions.prev_page_url
                        ? <Link href={submissions.prev_page_url} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">← Sebelumnya</Link>
                        : <span />}
                    <span className="text-xs text-[var(--color-ink-subtle)]">
                        Hal {submissions.current_page} / {submissions.last_page}
                    </span>
                    {submissions.next_page_url
                        ? <Link href={submissions.next_page_url} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">Berikutnya →</Link>
                        : <span />}
                </div>
            )}
        </AdminLayout>
    );
}
