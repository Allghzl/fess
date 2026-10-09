import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button, Textarea, Input, Field } from '@/components/ui';
import PublicShell from '@/Layouts/PublicShell';
import MusicField from '@/components/music/MusicField';
import type { SelectedMusic } from '@/components/music/types';
import { selectedMusicToPayload } from '@/components/music/types';
import { stripEmoji } from '@/utils/stripEmoji';

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

export default function BasePage({ base, tags = [], errors }: Props) {
    const [message, setMessage]             = useState('');
    const [targetText, setTargetText]       = useState('');
    const [aliasText, setAliasText]         = useState('');
    const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);
    const [selectedTags, setSelectedTags]   = useState<string[]>([]);
    const [loading, setLoading]             = useState(false);
    const [note, setNote]                   = useState('');
    const [showNote, setShowNote]           = useState(false);
    const MAX = 2000;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setLoading(true);

        const lainnya = tags.find(t => t.slug === 'lainnya');
        const tagIds  = selectedTags.length ? selectedTags : (lainnya ? [lainnya.id] : []);
        const musicPayload = selectedMusic ? selectedMusicToPayload(selectedMusic) : {};

        router.post(`/b/${base.slug}/submit`, {
            message,
            target_text:   targetText || undefined,
            alias_text:    aliasText  || undefined,
            tag_ids:       tagIds.length ? tagIds : undefined,
            internal_note: note.trim() || undefined,
            ...musicPayload,
            consent: true,
        }, {
            onFinish: () => setLoading(false),
        });
    };

    const visibleTags = tags.filter(t => t.slug !== 'lainnya');

    return (
        <PublicShell title={base.name} subtitle={base.instagram_handle ?? undefined} footer={false}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="hidden" aria-hidden="true">
                    <input name="honeypot" tabIndex={-1} autoComplete="off" />
                </div>

                <Field label="Pesan" required error={errors?.message}>
                    <div className="relative">
                        <Textarea
                            value={message}
                            onChange={e => setMessage(stripEmoji(e.target.value).slice(0, MAX))}
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
                        <Input type="text" value={targetText} onChange={e => setTargetText(e.target.value)} maxLength={120} placeholder="Ketua OSIS" error={!!errors?.target_text} />
                    </Field>
                    <Field label="Dari" hint="Opsional" error={errors?.alias_text}>
                        <Input type="text" value={aliasText} onChange={e => setAliasText(e.target.value)} maxLength={80} placeholder="Seseorang" error={!!errors?.alias_text} />
                    </Field>
                </div>

                {visibleTags.length > 0 && (
                    <div>
                        <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                            Kategori <span className="text-[var(--color-ink-subtle)]">(opsional)</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {visibleTags.map(tag => {
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
                )}

                <MusicField value={selectedMusic} onChange={setSelectedMusic} />

                <div>
                    <button type="button" onClick={() => setShowNote(v => !v)}
                        className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors">
                        {showNote ? '− Sembunyikan catatan' : '+ Catatan untuk admin'}
                    </button>
                    {showNote && (
                        <div className="mt-2">
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value.slice(0, 200))}
                                placeholder="Catatan opsional untuk admin, tidak ditampilkan di postingan…"
                                rows={2}
                                className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] text-sm px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-ink-subtle)] resize-none"
                            />
                            <p className={`text-right text-[10px] mt-0.5 ${note.length > 180 ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-subtle)]'}`}>
                                {note.length}/200
                            </p>
                        </div>
                    )}
                </div>

                <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!message.trim()} className="w-full">
                    {loading ? 'Mengirim...' : 'Kirim Menfess'}
                </Button>
            </form>

            <div className="mt-8 text-center">
                <a href="/" className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors">← Kembali</a>
            </div>
        </PublicShell>
    );
}
