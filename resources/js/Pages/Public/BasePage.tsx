import { useState } from 'react';
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

    // Unauth — PublicShell centered, narrow
    if (!auth_user) {
        return (
            <PublicShell
                title="Kirim Menfess"
                subtitle={<>ke <span className="capitalize">{base.name}</span></>}
                footer={false}
            >
                <div className="space-y-5">
                    <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                        Kirim pesan anonim ke{' '}
                        <span className="text-[var(--color-ink)] capitalize">{base.name}</span>.
                        Identitasmu tidak ditampilkan ke siapapun — hanya pesanmu yang terlihat.
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => { window.location.href = `/auth/login?redirect=/b/${base.slug}`; }}
                    >
                        Login untuk Kirim
                    </Button>
                    <p className="text-xs text-[var(--color-ink-subtle)] text-center">
                        Login hanya untuk mencegah spam.
                    </p>
                </div>
                <div className="mt-8 text-center">
                    <a href="/" className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors">← Beranda</a>
                </div>
            </PublicShell>
        );
    }

    // Auth — full-page split layout
    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col">
            <div className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full px-6 pt-8 pb-8 gap-8">

                {/* Kiri — pesan */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <img src="/sapa-icon.svg" alt="" className="h-8 w-8" draggable={false} />
                            <h1 className="text-xl font-bold text-[var(--color-ink)] capitalize">{base.name}</h1>
                        </div>
                        <a href="/" className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] transition-colors">← Beranda</a>
                    </div>
                    <label className="text-xs text-[var(--color-ink-muted)] mb-2 font-medium">
                        Pesan <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    <div className="relative flex-1 flex flex-col">
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value.slice(0, MAX))}
                            placeholder="Tulis pesanmu di sini..."
                            className={`flex-1 w-full min-h-[300px] md:min-h-0 resize-none rounded-xl border bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 focus:outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-ink-subtle)] transition-colors ${errors?.message ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                        />
                        <span className={`absolute bottom-3 right-3 text-xs pointer-events-none ${message.length > MAX * 0.9 ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-subtle)]'}`}>
                            {message.length}/{MAX}
                        </span>
                    </div>
                    {errors?.message && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.message}</p>}
                </div>

                {/* Kanan — metadata */}
                <div className="md:w-72 flex flex-col gap-4 min-w-0 overflow-hidden">
                    <form onSubmit={handleSubmit} className="contents" noValidate>
                        <div className="hidden" aria-hidden="true">
                            <input name="honeypot" tabIndex={-1} autoComplete="off" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                            <Field label="Untuk" hint="Opsional" error={errors?.target_text}>
                                <Input type="text" value={targetText} onChange={e => setTargetText(e.target.value)} maxLength={120} placeholder="Ketua OSIS" error={!!errors?.target_text} />
                            </Field>
                            <Field label="Dari" hint="Opsional" error={errors?.alias_text}>
                                <Input type="text" value={aliasText} onChange={e => setAliasText(e.target.value)} maxLength={80} placeholder="Seseorang" error={!!errors?.alias_text} />
                            </Field>
                        </div>

                        {visibleTags.length > 0 && (
                            <div>
                                <p className="text-xs text-[var(--color-ink-muted)] mb-2">Kategori</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {visibleTags.map(tag => {
                                        const sel = selectedTags.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => setSelectedTags(sel ? [] : [tag.id])}
                                                className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                                                    sel
                                                        ? 'bg-[var(--color-accent)] text-[#0B0D0E] border-[var(--color-accent)] font-semibold'
                                                        : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'
                                                }`}
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
                            <button
                                type="button"
                                onClick={() => setShowNote(v => !v)}
                                className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors"
                            >
                                {showNote ? '− Sembunyikan catatan' : '+ Catatan untuk admin'}
                            </button>
                            {showNote && (
                                <div className="mt-2">
                                    <textarea
                                        value={note}
                                        onChange={e => setNote(e.target.value.slice(0, 200))}
                                        placeholder='mis: "jangan lupa tag penerima di instagram"'
                                        rows={2}
                                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] text-sm px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-ink-subtle)] resize-none"
                                    />
                                    <p className="text-[10px] text-[var(--color-ink-subtle)] mt-1">Catatan tidak ikut dikirim ke postingan.</p>
                                    <p className={`text-right text-[10px] mt-0.5 ${note.length > 180 ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-subtle)]'}`}>
                                        {note.length}/200
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-2">
                            <Button type="submit" variant="primary" size="md" loading={loading} disabled={!message.trim()} className="w-full">
                                {loading ? 'Mengirim...' : 'Kirim'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
