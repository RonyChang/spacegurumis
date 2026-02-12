import React, { useEffect, useState } from 'react';

type AdminShellProps = {
    title: string;
    description: string;
    children: React.ReactNode;
};

const LINKS = [
    { href: '/admin', label: 'Inicio admin' },
    { href: '/admin/usuarios-admin', label: 'Usuarios admin' },
    { href: '/admin/catalogo', label: 'Catalogo' },
    { href: '/admin/imagenes', label: 'Imagenes' },
    { href: '/admin/descuentos', label: 'Descuentos' },
];

export default function AdminShell({ title, description, children }: AdminShellProps) {
    const [pathname, setPathname] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        setPathname(window.location.pathname);
    }, []);

    return (
        <section className="surface page admin-shell">
            <div className="page__header">
                <h1>{title}</h1>
                <p className="muted">{description}</p>
            </div>

            <nav className="admin-shell__nav" aria-label="Modulos de administracion">
                {LINKS.map((link) => {
                    const isActive = pathname === link.href;
                    const classes = ['button', isActive ? 'button--primary' : 'button--ghost'].join(' ');
                    return (
                        <a key={link.href} className={classes} href={link.href}>
                            {link.label}
                        </a>
                    );
                })}
            </nav>

            <div className="admin-shell__content">{children}</div>
        </section>
    );
}
