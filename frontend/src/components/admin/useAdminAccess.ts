import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/api/client';
import { getProfile } from '../../lib/api/profile';

export type AdminAccessStatus = 'checking' | 'granted' | 'denied';

type AdminAccess = {
    status: AdminAccessStatus;
    message: string;
    redirectPath: string;
};

const INITIAL_ACCESS: AdminAccess = {
    status: 'checking',
    message: '',
    redirectPath: '',
};

export function useAdminAccess() {
    const [access, setAccess] = useState<AdminAccess>(INITIAL_ACCESS);

    useEffect(() => {
        let active = true;

        async function bootstrap() {
            setAccess(INITIAL_ACCESS);

            try {
                const profileRes = await getProfile();
                const user = profileRes && profileRes.data ? profileRes.data.user : null;

                if (!active) {
                    return;
                }

                if (!user) {
                    setAccess({
                        status: 'denied',
                        message: 'No tienes una sesion valida. Inicia sesion para continuar.',
                        redirectPath: '/login',
                    });
                    return;
                }

                if (String(user.role || '').toLowerCase() !== 'admin') {
                    setAccess({
                        status: 'denied',
                        message: 'Tu cuenta no tiene permisos de administrador.',
                        redirectPath: '/',
                    });
                    return;
                }

                setAccess({
                    status: 'granted',
                    message: '',
                    redirectPath: '',
                });
            } catch (error) {
                if (!active) {
                    return;
                }

                if (error instanceof ApiError && error.status === 401) {
                    setAccess({
                        status: 'denied',
                        message: 'Debes iniciar sesion como administrador para acceder.',
                        redirectPath: '/login',
                    });
                    return;
                }

                setAccess({
                    status: 'denied',
                    message: error instanceof Error ? error.message : 'No se pudo validar acceso.',
                    redirectPath: '/login',
                });
            }
        }

        bootstrap();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (access.status !== 'denied' || !access.redirectPath) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        window.location.assign(access.redirectPath);
    }, [access.status, access.redirectPath]);

    return access;
}
