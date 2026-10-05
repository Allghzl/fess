import { useForm } from '@inertiajs/react';
import { Button, Input, Textarea, Select, Field } from '@/components/ui';

type FormData = {
    public_id: string;
    reason_code: string;
    reason_text: string;
    contact: string;
};

const REASON_OPTIONS = [
    { value: 'privacy',           label: 'Pelanggaran privasi' },
    { value: 'personal_data',     label: 'Data pribadi tanpa izin' },
    { value: 'harassment',        label: 'Pelecehan / bullying' },
    { value: 'defamation',        label: 'Pencemaran nama baik' },
    { value: 'sender_request',    label: 'Permintaan pengirim' },
    { value: 'subject_request',   label: 'Permintaan orang yang disebut' },
    { value: 'wrong_submission',  label: 'Salah kirim / tidak relevan' },
    { value: 'other',             label: 'Lainnya' },
];

export default function Takedown() {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        public_id: '',
        reason_code: '',
        reason_text: '',
        contact: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/takedown');
    }

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-start px-4 py-10">
            <div className="w-full max-w-md">
                <div className="mb-8">
                    <h1 className="text-xl font-semibold text-[var(--color-ink)]">Ajukan Takedown</h1>
                    <p className="text-sm text-[var(--color-ink-subtle)] mt-1">
                        Temukan Menfess ID pada gambar yang diposting di Instagram.
                        Format: <span className="font-mono text-[var(--color-ink-muted)]">MF-XXXXXX</span>
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-5" noValidate>
                    <Field label="ID Publik" required error={errors.public_id}>
                        <Input
                            id="public_id"
                            type="text"
                            value={data.public_id}
                            onChange={e => setData('public_id', e.target.value.toUpperCase())}
                            maxLength={20}
                            placeholder="Contoh: MF-K7X4QM"
                            error={!!errors.public_id}
                            className="font-mono uppercase tracking-wide"
                            aria-required="true"
                            aria-describedby={errors.public_id ? 'public-id-error' : undefined}
                            autoCapitalize="characters"
                            autoComplete="off"
                        />
                    </Field>

                    <Field label="Alasan" required error={errors.reason_code}>
                        <Select
                            id="reason_code"
                            value={data.reason_code}
                            onChange={e => setData('reason_code', e.target.value)}
                            error={!!errors.reason_code}
                            aria-required="true"
                            aria-describedby={errors.reason_code ? 'reason-code-error' : undefined}
                        >
                            <option value="">Pilih alasan…</option>
                            {REASON_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </Select>
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
                            aria-describedby={errors.reason_text ? 'reason-text-error' : undefined}
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

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={processing}
                        className="w-full"
                    >
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
