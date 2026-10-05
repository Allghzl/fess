import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import '../css/app.css';

createInertiaApp({
    title: (title) => title ? `${title} — Pinat Menfess` : 'Pinat Menfess',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')) as any,
    setup({ el, App, props }) {
        createRoot(el!).render(<App {...props} />);
    },
    progress: { color: '#F5DCE8' },
});
