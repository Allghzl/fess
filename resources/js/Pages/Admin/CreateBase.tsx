import { useState, type FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

interface Props {
    errors?: {
        name?: string;
        slug?: string;
        short_code?: string;
        instagram_handle?: string;
    };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_CHAR_RE = /[^a-z0-9-]/;

function autoSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

const INPUT_BASE = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-4 py-2.5 text-sm transition-colors focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]';

export default function CreateBase({ errors = {} }: Props) {
    const { ziggy } = usePage<{ ziggy?: { url?: string } }>().props as any;
    const appUrl = (ziggy?.url ?? window.location.origin).replace(/\/$/, '');

    const [form, setForm] = useState({
        name: '',
        slug: '',
        short_code: '',
        instagram_handle: '',
    });
    const [slugLinked, setSlugLinked] = useState(true);
    const [slugError, setSlugError]   = useState('');
    const [loading, setLoading]       = useState(false);

    const setSlug = (raw: string) => {
        if (SLUG_CHAR_RE.test(raw)) {
            setSlugError('Hanya huruf kecil (a–z), angka (0–9), dan tanda hubung (-) yang diizinkan.');
        } else {
            setSlugError('');
        }
        const clean = raw.replace(/[^a-z0-9-]/g, '');
        setForm(prev => ({ ...prev, slug: clean }));
    };

    const handleNameChange = (name: string) => {
        setForm(prev => ({
            ...prev,
            name,
            slug: slugLinked ? autoSlug(name) : prev.slug,
        }));
        if (slugLinked) setSlugError('');
    };

    const handleSlugLinkToggle = (checked: boolean) => {
        setSlugLinked(checked);
        if (checked) {
            setForm(prev => ({ ...prev, slug: autoSlug(form.name) }));
            setSlugError('');
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (slugError) return;
        setLoading(true);
        router.post('/admin/bases', form, {
            onFinish: () => setLoading(false),
        });
    };

    const slugInvalid = !!slugError || !!errors.slug;

    return (
        <div className="min-h-screen bg-[var(--color-canvas)]">
            <div className="mx-auto max-w-lg px-4 py-12">
                <a
                    href="/admin"
                    className="inline-flex items-center text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors mb-6"
                >
                    ← Kembali ke dashboard
                </a>

                <div className="bg-[var(--color-surface)] px-8 py-10 rounded-xl">
                    <h1 className="text-xl font-bold text-[var(--color-ink)] mb-6">Buat Base Baru</h1>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Nama Base */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                                Nama Base <span className="text-[var(--color-danger)]" aria-hidden>*</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => handleNameChange(e.target.value)}
                                placeholder="XII RPL 1"
                                className={`${INPUT_BASE} ${errors.name ? 'border-[var(--color-danger)]' : ''}`}
                            />
                            {errors.name && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.name}</p>}
                        </div>

                        {/* Slug */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                                    Slug URL <span className="text-[var(--color-danger)]" aria-hidden>*</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={slugLinked}
                                        onChange={e => handleSlugLinkToggle(e.target.checked)}
                                        className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                    />
                                    Samakan dengan nama base
                                </label>
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={e => { setSlugLinked(false); setSlug(e.target.value); }}
                                    placeholder="xii-rpl-1"
                                    disabled={slugLinked}
                                    className={`${INPUT_BASE} font-mono disabled:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed ${slugInvalid ? 'border-[var(--color-danger)]' : ''}`}
                                />
                                {slugError && (
                                    <div className="absolute left-0 -top-9 z-10 rounded-lg bg-[var(--color-danger-dim)] border border-[var(--color-danger)] px-3 py-1.5 text-xs text-[var(--color-danger)] shadow-md whitespace-nowrap">
                                        {slugError}
                                        <span className="absolute left-4 top-full border-4 border-transparent border-t-[var(--color-danger)]" />
                                    </div>
                                )}
                            </div>

                            <p className="mt-1.5 text-xs text-[var(--color-ink-subtle)] font-mono">
                                URL akan menjadi:{' '}
                                <span className={slugInvalid ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}>
                                    {appUrl}/b/{form.slug || '…'}
                                </span>
                            </p>
                            {errors.slug && !slugError && (
                                <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.slug}</p>
                            )}
                        </div>

                        {/* Kode Base */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                                Kode Base <span className="text-[var(--color-danger)]" aria-hidden>*</span>
                            </label>
                            <input
                                type="text"
                                value={form.short_code}
                                onChange={e => setForm(prev => ({ ...prev, short_code: e.target.value.toUpperCase() }))}
                                placeholder="RPLA"
                                className={`${INPUT_BASE} font-mono uppercase tracking-widest ${errors.short_code ? 'border-[var(--color-danger)]' : ''}`}
                            />
                            <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                                Kode pendek yang dibagikan ke anggota. Contoh: <span className="font-mono">RPLA</span>, <span className="font-mono">XIB</span>.
                            </p>
                            {errors.short_code && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.short_code}</p>}
                        </div>

                        {/* Instagram Handle */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                                Instagram Handle
                            </label>
                            <input
                                type="text"
                                value={form.instagram_handle}
                                onChange={e => setForm(prev => ({ ...prev, instagram_handle: e.target.value }))}
                                placeholder="@xii_rpl1_smkn1"
                                className={INPUT_BASE}
                            />
                            {errors.instagram_handle && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.instagram_handle}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !form.name || !form.slug || !form.short_code || !!slugError}
                            className="w-full rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[#0B0D0E] font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Membuat...' : 'Buat Base'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
