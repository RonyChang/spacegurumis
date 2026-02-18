import React, { useEffect, useState } from 'react';
import { ApiError } from '../../lib/api/client';
import { getProfile } from '../../lib/api/profile';
import { logout } from '../../lib/session/session';

type PublicNavigationProps = {
    initialAuthenticated?: boolean;
    onLoggedOutRedirect?: (path: string) => void;
};

type SessionMode = 'guest' | 'authenticated';

export default function PublicNavigation({
    initialAuthenticated = false,
    onLoggedOutRedirect,
}: PublicNavigationProps) {
    const [sessionMode, setSessionMode] = useState<SessionMode>(
        initialAuthenticated ? 'authenticated' : 'guest'
    );
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        let active = true;
        getProfile()
            .then(() => {
                if (!active) {
                    return;
                }
                setSessionMode('authenticated');
            })
            .catch((error) => {
                if (!active) {
                    return;
                }

                if (error instanceof ApiError && error.status === 401) {
                    setSessionMode('guest');
                    return;
                }

                setSessionMode('guest');
            });

        return () => {
            active = false;
        };
    }, []);

    async function handleLogout() {
        setIsLoggingOut(true);
        await logout();
        setSessionMode('guest');
        setIsLoggingOut(false);
        const redirect = onLoggedOutRedirect || ((path: string) => window.location.assign(path));
        redirect('/');
    }

    return (
        <nav className="nav" aria-label="Navegacion principal">
            <a className="nav__link" href="/" data-nav-prefetch>Inicio</a>
            <a className="nav__link" href="/shop" data-nav-prefetch>Tienda</a>
            <a className="nav__link" href="/cart" data-nav-prefetch>Carrito</a>
            <a className="nav__link" href="/orders" data-nav-prefetch>Mis pedidos</a>

            {sessionMode === 'authenticated' ? (
                <>
                    <a className="nav__link" href="/profile" data-nav-prefetch>Perfil</a>
                    <button
                        className="nav__link nav__button"
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                    </button>
                </>
            ) : (
                <>
                    <a className="nav__link" href="/login" data-nav-prefetch>Login</a>
                    <a className="nav__link nav__link--cta" href="/register" data-nav-prefetch>Crear cuenta</a>
                </>
            )}
        </nav>
    );
}
