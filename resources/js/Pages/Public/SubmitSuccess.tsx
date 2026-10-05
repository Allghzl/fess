import { Link } from '@inertiajs/react';

interface Props {
    base_name: string;
    base_slug: string;
}

export default function SubmitSuccess({ base_name, base_slug }: Props) {
    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success-dim)] mb-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-success)]" aria-hidden="true">
                        <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-[var(--color-ink)] mb-2">Pesan Terkirim</h1>
                <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed mb-4">
                    Pesanmu ke <span className="font-medium text-[var(--color-ink)]">{base_name}</span> telah kami terima
                    dan akan segera dimoderasi. Kamu akan mendapat ID publik jika pesan disetujui.
                </p>
                <p className="text-xs text-[var(--color-ink-subtle)] mb-8">
                    Admin akan memoderasi pesanmu. Pesan disetujui diposting dengan ID publik —
                    gunakan di{' '}
                    <a href="/takedown" className="text-[var(--color-accent-text)] underline underline-offset-2">/takedown</a>
                    {' '}jika perlu.
                </p>
                <Link
                    href={`/b/${base_slug}`}
                    className="block w-full py-3 bg-[var(--color-accent)] text-[#0B0D0E] rounded-[10px] font-semibold text-sm hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                    Kembali ke Halaman Base
                </Link>
            </div>
        </div>
    );
}
