import { useState } from "react";
import { router } from "@inertiajs/react";
import { Button } from "@/components/ui";

interface Props {
    prefill_code: string;
    auth_user: { name: string } | null;
    errors?: { code?: string };
}

function InviteCodeInput({
    value,
    onChange,
    hasError,
}: {
    value: string;
    onChange: (v: string) => void;
    hasError: boolean;
}) {
    const displayed =
        value.length >= 4 ? `${value.slice(0, 4)}-${value.slice(4)}` : value;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 8);
        onChange(raw);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const raw = e.clipboardData
            .getData("text")
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 8);
        onChange(raw);
    };

    return (
        <input
            type="text"
            value={displayed}
            onChange={handleChange}
            onPaste={handlePaste}
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            placeholder="XXXX-XXXX"
            maxLength={9}
            className={[
                "w-full border bg-[var(--color-surface-raised)]",
                "text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)]",
                "font-mono text-2xl text-center tracking-[0.25em] uppercase",
                "px-4 py-4 transition-colors focus:outline-none rounded-[10px]",
                "focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]",
                hasError
                    ? "border-[var(--color-danger)]"
                    : "border-[var(--color-border)]",
            ].join(" ")}
        />
    );
}

export default function Join({ prefill_code, auth_user, errors }: Props) {
    const [code, setCode] = useState(
        (prefill_code || "")
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 8),
    );
    const [loading, setLoading] = useState(false);

    const codeWithDash =
        code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
    const isComplete = code.length === 8;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isComplete) return;
        setLoading(true);
        router.post(
            "/join",
            { code: codeWithDash },
            {
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-4">
            <div className="w-full max-w-xs">
                <div className="mb-8">
                    <h1 className="text-xl font-semibold text-[var(--color-ink)]">
                        Gabung Base
                    </h1>
                    <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
                        Masukkan kode undangan dari owner base.
                    </p>
                </div>

                {auth_user && (
                    <p className="mb-5 text-xs text-[var(--color-success)]">
                        {auth_user.name}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <InviteCodeInput
                            value={code}
                            onChange={setCode}
                            hasError={!!errors?.code}
                        />
                        {errors?.code && (
                            <p className="mt-2 text-xs text-[var(--color-danger)] text-center">
                                {errors.code}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        disabled={!isComplete}
                        className="w-full"
                    >
                        {loading ? "Memproses..." : "Lanjutkan"}
                    </Button>
                </form>

                <div className="mt-8">
                    <a
                        href="/"
                        className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)] transition-colors"
                    >
                        ← Kembali
                    </a>
                </div>
            </div>
        </div>
    );
}
