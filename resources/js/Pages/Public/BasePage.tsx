import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Button, Textarea, Input, Field } from '@/components/ui';
import PublicShell from '@/Layouts/PublicShell';
import MusicField from '@/components/music/MusicField';
import type { SelectedMusic } from '@/components/music/types';
import { selectedMusicToPayload } from '@/components/music/types';

interface Base {
    id: string;
    name: string;
    slug: string;
    short_code: string;
    instagram_handle: string | null;
    website_label: string | null;
    logo_asset_key: string | null;
}

interface TagOption {
    id: string;
    name: string;
    slug: string;
}

interface Props {
    base: Base;
    tags?: TagOption[];
    auth_user?: { name: string } | null;
    errors?: Record<string, string>;
}

export default function BasePage({ base, tags = [], auth_user, errors }: Props) {
    const [message, setMessage]           = useState('');
    const [targetText, setTargetText]     = useState('');
    const [aliasText, setAliasText]       = useState('');
    const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading]           = useState(false);
    const MAX = 2000;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setLoading(true);

        // Auto-select "Lainnya" if nothing chosen
        const lainnya = tags.find(t => t.slug === 'lainnya');
        const tagIds  = selectedTags.length ? selectedTags : (lainnya ? [lainnya.id] : []);

        const musicPayload = selectedMusic ? selectedMusicToPayload(selectedMusic) : {};

        router.post(`/b/${base.slug}/submit`, {
            message,
            target_text: targetText || undefined,
            alias_text:  aliasText  || undefined,
            tag_ids:     tagIds.length ? tagIds : undefined,
            ...musicPayload,
            consent: true,
        }, {
            onFinish: () => setLoading(false),
        });
    };

    return (
        <PublicShell title={base.name} subtitle={base.instagram_handle ?? undefined} footer={false}>
            {!auth_user ? (
                <div className="space-y-4">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => { window.location.href = `/auth/login?redirect=/b/${base.slug}`; }}
                    >
                        Kirim Menfess
                    </Button>
                    <p className="text-xs text-[var(--color-ink-subtle)] text-center">
                        Login digunakan untuk keamanan dan mencegah spam.
                        Identitas akunmu tidak ditampilkan kepada admin base maupun di postingan.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="hidden" aria-hidden="true">
                        <input name="honeypot" tabIndex={-1} autoComplete="off" />
                    </div>

                    <Field label="Pesan" required error={errors?.message}>
                        <div className="relative">
                            <Textarea
                                value={message}
                                onChange={e => setMessage(e.target.value.slice(0, MAX))}
                                placeholder="Tulis pesanmu di sini..."
                                rows={5}
                                error={!!errors?.message}
                            />
                            <span className={`absolute bottom-2 right-3 text-xs pointer-events-none ${message.length > MAX * 0.9 ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-subtle)]'}`}>
                                {message.length}/{MAX}
                            </span>
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Untuk" hint="Opsional" error={errors?.target_text}>
                            <Input type="text" value={targetText} onChange={e => setTargetText(e.target.value)} maxLength={120} placeholder="Misal: Ketua OSIS" error={!!errors?.target_text} />
                        </Field>
                        <Field label="Dari" hint="Opsional" error={errors?.alias_text}>
                            <Input type="text" value={aliasText} onChange={e => setAliasText(e.target.value)} maxLength={80} placeholder="Seseorang" error={!!errors?.alias_text} />
                        </Field>
                    </div>

                    {/* Kategori */}
                    <div>
                        <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                            Kategori <span className="text-[var(--color-ink-subtle)]">(kosong = Lainnya)</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {tags.filter(t => t.slug !== 'lainnya').map(tag => {
                                const sel = selectedTags.includes(tag.id);
                                return (
                                    <button key={tag.id} type="button"
                                        onClick={() => setSelectedTags(sel ? [] : [tag.id])}
                                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${sel ? 'bg-[var(--color-accent)] text-[#0B0D0E] border-[var(--color-accent)] font-medium' : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'}`}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Music picker */}
                    <MusicField value={selectedMusic} onChange={setSelectedMusic} />

                    <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!message.trim()} className="w-full">
                        {loading ? 'Mengirim...' : 'Kirim Menfess'}
                    </Button>

                    <p className="text-center text-xs text-[var(--color-ink-subtle)]">
                        Login digunakan untuk keamanan dan mencegah spam.
                        Identitas akunmu tidak ditampilkan kepada admin base maupun di postingan.
                    </p>
                </form>
            )}

            <div className="mt-8 text-center">
                <a href="/" className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors">← Kembali</a>
            </div>
        </PublicShell>
    );
}
