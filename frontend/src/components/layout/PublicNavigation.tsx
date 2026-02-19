import React, { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '../../lib/api/client';
import { getProfile } from '../../lib/api/profile';
import { logout } from '../../lib/session/session';

type PublicNavigationProps = {
    initialSession?: SessionMode;
    onLoggedOutRedirect?: (path: string) => void;
};

type SessionMode = 'guest' | 'authenticated' | 'unknown';

const MOBILE_BREAKPOINT_PX = 900;

export default function PublicNavigation({
    initialSession = 'unknown',
    onLoggedOutRedirect,
}: PublicNavigationProps) {
    const [sessionMode, setSessionMode] = useState<SessionMode>(initialSession);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT_PX : false
    );
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const menuId = useId();
    const didManualLogoutRef = useRef(false);

    useEffect(() => {
        let active = true;

        getProfile()
            .then(() => {
                if (!active || didManualLogoutRef.current) {
                    return;
                }
                setSessionMode('authenticated');
            })
            .catch((error) => {
                if (!active || didManualLogoutRef.current) {
                    return;
                }

                if (error instanceof ApiError && error.status === 401) {
                    setSessionMode('guest');
                    return;
                }

                setSessionMode((current) => (current === 'authenticated' ? 'authenticated' : 'guest'));
            });

        return () => {
            active = false;
        };
    }, [initialSession]);

    useEffect(() => {
        function syncViewportMode() {
            const nextIsMobile = window.innerWidth <= MOBILE_BREAKPOINT_PX;
            setIsMobile(nextIsMobile);
            if (!nextIsMobile) {
                setMenuOpen(false);
            }
        }

        syncViewportMode();
        window.addEventListener('resize', syncViewportMode);

        return () => {
            window.removeEventListener('resize', syncViewportMode);
        };
    }, []);

    useEffect(() => {
        if (!menuOpen) {
            return () => {};
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    function closeMenu() {
        setMenuOpen(false);
    }

    async function handleLogout() {
        didManualLogoutRef.current = true;
        setIsLoggingOut(true);
        closeMenu();

        try {
            await logout();
        } finally {
            setSessionMode('guest');
            setIsLoggingOut(false);
            const redirect = onLoggedOutRedirect || ((path: string) => window.location.assign(path));
            redirect('/');
        }
    }

    function handleMenuInteraction(event: React.MouseEvent<HTMLElement>) {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const actionable = target.closest('a[href],button');
        if (!(actionable instanceof HTMLElement)) {
            return;
        }

        if (!isMobile) {
            return;
        }

        if (actionable.tagName.toLowerCase() === 'button') {
            const button = actionable as HTMLButtonElement;
            if (button.disabled) {
                return;
            }
        }

        closeMenu();
    }

    function renderSessionActions() {
        if (sessionMode === 'unknown') {
            return (
                <span className="nav__status" role="status" aria-live="polite">
                    Verificando sesion...
                </span>
            );
        }

        if (sessionMode === 'authenticated') {
            return (
                <>
                    <a className="nav__link" href="/profile" data-nav-prefetch>Perfil</a>
                    <button
                        className="nav__link nav__button"
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}
                    </button>
                </>
            );
        }

        return (
            <>
                <a className="nav__link" href="/login" data-nav-prefetch>Login</a>
                <a className="nav__link nav__link--cta" href="/register" data-nav-prefetch>Crear cuenta</a>
            </>
        );
    }

    return (
        <div className={`nav nav--public ${menuOpen ? 'nav--menu-open' : ''}`}>
            <button
                type="button"
                className="nav__toggle"
                aria-label="Abrir menu"
                aria-controls={menuId}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
            >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
            </button>

            <nav
                id={menuId}
                className={`nav__menu ${menuOpen ? 'nav__menu--open' : ''}`}
                aria-label="Navegacion principal"
                onClickCapture={handleMenuInteraction}
            >
                <a className="nav__link" href="/" data-nav-prefetch>Inicio</a>
                <a className="nav__link" href="/shop" data-nav-prefetch>Tienda</a>
                <a className="nav__link" href="/cart" data-nav-prefetch>Carrito</a>
                <a className="nav__link" href="/orders" data-nav-prefetch>Mis pedidos</a>
                {renderSessionActions()}
            </nav>
        </div>
    );
}
