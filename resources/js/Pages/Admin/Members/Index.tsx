import React, { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import type { ClassWorkspace } from '@/types';
import {
    PageHeader, Badge, Button, Modal, ConfirmDialog,
    Alert, CodeDisplay, EmptyState,
} from '@/components/ui';
import { Check, Shield } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    role: string;
}

interface PendingRequest {
    id: string;
    user_name: string;
    created_at: string;
}

interface Invitation {
    id: string;
    code_hint: string;
    expires_at: string | null;
    max_uses: number | null;
    claimed_count: number;
    requires_approval: boolean;
    revoked_at: string | null;
    is_valid: boolean;
}

interface NewInvite {
    id: string;
    code: string;
    expires_at: string | null;
    max_uses: number | null;
    requires_approval: boolean;
    base_name: string;
}

interface Flash {
    new_invite: NewInvite | null;
    success: string | null;
}

interface Props {
    class: ClassWorkspace;
    members: Member[];
    pending_requests: PendingRequest[];
    invitations: Invitation[];
    is_owner: boolean;
    flash: Flash;
    errors?: { request?: string };
}

function InviteCodeModal({ invite, onClose }: { invite: NewInvite; onClose: () => void }) {
    const [copied, setCopied] = useState<'code' | 'link' | 'message' | null>(null);

    const copy = (key: 'code' | 'link' | 'message', text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const link = `${window.location.origin}/join?code=${invite.code}`;
    const message =
        `Kamu diundang jadi admin di ${invite.base_name}.\n\nBuka: ${link}\n\nKode: ${invite.code}\n\nLogin dengan PinatAuth untuk melanjutkan.`;

    return (
        <Modal open onClose={onClose} title="Undangan Dibuat">
            <div className="space-y-5">
                <div className="flex items-center gap-2 -mt-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] shrink-0" />
                    <p className="text-xs text-[var(--color-ink-muted)]">
                        Salin kode ini sekarang. Tidak dapat ditampilkan lagi.
                    </p>
                </div>

                <CodeDisplay code={invite.code} />

                <div className="text-xs text-[var(--color-ink-muted)] space-y-1 border-t border-[var(--color-border)] pt-3">
                    {invite.expires_at && (
                        <p>Berlaku hingga: {new Date(invite.expires_at).toLocaleString('id-ID')}</p>
                    )}
                    {invite.max_uses && <p>Maks. penggunaan: {invite.max_uses}x</p>}
                    <p>{invite.requires_approval ? 'Perlu persetujuan owner' : 'Langsung bergabung'}</p>
                </div>

                <div className="flex flex-col gap-2">
                    <Button variant="primary" onClick={() => copy('code', invite.code)} className="w-full">
                        {copied === 'code' ? <><Check size={14} /> Tersalin</> : 'Salin Kode'}
                    </Button>
                    <Button variant="secondary" onClick={() => copy('link', link)} className="w-full">
                        {copied === 'link' ? <><Check size={14} /> Tersalin</> : 'Salin Link'}
                    </Button>
                    <Button variant="secondary" onClick={() => copy('message', message)} className="w-full">
                        {copied === 'message' ? <><Check size={14} /> Tersalin</> : 'Salin Pesan'}
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="w-full">Tutup</Button>
                </div>
            </div>
        </Modal>
    );
}

export default function MembersIndex({
    class: cls,
    members,
    pending_requests,
    invitations,
    is_owner,
    flash,
    errors,
}: Props) {
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        expires_in_hours: '' as '' | '1' | '24' | '168',
        max_uses: '',
        requires_approval: true,
    });
    const [submitting, setSubmitting] = useState(false);
    const [newInvite, setNewInvite] = useState<NewInvite | null>(flash.new_invite);
    const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

    const createInvite = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(
            `/admin/classes/${cls.id}/members/invitations`,
            {
                expires_in_hours: inviteForm.expires_in_hours || null,
                max_uses: inviteForm.max_uses ? parseInt(inviteForm.max_uses) : null,
                requires_approval: inviteForm.requires_approval,
            },
            {
                onSuccess: (page) => {
                    const fi = (page.props as unknown as { flash: Flash }).flash?.new_invite;
                    if (fi) setNewInvite(fi);
                    setShowInviteForm(false);
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    const approveRequest = (requestId: string) =>
        router.post(`/admin/classes/${cls.id}/members/requests/${requestId}/approve`);

    const rejectRequest = (requestId: string) =>
        router.post(`/admin/classes/${cls.id}/members/requests/${requestId}/reject`);

    const revokeInvite = (invitationId: string) =>
        router.delete(`/admin/classes/${cls.id}/members/invitations/${invitationId}/revoke`);

    const removeAdmin = (userId: string) =>
        router.delete(`/admin/classes/${cls.id}/members/admins/${userId}`);

    return (
        <AdminLayout classInfo={{ id: cls.id, name: cls.name }}>
            {newInvite && (
                <InviteCodeModal invite={newInvite} onClose={() => setNewInvite(null)} />
            )}

            <ConfirmDialog
                open={confirmRemove !== null}
                onClose={() => setConfirmRemove(null)}
                onConfirm={() => {
                    if (confirmRemove) removeAdmin(confirmRemove.id);
                    setConfirmRemove(null);
                }}
                title="Hapus Admin"
                description={`Hapus ${confirmRemove?.name} dari base ini?`}
                confirmLabel="Hapus"
                danger
            />

            <PageHeader
                back={{ label: cls.name, href: `/admin/classes/${cls.id}` }}
                title="Anggota & Undangan"
            />

            {flash.success && (
                <Alert variant="success" className="mb-5">{flash.success}</Alert>
            )}
            {errors?.request && (
                <Alert variant="error" className="mb-5">{errors.request}</Alert>
            )}

            {/* Members */}
            <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)] mb-3">
                    Anggota ({members.length})
                </p>
                <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                    {members.map((m) => (
                        <div
                            key={m.id}
                            className="flex items-center justify-between py-3 hover:bg-[var(--color-surface-raised)] transition-colors px-1"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-[var(--color-ink)]">{m.name}</span>
                                <Badge color={m.role === 'owner' ? 'purple' : 'blue'}>
                                    {m.role === 'owner' ? 'Owner' : 'Admin'}
                                </Badge>
                            </div>
                            {is_owner && m.role !== 'owner' && (
                                <Button
                                    variant="danger-ghost"
                                    size="sm"
                                    onClick={() => setConfirmRemove({ id: m.id, name: m.name })}
                                >
                                    Hapus
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Pending requests (owner only) */}
            {is_owner && pending_requests.length > 0 && (
                <section className="pt-6 mt-6 border-t border-[var(--color-border)]">
                    <Alert variant="warning" className="mb-4">
                        {pending_requests.length} permintaan bergabung menunggu persetujuan.
                    </Alert>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)] mb-3">
                        Permintaan Bergabung
                    </p>
                    <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                        {pending_requests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between py-3 px-1">
                                <div>
                                    <span className="text-sm font-medium text-[var(--color-ink)]">{req.user_name}</span>
                                    <span className="ml-2 text-xs text-[var(--color-ink-subtle)]">
                                        {new Date(req.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => approveRequest(req.id)}
                                        className="!bg-[var(--color-success-dim)] !text-[var(--color-success)] !border-[var(--color-success)]"
                                    >
                                        Setujui
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => rejectRequest(req.id)}
                                    >
                                        Tolak
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Invitations (owner only) */}
            {is_owner && (
                <section className="pt-6 mt-6 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)]">
                            Kode Undangan
                        </p>
                        <Button variant="primary" size="sm" onClick={() => setShowInviteForm(!showInviteForm)}>
                            + Buat Kode
                        </Button>
                    </div>

                    {showInviteForm && (
                        <form
                            onSubmit={createInvite}
                            className="mb-5 pt-4 space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                                    Masa berlaku
                                </label>
                                <select
                                    value={inviteForm.expires_in_hours}
                                    onChange={(e) => setInviteForm(prev => ({
                                        ...prev,
                                        expires_in_hours: e.target.value as typeof inviteForm.expires_in_hours,
                                    }))}
                                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] appearance-none cursor-pointer"
                                >
                                    <option value="">Tidak ada batas waktu</option>
                                    <option value="1">1 jam</option>
                                    <option value="24">24 jam</option>
                                    <option value="168">7 hari</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-1.5">
                                    Maks. penggunaan (kosong = tak terbatas)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={inviteForm.max_uses}
                                    onChange={(e) => setInviteForm(prev => ({ ...prev, max_uses: e.target.value }))}
                                    placeholder="Misal: 10"
                                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        id="requires_approval"
                                        type="checkbox"
                                        checked={inviteForm.requires_approval}
                                        onChange={(e) => setInviteForm(prev => ({
                                            ...prev,
                                            requires_approval: e.target.checked,
                                        }))}
                                        className="h-4 w-4 rounded border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] accent-[var(--color-accent)]"
                                    />
                                    <label htmlFor="requires_approval" className="text-sm text-[var(--color-ink)]">
                                        Perlu persetujuan owner sebelum bergabung
                                    </label>
                                </div>
                                {!inviteForm.requires_approval && (
                                    <Alert variant="warning">
                                        Siapa saja dengan kode ini langsung mendapat akses admin tanpa persetujuan.
                                    </Alert>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={submitting}
                                    loading={submitting}
                                >
                                    Buat Kode
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowInviteForm(false)}
                                >
                                    Batal
                                </Button>
                            </div>
                        </form>
                    )}

                    {invitations.length === 0 ? (
                        <EmptyState
                            icon={<Shield size={28} />}
                            title="Belum ada kode undangan."
                        />
                    ) : (
                        <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                            {invitations.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between py-3 px-1">
                                    <div>
                                        <span className="font-mono text-sm font-semibold text-[var(--color-ink)]">
                                            ****-{inv.code_hint}
                                        </span>
                                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-[var(--color-ink-subtle)]">
                                            {inv.expires_at && (
                                                <span>Exp: {new Date(inv.expires_at).toLocaleDateString('id-ID')}</span>
                                            )}
                                            <span>{inv.claimed_count}{inv.max_uses ? `/${inv.max_uses}` : ''} digunakan</span>
                                            {inv.requires_approval && <span>· Perlu approval</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge color={
                                            inv.revoked_at ? 'gray' : inv.is_valid ? 'green' : 'amber'
                                        }>
                                            {inv.revoked_at ? 'Dicabut' : inv.is_valid ? 'Aktif' : 'Kadaluarsa'}
                                        </Badge>
                                        {!inv.revoked_at && inv.is_valid && (
                                            <Button
                                                variant="danger-ghost"
                                                size="sm"
                                                onClick={() => revokeInvite(inv.id)}
                                            >
                                                Cabut
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </AdminLayout>
    );
}
