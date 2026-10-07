import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button, Input, Textarea, Field } from '@/components/ui';

const REASON_OPTIONS = [
    { value: 'privacy',          label: 'Pelanggaran privasi',              desc: 'Informasi pribadi yang seharusnya tidak dipublikasikan' },
    { value: 'personal_data',    label: 'Data pribadi tanpa izin',           desc: 'Nama, kontak, lokasi, atau identitas tanpa persetujuan' },
    { value: 'harassment',       label: 'Pelecehan / bullying',              desc: 'Konten yang menyerang, merendahkan, atau mengintimidasi seseorang' },
    { value: 'defamation',       label: 'Pencemaran nama baik',              desc: 'Klaim atau tuduhan tidak benar yang merusak reputasi' },
    { value: 'sender_request',   label: 'Permintaan pengirim',               desc: 'Pengirim asli ingin pesannya diturunkan' },
    { value: 'subject_request',  label: 'Permintaan orang yang disebut',     desc: 'Orang yang disebutkan dalam pesan ingin diturunkan' },
    { value: 'wrong_submission', label: 'Salah kirim / tidak relevan',       desc: 'Pesan tidak sengaja terkirim atau tidak sesuai konteks' },
    { value: 'other',            label: 'Lainnya',                           desc: 'Alasan lain yang tidak tercantum di atas' },
];

type FormData = {
    public_id: string;
    reason_code: string;
    reason_text: string;
    contact: string;
};

interface Props {
    id_prefix?: string;
}

export default function Takedown({ id_prefix = 'MF' }: Props) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        public_id:   '',
        reason_code: '',
        reason_text: '',
        contact:     '',
    });

    const [reasonOpen, setReasonOpen] = useState(false);
    const selectedReason = REASON_OPTIONS.find(r => r.value === data.reason_code);

    // Build full public_id = PREFIX-CODE
    function handleCodeChange(code: string) {
        const upper = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        setData('public_id', upper ? `${id_prefix}-${upper}` : '');
    }

    const codeValue = data.public_id.startsWith(`${id_prefix}-`)
        ? data.public_id.slice(id_prefix.length + 1)
        : data.public_id;

    const canSubmit = !!codeValue.trim() && !!data.reason_code && !!data.reason_text.trim();

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        post('/takedown', { preserveState: true, preserveScroll: true });
    }

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-start px-4 py-10">
            <div className="w-full max-w-md">
                <div className="mb-8">
                    <h1 className="text-xl font-semibold text-[var(--color-ink)]">Ajukan Takedown</h1>
                    <p className="text-sm text-[var(--color-ink-subtle)] mt-1">
                        Temukan Menfess ID pada gambar yang diposting. Format:{' '}
                        <span className="font-mono text-[var(--color-ink-muted)]">{id_prefix}-XXXXXX</span>
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-5" noValidate>

                    {/* Public ID — prefix shown as static, only code editable */}
                    <Field label="ID Publik" required error={errors.public_id}>
                        <div className={`flex rounded-[10px] border bg-[var(--color-surface-raised)] focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)] overflow-hidden ${errors.public_id ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}>
                            <span className="flex items-center px-3 text-sm font-mono font-medium text-[var(--color-ink-muted)] border-r border-[var(--color-border)] select-none bg-[var(--color-canvas)] shrink-0">
                                {id_prefix}-
                            </span>
                            <input
                                type="text"
                                value={codeValue}
                                onChange={e => handleCodeChange(e.target.value)}
                                maxLength={10}
                                placeholder="K7X4QM"
                                className="flex-1 px-3.5 py-2 text-sm bg-transparent text-[var(--color-ink)] font-mono uppercase tracking-widest placeholder:text-[var(--color-ink-subtle)] focus:outline-none"
                                autoCapitalize="characters"
                                autoComplete="off"
                                aria-required="true"
                            />
                        </div>
                    </Field>

                    {/* Reason — custom pill picker */}
                    <Field label="Alasan" required error={errors.reason_code}>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setReasonOpen(v => !v)}
                                className={`w-full flex items-center justify-between px-3.5 py-2 text-sm rounded-[10px] border transition-colors text-left ${
                                    errors.reason_code
                                        ? 'border-[var(--color-danger)] bg-[var(--color-surface-raised)]'
                                        : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)]'
                                }`}
                                aria-expanded={reasonOpen}
                                aria-haspopup="listbox"
                            >                                <span className={selectedReason ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-subtle)]'}>
                                    {selectedReason ? selectedReason.label : 'Pilih alasan…'}
                                </span>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-[var(--color-ink-subtle)] transition-transform ${reasonOpen ? 'rotate-180' : ''}`}>
                                    <path d="M3 5l4 4 4-4"/>
                                </svg>
                            </button>

                            {reasonOpen && (
                                <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-lg overflow-hidden">
                                    {REASON_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => { setData('reason_code', opt.value); setReasonOpen(false); }}
                                            className={`w-full text-left px-4 py-3 transition-colors border-b border-[var(--color-border)] last:border-0 ${
                                                data.reason_code === opt.value
                                                    ? 'bg-[var(--color-accent)] text-[#0B0D0E]'
                                                    : 'hover:bg-[var(--color-canvas)] text-[var(--color-ink)]'
                                            }`}
                                        >
                                            <p className="text-sm font-medium leading-tight">{opt.label}</p>
                                            <p className={`text-xs mt-0.5 ${data.reason_code === opt.value ? 'text-[#0B0D0E]/70' : 'text-[var(--color-ink-subtle)]'}`}>{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Field>

                    <Field label="Penjelasan" required error={errors.reason_text}>
                        <Textarea
                            id="reason_text"
                            value={data.reason_text}
                            onChange={e => setData('reason_text', e.target.value)}
                            rows={4}
                            maxLength={2000}
                            placeholder="Jelaskan mengapa postingan ini perlu dihapus…"
                            error={!!errors.reason_text}
                            aria-required="true"
                        />
                    </Field>

                    <Field label="Kontak" hint="Email atau Instagram agar admin bisa menghubungi" error={errors.contact}>
                        <Input
                            id="contact"
                            type="text"
                            value={data.contact}
                            onChange={e => setData('contact', e.target.value)}
                            maxLength={200}
                            placeholder="Email atau @instagram"
                            error={!!errors.contact}
                        />
                    </Field>

                    <Button type="submit" variant="primary" size="lg" loading={processing} disabled={!canSubmit} className="w-full">
                        {processing ? 'Mengirim…' : 'Ajukan Takedown'}
                    </Button>
                </form>

                <p className="mt-4 text-xs text-[var(--color-ink-subtle)]">
                    Pengajuan yang tidak valid atau tidak berdasar akan diabaikan.
                </p>
            </div>
        </div>
    );
}
