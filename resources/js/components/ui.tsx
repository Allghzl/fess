/**
 * Pinat Menfess – shared UI primitives
 * Dark-first design system, Tailwind v4 tokens via CSS custom props.
 */
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    forwardRef,
    useCallback,
    useId,
} from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function cx(...args: (string | undefined | null | false)[]): string {
    return args.filter(Boolean).join(" ");
}

// ─── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant =
    | "primary"
    | "secondary"
    | "ghost"
    | "danger"
    | "danger-ghost";
type ButtonSize = "sm" | "md" | "lg";

const BTN_BASE =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none whitespace-nowrap";

const BTN_VARIANT: Record<ButtonVariant, string> = {
    primary:
        "bg-[var(--color-accent)] text-[#0B0D0E] font-semibold hover:bg-[var(--color-accent-hover)]",
    secondary:
        "bg-[var(--color-surface-raised)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]",
    ghost: "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]",
    danger: "bg-[var(--color-danger)] text-[#0B0D0E] hover:opacity-90",
    "danger-ghost":
        "text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)]",
};

const BTN_SIZE: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs h-7",
    md: "px-4 py-2 text-sm h-9",
    lg: "px-5 py-2.5 text-sm h-10",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = "primary",
            size = "md",
            loading,
            icon,
            children,
            className,
            disabled,
            ...rest
        },
        ref,
    ) => (
        <button
            ref={ref}
            className={cx(
                BTN_BASE,
                BTN_VARIANT[variant],
                BTN_SIZE[size],
                className,
            )}
            disabled={disabled || loading}
            {...rest}
        >
            {loading ? <Spinner size={14} /> : icon}
            {children}
        </button>
    ),
);
Button.displayName = "Button";

// ─── IconButton ──────────────────────────────────────────────────────────────

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    size?: ButtonSize;
    variant?: ButtonVariant;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        { label, size = "md", variant = "ghost", className, children, ...rest },
        ref,
    ) => (
        <button
            ref={ref}
            aria-label={label}
            className={cx(
                BTN_BASE,
                BTN_VARIANT[variant],
                "px-0",
                size === "sm"
                    ? "h-7 w-7"
                    : size === "lg"
                      ? "h-10 w-10"
                      : "h-9 w-9",
                className,
            )}
            {...rest}
        >
            {children}
        </button>
    ),
);
IconButton.displayName = "IconButton";

// ─── Input / Textarea / Select ───────────────────────────────────────────────

const FIELD_BASE =
    "w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-colors focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed";

