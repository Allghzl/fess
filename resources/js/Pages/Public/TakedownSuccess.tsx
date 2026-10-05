export default function TakedownSuccess({ publicId }: { publicId: string }) {
    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success-dim)] mb-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-success)]" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-[var(--color-ink)] mb-2">Permintaan Diterima</h1>
                <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed mb-4">
                    Permintaan takedown untuk ID{' '}
                    <span className="font-mono font-semibold text-[var(--color-ink)]">{publicId}</span>{' '}
                    telah kami terima.
                </p>
                <p className="text-xs text-[var(--color-ink-subtle)] mb-8">
                    Admin kelas akan meninjau permintaanmu. Proses dapat memakan waktu 1–3 hari kerja.
                    Kami tidak mengirim konfirmasi lebih lanjut via email.
                </p>
                <a
                    href="/"
                    className="block w-full py-3 bg-[var(--color-accent)] text-[#0B0D0E] rounded-[10px] font-semibold text-sm hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                    Kembali ke Beranda
                </a>
            </div>
        </div>
    );
}
