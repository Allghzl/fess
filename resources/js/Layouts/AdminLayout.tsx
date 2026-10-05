import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Drawer, ToastProvider } from '@/components/ui';
import {
    LayoutDashboard, Inbox, CheckSquare, Image, ShieldAlert,
    Users, Settings, Menu, X, LogOut, ChevronDown, ChevronRight,
} from 'lucide-react';

interface ClassInfo {
    id: string;
    name: string;
    short_code?: string;
    pending_count?: number;
    takedown_pending?: number;
    member_requests?: number;
}

interface Props {
    children: React.ReactNode;
    classInfo?: ClassInfo;
}

interface PageProps {
    auth: { user: { name: string } };
    url: string;
    bases?: { id: string; name: string; short_code: string }[];
    [key: string]: unknown;
}

const CLASS_NAV = [
    { label: 'Ikhtisar',   path: '',            icon: LayoutDashboard },
    { label: 'Inbox',      path: '/submissions', icon: Inbox,       countKey: 'pending_count' as const },
    { label: 'Disetujui',  path: '/approved',    icon: CheckSquare },
    { label: 'Desain',     path: '/designs',     icon: Image },
    { label: 'Takedown',   path: '/takedowns',   icon: ShieldAlert, countKey: 'takedown_pending' as const },
    { label: 'Anggota',    path: '/members',     icon: Users,       countKey: 'member_requests' as const },
    { label: 'Pengaturan', path: '/settings',    icon: Settings },
];

function NavItem({
    href, icon: Icon, label, active, count, onClick,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
    count?: number;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={[
                'flex items-center gap-3 py-2 text-sm transition-colors',
                active
                    ? 'border-l-2 border-[var(--color-accent)] text-[var(--color-accent)] pl-[calc(0.75rem-2px)] pr-3'
                    : 'pl-3 pr-3 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
            ].join(' ')}
        >
            <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
            <span className="flex-1 truncate">{label}</span>
            {count != null && count > 0 && (
                <span className="text-[10px] font-bold text-[var(--color-ink-subtle)] tabular-nums">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </Link>
    );
}

function Sidebar({
    classInfo, currentUrl, bases, userName, onClose,
}: {
    classInfo?: ClassInfo;
    currentUrl: string;
    bases?: { id: string; name: string; short_code: string }[];
    userName?: string;
    onClose?: () => void;
}) {
    const [baseSwitcherOpen, setBaseSwitcherOpen] = useState(false);

    return (
        <div className="flex flex-col h-full">
            {/* Brand */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                <Link
                    href="/admin"
                    onClick={onClose}
                    className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                >
                    pinat<span className="text-[var(--color-accent)]">menfess</span>
                </Link>
                {onClose && (
                    <button
                        onClick={onClose}
                        aria-label="Tutup menu"
                        className="text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Base switcher */}
            {classInfo && (
                <div className="px-3 pb-2">
                    {bases && bases.length > 1 ? (
                        <div className="relative">
                            <button
                                onClick={() => setBaseSwitcherOpen(v => !v)}
                                className="w-full flex items-center gap-2 pl-3 pr-2 py-1.5 text-left hover:text-[var(--color-ink)] transition-colors"
                            >
                                <span className="font-mono text-[10px] font-bold text-[var(--color-accent)] w-5 shrink-0">
                                    {classInfo.name.charAt(0)}
                                </span>
                                <span className="flex-1 text-xs text-[var(--color-ink)] truncate">{classInfo.name}</span>
                                <ChevronDown size={10} className="text-[var(--color-ink-subtle)] shrink-0" />
                            </button>
                            {baseSwitcherOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-xl z-10 py-1 overflow-hidden">
                                    {bases.map(b => (
                                        <Link
                                            key={b.id}
                                            href={`/admin/classes/${b.id}`}
                                            onClick={() => { setBaseSwitcherOpen(false); onClose?.(); }}
                                            className={[
                                                'flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--color-surface-hover)] transition-colors',
                                                b.id === classInfo.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)]',
                                            ].join(' ')}
                                        >
                                            <span className="font-mono text-[10px] w-8 shrink-0 text-[var(--color-ink-subtle)]">{b.short_code}</span>
                                            <span className="flex-1 truncate">{b.name}</span>
                                            {b.id === classInfo.id && <ChevronRight size={10} />}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 pl-3 py-1.5">
                            <span className="font-mono text-[10px] font-bold text-[var(--color-accent)] w-5 shrink-0">
                                {classInfo.name.charAt(0)}
                            </span>
                            <span className="text-xs text-[var(--color-ink)] truncate">{classInfo.name}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="mx-3 border-t border-[var(--color-border)] mb-1" />

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-1">
                {!classInfo && (
                    <NavItem
                        href="/admin"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={currentUrl === '/admin'}
                        onClick={onClose}
                    />
                )}
                {classInfo && CLASS_NAV.map(({ label, path, icon, countKey }) => {
                    const href = `/admin/classes/${classInfo.id}${path}`;
                    const active = path === ''
                        ? currentUrl === href
                        : currentUrl.startsWith(href);
                    const count = countKey ? classInfo[countKey] : undefined;
                    return (
                        <NavItem
                            key={path}
                            href={href}
                            icon={icon}
                            label={label}
                            active={active}
                            count={count}
                            onClick={onClose}
                        />
                    );
                })}
            </nav>

            {/* Bottom: user name + logout */}
            <div className="px-3 py-3 border-t border-[var(--color-border)] space-y-1">
                {userName && (
                    <p className="px-3 text-xs text-[var(--color-ink-subtle)] truncate">{userName}</p>
                )}
                <Link
                    href="/auth/logout"
                    method="post"
                    as="button"
                    className="flex items-center gap-2 w-full px-3 py-1 text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] transition-colors"
                >
                    <LogOut size={12} />
                    Keluar
                </Link>
            </div>
        </div>
    );
}

export default function AdminLayout({ children, classInfo }: Props) {
    const { auth, url, bases } = usePage<PageProps>().props;
    const currentUrl = url ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <ToastProvider>
            <div className="min-h-screen bg-[var(--color-canvas)] flex">

                {/* Desktop sidebar */}
                <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 h-screen overflow-hidden">
                    <Sidebar
                        classInfo={classInfo}
                        currentUrl={currentUrl}
                        bases={bases}
                        userName={auth?.user?.name}
                    />
                </aside>

                {/* Mobile drawer */}
                <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    <Sidebar
                        classInfo={classInfo}
                        currentUrl={currentUrl}
                        bases={bases}
                        userName={auth?.user?.name}
                        onClose={() => setDrawerOpen(false)}
                    />
                </Drawer>

                {/* Main */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Mobile top bar */}
                    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            aria-label="Buka menu"
                            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                        >
                            <Menu size={18} />
                        </button>
                        <span className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--color-ink-muted)]">
                            pinat<span className="text-[var(--color-accent)]">menfess</span>
                        </span>
                        {/* balance spacer */}
                        <span className="w-8" aria-hidden />
                    </header>

                    <main className="flex-1 mx-auto w-full max-w-5xl px-4 lg:px-8 py-6">
                        {children}
                    </main>
                </div>
            </div>
        </ToastProvider>
    );
}
