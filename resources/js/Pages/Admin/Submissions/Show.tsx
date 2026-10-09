import AdminLayout from "@/Layouts/AdminLayout";
import {
    Alert,
    Button,
    Field,
    PageHeader,
    SectionTitle,
    StatusBadge,
    Textarea,
} from "@/components/ui";
import { ClassWorkspace, Submission, Tag } from "@/types";
import { useForm } from "@inertiajs/react";
import { useState } from "react";

function detectPii(text: string): string[] {
    const warnings: string[] = [];
    if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text))
        warnings.push("alamat email");
    if (/(\+62|0)[0-9]{8,13}/.test(text)) warnings.push("nomor telepon");
    return warnings;
}

export default function SubmissionShow({
    class: cls,
    submission,
}: {
    class: ClassWorkspace;
    submission: Submission;
    class_tags?: Tag[]; // kept in props for compat, not used for editing
}) {
    // Only internal_note is editable — content fields must not be modified
    const noteForm = useForm({
        internal_note: submission.internal_note ?? "",
    });

    const approveForm = useForm({
        internal_note: submission.internal_note ?? "",
    });

    const rejectForm = useForm({
        rejection_reason: "",
        internal_note: submission.internal_note ?? "",
    });

    const [showReject, setShowReject] = useState(false);

    const piiWarnings = detectPii(submission.original_message);
    const canModerate = ["submitted", "under_review"].includes(
        submission.status,
    );

    const fieldClass =
        "w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]";

    function syncNote(value: string) {
        noteForm.setData("internal_note", value);
        approveForm.setData("internal_note", value);
        rejectForm.setData("internal_note", value);
    }

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            <PageHeader
                back={{
                    label: "Inbox",
                    href: `/admin/classes/${cls.id}/submissions`,
                }}
                title="Detail Pesan"
            />

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Original message — read only */}
                    <div>
                        <SectionTitle>Pesan Asli</SectionTitle>
                        <p className="mt-3 text-sm text-[var(--color-ink)] whitespace-pre-wrap leading-relaxed">
                            {submission.original_message}
                        </p>
                        {(submission.song_text || submission.artist_text) && (
                            <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
                                🎵{" "}
                                {[submission.song_text, submission.artist_text]
                                    .filter(Boolean)
                                    .join(" — ")}
                                {submission.song_start_seconds != null && (
                                    <span className="ml-1 font-mono">
                                        (
                                        {Math.floor(
                                            submission.song_start_seconds / 60,
                                        )}
                                        :
                                        {String(
                                            submission.song_start_seconds % 60,
                                        ).padStart(2, "0")}{" "}
                                        —{" "}
                                        {Math.floor(
                                            (submission.song_start_seconds +
                                                30) /
                                                60,
                                        )}
                                        :
                                        {String(
                                            (submission.song_start_seconds +
                                                30) %
                                                60,
                                        ).padStart(2, "0")}
                                        )
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Read-only metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {submission.target_text && (
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-subtle)] mb-1">Untuk</p>
                                <p className="text-[var(--color-ink)]">{submission.target_text}</p>
                            </div>
                        )}
                        {submission.alias_text && (
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-subtle)] mb-1">Dari</p>
                                <p className="text-[var(--color-ink)]">{submission.alias_text}</p>
                            </div>
                        )}
                        {submission.category && (
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-subtle)] mb-1">Kategori</p>
                                <p className="text-[var(--color-ink)]">{submission.category}</p>
                            </div>
                        )}
                    </div>

                    {/* Catatan dari pengirim (internal_note) — read-only display */}
                    {submission.internal_note && (
                        <div className="px-3 py-2 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                            <p className="text-[10px] text-[var(--color-ink-subtle)] uppercase tracking-wide mb-1">
                                Catatan dari pengirim
                            </p>
                            <p className="text-xs text-[var(--color-ink-muted)]">
                                {submission.internal_note}
                            </p>
                        </div>
                    )}

                    {/* PII warning */}
                    {piiWarnings.length > 0 && (
                        <Alert variant="warning">
                            <strong>Perhatian:</strong> pesan mungkin mengandung{" "}
                            {piiWarnings.join(", ")}. Tinjau sebelum menyetujui.
                        </Alert>
                    )}

                    {/* Catatan internal admin */}
                    <div className="pt-6 border-t border-[var(--color-border)] space-y-4">
                        <Field label="Catatan Internal Admin">
                            <Textarea
                                rows={2}
                                value={noteForm.data.internal_note}
                                onChange={(e) => syncNote(e.target.value)}
                            />
                        </Field>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                                noteForm.patch(
                                    `/admin/classes/${cls.id}/submissions/${submission.id}`,
                                )
                            }
                            loading={noteForm.processing}
                        >
                            Simpan Catatan
                        </Button>
                    </div>

                    {/* Action buttons */}
                    {canModerate && (
                        <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-3">
                            <button
                                onClick={() =>
                                    approveForm.post(
                                        `/admin/classes/${cls.id}/submissions/${submission.id}/approve`,
                                    )
                                }
                                disabled={approveForm.processing}
                                className="inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-colors px-5 py-2.5 text-sm bg-[var(--color-success)] text-[#0A1A10] hover:opacity-90 disabled:opacity-40"
                            >
                                {approveForm.processing
                                    ? "Memproses…"
                                    : "Setujui"}
                            </button>
                            <Button
                                variant="danger-ghost"
                                size="lg"
                                onClick={() => setShowReject((v) => !v)}
                            >
                                Tolak
                            </Button>
                        </div>
                    )}

                    {/* Reject form */}
                    {showReject && (
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-[var(--color-danger)]">
                                Tolak pesan ini
                            </p>
                            <Field label="Alasan Tolak (internal, opsional)">
                                <input
                                    type="text"
                                    className={fieldClass}
                                    placeholder="Opsional…"
                                    value={rejectForm.data.rejection_reason}
                                    onChange={(e) =>
                                        rejectForm.setData(
                                            "rejection_reason",
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <div className="flex gap-2">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() =>
                                        rejectForm.post(
                                            `/admin/classes/${cls.id}/submissions/${submission.id}/reject`,
                                        )
                                    }
                                    loading={rejectForm.processing}
                                >
                                    Konfirmasi Tolak
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowReject(false)}
                                >
                                    Batal
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-3 text-sm">
                    <SectionTitle>Meta</SectionTitle>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--color-ink-muted)]">
                                Status
                            </span>
                            <StatusBadge status={submission.status} />
                        </div>
                        {submission.public_id && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[var(--color-ink-muted)]">
                                    Public ID
                                </span>
                                <span className="font-mono text-xs text-[var(--color-ink)]">
                                    {submission.public_id}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--color-ink-muted)]">
                                Dikirim
                            </span>
                            <span className="text-[var(--color-ink)]">
                                {new Date(submission.created_at).toLocaleString(
                                    "id-ID",
                                )}
                            </span>
                        </div>
                        {submission.approved_at && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[var(--color-ink-muted)]">
                                    Disetujui
                                </span>
                                <span className="text-[var(--color-ink)]">
                                    {new Date(
                                        submission.approved_at,
                                    ).toLocaleString("id-ID")}
                                </span>
                            </div>
                        )}
                        {submission.rejected_at && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[var(--color-ink-muted)]">
                                    Ditolak
                                </span>
                                <span className="text-[var(--color-ink)]">
                                    {new Date(
                                        submission.rejected_at,
                                    ).toLocaleString("id-ID")}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
