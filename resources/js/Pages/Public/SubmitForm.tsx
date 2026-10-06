import { useState, useRef } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Button, Input, Textarea, Field } from '@/components/ui';
import MusicField from '@/components/music/MusicField';
import type { SelectedMusic } from '@/components/music/types';
import { selectedMusicToPayload } from '@/components/music/types';

interface Base {
    id: string;
    name: string;
    slug: string;
    short_code: string;
}

interface TagOption {
    id: string;
    name: string;
    slug: string;
}

interface Props {
    base: Base;
    tags?: TagOption[];
    errors?: Record<string, string>;
}

type FormData = {
    message: string;
    target_text: string;
    alias_text: string;
    category: string;
    tag_ids: string[];
    consent: boolean;
    honeypot: string;
    // music fields — populated from selectedMusic on submit
    music_provider: string;
    music_track_id: string;
    music_start_ms: number | undefined;
    music_duration_ms: number | undefined;
    song_text: string;
    artist_text: string;
    song_start_seconds: number | undefined;
    internal_note: string;
    show_note: boolean;
};

export default function SubmitForm({ base, tags = [] }: Props) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        message:           '',
        target_text:       '',
        alias_text:        '',
        category:          '',
        tag_ids:           [],
        consent:           false,
        honeypot:          '',
        internal_note:     '',
        show_note:         false,
        music_provider:    '',
        music_track_id:    '',
        music_start_ms:    undefined,
        music_duration_ms: undefined,
        song_text:         '',
        artist_text:       '',
        song_start_seconds: undefined,
    });

    const [charCount, setCharCount]       = useState(0);
    const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);

    function handleMessage(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setData('message', e.target.value);
        setCharCount(e.target.value.length);
    }

    function selectTag(id: string) {
        setData('tag_ids', data.tag_ids.includes(id) ? [] : [id]);
        setData('category', '');
    }

    function handleMusicChange(music: SelectedMusic | null) {
        setSelectedMusic(music);
        if (music) {
            const p = selectedMusicToPayload(music);
            setData('music_provider',    p.music_provider);
            setData('music_track_id',    p.music_track_id);
            setData('music_start_ms',    p.music_start_ms);
            setData('music_duration_ms', p.music_duration_ms);
            setData('song_text',         p.song_text);
            setData('artist_text',       p.artist_text);
            setData('song_start_seconds', p.song_start_seconds);
        } else {
            setData('music_provider',    '');
            setData('music_track_id',    '');
            setData('music_start_ms',    undefined);
            setData('music_duration_ms', undefined);
            setData('song_text',         '');
            setData('artist_text',       '');
            setData('song_start_seconds', undefined);
        }
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        // Auto-select "Lainnya" if nothing chosen
        if (!data.tag_ids.length && !data.category) {
            const lainnya = tags.find(t => t.slug === 'lainnya');
            if (lainnya) setData('tag_ids', [lainnya.id]);
        }
        post(`/b/${base.slug}/submit`);
    }

    const hasCustom = !!data.category;

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-start px-4 py-10">
            <div className="w-full max-w-md">
                <Link href={`/b/${base.slug}`} className="inline-flex items-center text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] mb-8 transition-colors">
                    ← <span className="capitalize">{base.name}</span>
                </Link>

                <h1 className="text-xl font-semibold text-[var(--color-ink)] mb-1">Kirim Pesan Anonim</h1>
                <p className="text-sm text-[var(--color-ink-subtle)] mb-8">ke <span className="capitalize">{base.name}</span></p>

                <div className="mb-6 space-y-0.5 text-xs text-[var(--color-ink-subtle)]">
                    <p>Login digunakan untuk keamanan dan mencegah spam.</p>
                    <p>Identitas akunmu tidak ditampilkan kepada admin base maupun di postingan.</p>
                    <p>Pesan yang di-approve akan mendapat ID publik untuk keperluan takedown.</p>
                </div>

                <form onSubmit={submit} className="space-y-5" noValidate>
                    <div className="hidden" aria-hidden="true">
                        <input tabIndex={-1} autoComplete="off" value={data.honeypot} onChange={e => setData('honeypot', e.target.value)} />
                    </div>

                    <Field label="Pesan" required error={errors.message}>
                        <div className="relative">
                            <Textarea id="message" value={data.message} onChange={handleMessage} rows={5} maxLength={2000} placeholder="Tulis pesanmu di sini…" error={!!errors.message} aria-required="true" />
                            <span className={`absolute bottom-2 right-3 text-xs pointer-events-none ${charCount > 1900 ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-subtle)]'}`}>
                                {charCount}/2000
                            </span>
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Untuk" hint="Opsional" error={errors.target_text}>
                            <Input id="target_text" type="text" value={data.target_text} onChange={e => setData('target_text', e.target.value)} maxLength={120} placeholder="Misal: Ketua OSIS" error={!!errors.target_text} />
                        </Field>
                        <Field label="Dari" hint="Opsional" error={errors.alias_text}>
                            <Input id="alias_text" type="text" value={data.alias_text} onChange={e => setData('alias_text', e.target.value)} maxLength={80} placeholder="Seseorang" error={!!errors.alias_text} />
                        </Field>
                    </div>

                    {/* Kategori */}
                    <div>
                        <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                            Kategori <span className="text-[var(--color-ink-subtle)]">(opsional)</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {tags.filter(t => t.slug !== 'lainnya').map(tag => {
                                const sel = data.tag_ids.includes(tag.id);
                                return (
                                    <button key={tag.id} type="button" onClick={() => selectTag(tag.id)}
                                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${sel ? 'bg-[var(--color-accent)] text-[#0B0D0E] border-[var(--color-accent)] font-medium' : 'bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]'}`}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Music picker */}
                    <MusicField value={selectedMusic} onChange={handleMusicChange} />

                    {/* Catatan untuk admin */}
                    <div>
                        <button type="button" onClick={() => setData('show_note' as never, !data.show_note as never)}
                            className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors">
                            {data.show_note ? '− Sembunyikan catatan' : '+ Tambahkan catatan untuk admin'}
                        </button>
                        {data.show_note && (
                            <div className="mt-2">
                                <textarea
                                    value={data.internal_note}
                                    onChange={e => setData('internal_note', e.target.value.slice(0, 200))}
                                    placeholder="Catatan opsional untuk admin, tidak ditampilkan di postingan…"
                                    rows={2}
                                    className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] text-sm px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-ink-subtle)] resize-none"
                                />
                                <p className={`text-right text-[10px] mt-0.5 ${data.internal_note.length > 180 ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-subtle)]'}`}>
                                    {data.internal_note.length}/200
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Consent */}
                    <div className="flex items-start gap-3">
                        <input id="consent" type="checkbox" checked={data.consent} onChange={e => setData('consent', e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] flex-shrink-0 cursor-pointer"
                            aria-required="true"
                        />
                        <label htmlFor="consent" className="text-sm text-[var(--color-ink-muted)] leading-snug cursor-pointer">
                            Saya mengerti bahwa pesan ini akan dimoderasi dan saya tidak menyertakan konten berbahaya, pelecehan, atau data pribadi orang lain tanpa izin.
                        </label>
                    </div>
                    {errors.consent && <p className="text-xs text-[var(--color-danger)] -mt-3">{errors.consent}</p>}

                    <Button type="submit" variant="primary" size="lg" loading={processing} disabled={!data.consent} className="w-full">
                        {processing ? 'Mengirim…' : 'Kirim Menfess'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
