import { useState, useEffect } from "react";
import { router } from "@inertiajs/react";

interface Props {
    app_name: string;
    errors?: { code?: string };
}

const TARGETS = ["teman", "pacar", "sahabat", "mantan", "siapa saja", "gebetan"];

export default function Welcome({ app_name, errors }: Props) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [idx, setIdx] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const iv = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIdx((i) => (i + 1) % TARGETS.length);
                setVisible(true);
            }, 250);
        }, 2400);
        return () => clearInterval(iv);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setLoading(true);
        router.post("/base-lookup", { code: code.trim() }, {
            onFinish: () => setLoading(false),
        });
    };

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-sm">

                    <img
                        src="/sapa-icon.svg"
                        alt={app_name}
                        className="h-16 w-16 mb-12"
                        draggable={false}
                    />

                    {/* Headline — left aligned, 2-line break */}
                    <h1 className="text-5xl font-black tracking-tight leading-[1.1] mb-10">
                        <span className="text-[var(--color-ink-muted)]">
                            Kirim pesan ke
                        </span>
                        <br />
                        <span
                            className="text-[var(--color-accent)]"
                            style={{
                                display: "inline-block",
                                opacity: visible ? 1 : 0,
                                transform: visible ? "translateY(0)" : "translateY(8px)",
                                transition: "opacity 0.25s ease, transform 0.25s ease",
                            }}
                        >
                            {TARGETS[idx]}.
                        </span>
                    </h1>

                    {/* Input — bottom border only, inline submit */}
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-center gap-3 border-b-2 border-[var(--color-border)] pb-2 mb-1">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="kode base"
                                autoComplete="off"
                                autoFocus
                                maxLength={16}
                                style={{ outline: "none" }}
                                className="flex-1 bg-transparent font-mono text-base font-bold tracking-[0.15em] uppercase text-[var(--color-ink)] placeholder:text-[var(--color-border-strong)]"
                            />
                            <button
                                type="submit"
                                disabled={!code.trim() || loading}
                                className="text-sm font-semibold text-[var(--color-accent)] disabled:opacity-30 hover:opacity-70 transition-opacity shrink-0"
                            >
                                {loading ? "…" : "Masuk"}
                            </button>
                        </div>
                        {errors?.code && (
                            <p className="text-xs text-[var(--color-danger)] mt-2">
                                {errors.code}
                            </p>
                        )}
                    </form>
                </div>
            </div>

            <footer className="py-6 text-center text-xs text-[var(--color-ink-subtle)] space-x-4">
                <a href="/takedown" className="hover:text-[var(--color-ink-muted)] transition-colors">Takedown</a>
                <span aria-hidden>·</span>
                <a href="/join" className="hover:text-[var(--color-ink-muted)] transition-colors">Gabung Base</a>
                <span aria-hidden>·</span>
                <a href="/admin" className="hover:text-[var(--color-ink-muted)] transition-colors">Admin</a>
            </footer>
        </div>
    );
}
