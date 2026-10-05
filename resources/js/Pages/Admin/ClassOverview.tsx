import { Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { PageHeader } from '@/components/ui';
import { ClassWorkspace } from '@/types';

interface Stats {
    pending: number;
    approved: number;
    rejected: number;
    taken_down: number;
    takedown_pending: number;
}

export default function ClassOverview({ class: cls, stats }: { class: ClassWorkspace; stats: Stats }) {
    const base = `/admin/classes/${cls.id}`;

    const statItems = [
        { label: 'Menunggu',         value: stats.pending,          color: 'text-[var(--color-warning)]',   href: `${base}/submissions` },
        { label: 'Disetujui',        value: stats.approved,         color: 'text-[var(--color-success)]',   href: `${base}/approved` },
        { label: 'Ditolak',          value: stats.rejected,         color: 'text-[var(--color-ink-muted)]', href: `${base}/submissions` },
        { label: 'Diturunkan',       value: stats.taken_down,       color: 'text-[var(--color-danger)]',    href: `${base}/takedowns` },
        { label: 'Takedown Pending', value: stats.takedown_pending, color: 'text-[var(--color-danger)]',    href: `${base}/takedowns` },
    ];

    const quickLinks = [
        { label: 'Buka Inbox',       href: `${base}/submissions`, primary: true },
        { label: 'Konten Disetujui', href: `${base}/approved` },
        { label: 'Takedown',         href: `${base}/takedowns` },
        { label: 'Desain',           href: `${base}/designs` },
        { label: 'Anggota',          href: `${base}/members` },
        { label: 'Pengaturan',       href: `${base}/settings` },
    ];

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{ label: 'Dashboard', href: '/admin' }}
                title={cls.name}
                subtitle={cls.short_code}
            />

            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-8">
                {statItems.map((s) => (
                    <Link key={s.label} href={s.href} className="group flex items-baseline gap-1.5">
                        <span className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</span>
                        <span className="text-xs text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors">{s.label}</span>
                    </Link>
                ))}
            </div>

            <nav className="space-y-px">
                {quickLinks.map((link) => (
                    <Link
                        key={link.label}
                        href={link.href}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                        <span className={link.primary ? 'text-[var(--color-accent-text)] font-medium' : 'text-[var(--color-ink-muted)]'}>
                            {link.label}
                        </span>
                        <span className="text-[var(--color-ink-subtle)]">→</span>
                    </Link>
                ))}
            </nav>
        </AdminLayout>
    );
}
