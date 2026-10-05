import { ReactNode } from 'react';

interface Props {
    /** Main heading — base name or app name */
    title: string;
    /** Subtitle line below title */
    subtitle?: string;
    children: ReactNode;
    /** Show footer nav links */
    footer?: boolean;
}

/**
 * Shared shell for public-facing pages (Welcome + BasePage submit form).
 * Same canvas, logo, header, footer — only the children differ.
 */
export default function PublicShell({ title, subtitle, children, footer = true }: Props) {
    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col">
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-sm">

                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <img
                            src="/sapa-icon.svg"
                            alt="SAPA"
                            className="h-14 w-14"
                            draggable={false}
                        />
                    </div>

                    {/* Title block */}
                    <div className="text-center mb-8">
                        <h1 className="text-xl font-semibold text-[var(--color-ink)] leading-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-1.5 text-sm text-[var(--color-ink-subtle)]">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Page-specific content */}
                    {children}
                </div>
            </div>

            {footer && (
                <footer className="py-6 text-center text-xs text-[var(--color-ink-subtle)] space-x-4">
                    <a href="/takedown" className="hover:text-[var(--color-ink-muted)] transition-colors">Takedown</a>
                    <span aria-hidden>·</span>
                    <a href="/join" className="hover:text-[var(--color-ink-muted)] transition-colors">Gabung Base</a>
                    <span aria-hidden>·</span>
                    <a href="/admin" className="hover:text-[var(--color-ink-muted)] transition-colors">Admin</a>
                </footer>
            )}
        </div>
    );
}
