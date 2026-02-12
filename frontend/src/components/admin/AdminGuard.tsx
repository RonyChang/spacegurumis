import React from 'react';
import Alert from '../ui/Alert';
import { useAdminAccess } from './useAdminAccess';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const access = useAdminAccess();

    if (access.status === 'checking') {
        return (
            <section className="surface page">
                <h1>Admin</h1>
                <p className="status">Validando acceso...</p>
            </section>
        );
    }

    if (access.status === 'denied') {
        return (
            <section className="surface page">
                <h1>Admin</h1>
                <Alert tone="error">{access.message || 'Acceso denegado'}</Alert>
                <p className="status">Redirigiendo...</p>
            </section>
        );
    }

    return <>{children}</>;
}
