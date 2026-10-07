import { Link } from "@inertiajs/react";
import { Inbox } from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import { Badge, Button, EmptyState } from "@/components/ui";

interface Base {
    id: string;
    name: string;
    slug: string;
    short_code: string;
    role: string;
    pending_count: number;
    approved_count: number;
    takedown_count: number;
}

interface Props {
    bases: Base[];
}

const BTN_PRIMARY =
    "inline-flex items-center justify-center font-semibold rounded-[10px] px-4 py-2 text-sm h-9 bg-[var(--color-accent)] text-[#0B0D0E] hover:bg-[var(--color-accent-hover)] transition-colors";
const BTN_SECONDARY =
    "inline-flex items-center justify-center font-semibold rounded-[10px] px-4 py-2 text-sm h-9 bg-[var(--color-surface-raised)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors";

export default function Dashboard({ bases }: Props) {
    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-[var(--color-ink)]">
                    Dashboard
                </h1>
                <div className="flex gap-2">
                    <Link href="/join" className={BTN_SECONDARY}>
                        Gabung Base
                    </Link>
                    <Link href="/admin/bases/create" className={BTN_PRIMARY}>
                        Buat Base
                    </Link>
                </div>
            </div>

            {bases.length === 0 ? (
                <EmptyState
                    icon={<Inbox size={32} />}
                    title="Belum ada base yang kamu kelola"
                    description="Buat base baru atau gunakan kode undangan untuk bergabung ke base yang sudah ada."
                    action={
                        <div className="flex gap-3">
                            <Link href="/admin/bases/create" className={BTN_PRIMARY}>
                                Buat Base
                            </Link>
                            <Link href="/join" className={BTN_SECONDARY}>
                                Gabung Base
                            </Link>
                        </div>
                    }
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {bases.map((base) => (
                        <Link
                            key={base.id}
                            href={`/admin/classes/${base.id}`}
                            className="block rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 hover:border-[var(--color-border-strong)] transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="font-semibold text-[var(--color-ink)] capitalize">
                                        {base.name}
                                    </div>
                                    <div className="text-xs text-[var(--color-ink-subtle)] mt-0.5 font-mono">
                                        {base.short_code}
                                    </div>
                                </div>
                                <Badge
                                    color={
                                        base.role === "owner"
                                            ? "purple"
                                            : "blue"
                                    }
                                >
                                    {base.role === "owner" ? "Owner" : "Admin"}
                                </Badge>
                            </div>
                            <p className="text-xs text-[var(--color-ink-muted)]">
                                <span className="text-[var(--color-warning)]">
                                    {base.pending_count}
                                </span>{" "}
                                pending
                                {" · "}
                                <span className="text-[var(--color-success)]">
                                    {base.approved_count}
                                </span>{" "}
                                disetujui
                                {" · "}
                                <span className="text-[var(--color-ink-subtle)]">
                                    {base.takedown_count}
                                </span>{" "}
                                takedown
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
