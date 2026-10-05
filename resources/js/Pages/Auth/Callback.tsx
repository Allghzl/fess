import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';

export default function Callback() {
    const [error, setError] = useState(false);

    useEffect(() => {
        const fragment = window.location.hash.slice(1);
        const params = new URLSearchParams(fragment);

        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const state        = params.get('state');

        if (!accessToken || !state) {
            window.location.replace('/auth/login');
            return;
        }

        history.replaceState(null, '', window.location.pathname);

        fetch('/auth/pinat/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
            },
            body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, state }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (res.ok && data.redirect) {
                    window.location.replace(data.redirect);
                } else {
                    setError(true);
                }
            })
            .catch(() => setError(true));
    }, []);

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center">
            {error ? (
                <div className="text-center space-y-3">
                    <p className="text-sm text-[var(--color-ink-muted)]">Terjadi kesalahan.</p>
                    <a
                        href="/auth/login"
                        className="text-xs text-[var(--color-accent-text)] hover:text-[var(--color-accent)] transition-colors"
                    >
                        Coba lagi
                    </a>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <Spinner size={20} className="text-[var(--color-accent)]" />
                    <p className="text-sm text-[var(--color-ink-muted)]">Sedang masuk…</p>
                </div>
            )}
        </div>
    );
}