export const Input = forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ error, className, ...rest }, ref) => (
    <input
        ref={ref}
        className={cx(
            FIELD_BASE,
            "px-3.5 py-2 text-sm",
            error && "border-[var(--color-danger)]",
            className,
        )}
        {...rest}
    />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ error, className, ...rest }, ref) => (
    <textarea
        ref={ref}
        className={cx(
            FIELD_BASE,
            "px-3.5 py-2.5 text-sm resize-none",
            error && "border-[var(--color-danger)]",
            className,
        )}
        {...rest}
    />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(({ error, className, children, ...rest }, ref) => (
    <select
        ref={ref}
        className={cx(
            FIELD_BASE,
            "px-3.5 py-2 text-sm appearance-none cursor-pointer",
            error && "border-[var(--color-danger)]",
            className,
        )}
        {...rest}
    >
        {children}
    </select>
));
Select.displayName = "Select";

// ─── Field (label + error wrapper) ──────────────────────────────────────────

interface FieldProps {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function Field({
    label,
    error,
    hint,
    required,
    children,
    className,
}: FieldProps) {
    return (
        <div className={cx("space-y-1.5", className)}>
            {label && (
                <label className="block text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
                    {label}
                    {required && (
                        <span
                            className="ml-1 text-[var(--color-danger)]"
                            aria-hidden
                        >
                            *
                        </span>
                    )}
                </label>
            )}
            {children}
            {error && (
                <p className="text-xs text-[var(--color-danger)]">{error}</p>
            )}
            {!error && hint && (
                <p className="text-xs text-[var(--color-ink-subtle)]">{hint}</p>
            )}
        </div>
    );
}

// ─── Badge / StatusBadge ─────────────────────────────────────────────────────

type BadgeColor =
    | "pink"
    | "green"
    | "amber"
    | "red"
    | "blue"
    | "gray"
    | "purple";

const BADGE_COLOR: Record<BadgeColor, string> = {
    pink: "bg-[var(--color-accent-dim)] text-[var(--color-accent-text)]",
    green: "bg-[var(--color-success-dim)] text-[var(--color-success)]",
    amber: "bg-[var(--color-warning-dim)] text-[var(--color-warning)]",
    red: "bg-[var(--color-danger-dim)] text-[var(--color-danger)]",
    blue: "bg-[var(--color-info-dim)] text-[var(--color-info)]",
    gray: "bg-[var(--color-surface-hover)] text-[var(--color-ink-muted)]",
    purple: "bg-[#1E1030] text-[#C084FC]",
};

interface BadgeProps {
    color?: BadgeColor;
    children: React.ReactNode;
    className?: string;
}

export function Badge({ color = "gray", children, className }: BadgeProps) {
    return (
        <span
            className={cx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                BADGE_COLOR[color],
                className,
            )}
        >
            {children}
        </span>
    );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({
    size = 16,
    className,
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            className={cx("animate-spin", className)}
            aria-hidden
        >
            <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="2.5"
            />
            <path
                d="M14 8a6 6 0 0 0-6-6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(
            () => setToasts((prev) => prev.filter((t) => t.id !== id)),
            3500,
        );
    }, []);

    const TOAST_ICON: Record<ToastType, string> = {
        success: "✓",
        error: "✕",
        warning: "!",
        info: "i",
    };

    const TOAST_COLOR: Record<ToastType, string> = {
        success: "border-[var(--color-success)] text-[var(--color-success)]",
        error: "border-[var(--color-danger)] text-[var(--color-danger)]",
        warning: "border-[var(--color-warning)] text-[var(--color-warning)]",
        info: "border-[var(--color-border-strong)] text-[var(--color-ink-muted)]",
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div
                className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none"
                aria-live="polite"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={cx(
                            "pointer-events-auto flex items-center gap-3 rounded-xl border bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-ink)] shadow-xl max-w-xs",
                            TOAST_COLOR[t.type],
                        )}
                    >
                        <span
                            className={cx(
                                "font-bold text-xs w-4 text-center shrink-0",
                                TOAST_COLOR[t.type],
                            )}
                        >
                            {TOAST_ICON[t.type]}
                        </span>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside ToastProvider");
    return ctx;
}

// ─── Modal / Dialog ──────────────────────────────────────────────────────────

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({
    open,
    onClose,
    title,
    children,
    className,
}: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const handle = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handle);
        return () => document.removeEventListener("keydown", handle);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal
        >
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
                onClick={onClose}
            />
            <div
                className={cx(
                    "relative w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl",
                    className,
                )}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
                        <h2 className="text-base font-semibold text-[var(--color-ink)]">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            aria-label="Tutup"
                            className="text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] transition-colors"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            >
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ─── ConfirmDialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    loading?: boolean;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Konfirmasi",
    cancelLabel = "Batal",
    danger = false,
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} onClose={onClose} className="max-w-sm">
            <div className="space-y-4">
                <div>
                    <p className="font-semibold text-[var(--color-ink)]">
                        {title}
                    </p>
                    {description && (
                        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                            {description}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={danger ? "danger" : "primary"}
                        size="sm"
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {icon && (
                <div className="mb-4 text-[var(--color-ink-subtle)]">
                    {icon}
                </div>
            )}
            <p className="text-sm font-medium text-[var(--color-ink)]">
                {title}
            </p>
            {description && (
                <p className="mt-1 text-xs text-[var(--color-ink-muted)] max-w-xs">
                    {description}
                </p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
    back?: { label: string; href: string };
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function PageHeader({ back, title, subtitle, action }: PageHeaderProps) {
    return (
        <div className="mb-6 flex flex-col gap-1">
            {back && (
                <a
                    href={back.href}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors mb-1"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    >
                        <path d="M19 12H5m7-7-7 7 7 7" />
                    </svg>
                    {back.label}
                </a>
            )}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-row items-baseline gap-2 min-w-0">
                    <h1 className="text-xl font-bold text-[var(--color-ink)] capitalize overflow-hidden whitespace-nowrap max-w-full">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
        </div>
    );
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cx(
                "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5",
                className,
            )}
        >
            {children}
        </div>
    );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)] mb-3">
            {children}
        </p>
    );
}

