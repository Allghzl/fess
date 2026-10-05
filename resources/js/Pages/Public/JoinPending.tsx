interface Props {
    base_name: string;
}

export default function JoinPending({ base_name }: Props) {
    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-4">
            <div className="w-full max-w-sm text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-warning-dim)] mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-warning)]" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-[var(--color-ink)] mb-2">Menunggu Persetujuan</h1>
                <p className="text-sm text-[var(--color-ink-muted)] mb-3">
                    Permintaan bergabung ke <strong className="text-[var(--color-ink)]">{base_name}</strong> sedang menunggu
                    persetujuan owner.
                </p>
                <p className="text-xs text-[var(--color-ink-subtle)] mb-8">
                    Tidak ada sistem notifikasi — hubungi owner base untuk konfirmasi. Kamu akan mendapat akses setelah disetujui.
                </p>
                <a
                    href="/"
                    className="inline-block rounded-[10px] bg-[var(--color-accent)] px-6 py-3 text-[#0B0D0E] font-semibold text-sm hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                    Kembali ke Beranda
                </a>
            </div>
        </div>
    );
}
