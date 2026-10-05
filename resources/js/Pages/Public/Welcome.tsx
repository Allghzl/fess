import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button, Input } from '@/components/ui';
import PublicShell from '@/Layouts/PublicShell';

interface Props {
    app_name: string;
    errors?: { code?: string };
}

export default function Welcome({ app_name, errors }: Props) {
    const [code, setCode]       = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setLoading(true);
        router.post('/base-lookup', { code: code.trim() }, {
            onFinish: () => setLoading(false),
        });
    };

    return (
        <PublicShell
            title={app_name}
            subtitle="Kirim pesan anonim ke base-mu"
        >
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <Input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Kode base — contoh: RPLA"
                        error={!!errors?.code}
                        className="text-center font-mono tracking-widest uppercase"
                        autoComplete="off"
                        autoFocus
                    />
                    {errors?.code && (
                        <p className="mt-1.5 text-xs text-[var(--color-danger)] text-center">{errors.code}</p>
                    )}
                </div>
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={!code.trim()}
                    className="w-full"
                >
                    {loading ? 'Mencari...' : 'Masuk'}
                </Button>
            </form>
        </PublicShell>
    );
}