// ─── CopyButton ──────────────────────────────────────────────────────────────

export function CopyButton({
    value,
    label = "Salin",
}: {
    value: string;
    label?: string;
}) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? "✓ Tersalin" : label}
        </Button>
    );
}

// ─── CodeDisplay ─────────────────────────────────────────────────────────────

export function CodeDisplay({
    code,
    className,
}: {
    code: string;
    className?: string;
}) {
    return (
        <div
            className={cx(
                "rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] px-5 py-4 font-mono text-2xl font-bold tracking-[0.3em] text-[var(--color-ink)] text-center",
                className,
            )}
        >
            {code}
        </div>
    );
}

// ─── Alert ───────────────────────────────────────────────────────────────────

type AlertVariant = "info" | "warning" | "error" | "success";

const ALERT_STYLE: Record<AlertVariant, string> = {
    info: "bg-[var(--color-info-dim)] border-[var(--color-info)] text-[var(--color-info)]",
    warning:
        "bg-[var(--color-warning-dim)] border-[var(--color-warning)] text-[var(--color-warning)]",
    error: "bg-[var(--color-danger-dim)] border-[var(--color-danger)] text-[var(--color-danger)]",
    success:
        "bg-[var(--color-success-dim)] border-[var(--color-success)] text-[var(--color-success)]",
};

export function Alert({
    variant = "info",
    children,
    className,
}: {
    variant?: AlertVariant;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cx(
                "rounded-xl border px-4 py-3 text-sm",
                ALERT_STYLE[variant],
                className,
            )}
        >
            {children}
        </div>
    );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cx(
                "animate-pulse rounded-lg bg-[var(--color-surface-raised)]",
                className,
            )}
        />
    );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

interface TabsProps {
    items: { value: string; label: string; count?: number }[];
    value: string;
    onChange: (v: string) => void;
    className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
    return (
        <div
            className={cx(
                "flex gap-1 border-b border-[var(--color-border)]",
                className,
            )}
        >
            {items.map((item) => (
                <button
                    key={item.value}
                    onClick={() => onChange(item.value)}
                    className={cx(
                        "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                        value === item.value
                            ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                            : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                    )}
                >
                    {item.label}
                    {item.count != null && item.count > 0 && (
                        <span className="ml-1.5 rounded-full bg-[var(--color-accent-dim)] px-1.5 py-0.5 text-[10px] text-[var(--color-accent-text)]">
                            {item.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// ─── Drawer / Sheet (mobile nav) ────────────────────────────────────────────

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function Drawer({ open, onClose, children }: DrawerProps) {
    useEffect(() => {
        if (!open) return;
        const handle = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handle);
        return () => document.removeEventListener("keydown", handle);
    }, [open, onClose]);

    return (
        <div
            className={cx(
                "fixed inset-0 z-50 transition-opacity duration-200",
                open
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0",
            )}
        >
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <aside
                className={cx(
                    "absolute left-0 top-0 h-full w-72 bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-transform duration-200",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
            >
                {children}
            </aside>
        </div>
    );
}

// ─── Status label map ───────────────────────────────────────────────────────

export const STATUS_LABEL: Record<string, string> = {
    submitted: "Masuk",
    under_review: "Ditinjau",
    approved: "Disetujui",
    rejected: "Ditolak",
    takedown_requested: "Takedown",
    taken_down: "Diturunkan",
    archived: "Diarsip",
    // takedown statuses
    pending: "Menunggu",
    reviewing: "Ditinjau",
    resolved: "Selesai",
};

export const STATUS_COLOR: Record<string, BadgeColor> = {
    submitted: "amber",
    under_review: "blue",
    approved: "green",
    rejected: "gray",
    takedown_requested: "red",
    taken_down: "red",
    archived: "gray",
    pending: "amber",
    reviewing: "blue",
    resolved: "gray",
};

export function StatusBadge({ status }: { status: string }) {
    return (
        <Badge color={STATUS_COLOR[status] ?? "gray"}>
            {STATUS_LABEL[status] ?? status}
        </Badge>
    );
}
