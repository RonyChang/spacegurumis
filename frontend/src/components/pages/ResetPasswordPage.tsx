import React, { useEffect, useMemo, useState } from 'react';
import { resetPassword } from '../../lib/api/auth';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

function readTokenFromLocation() {
    if (typeof window === 'undefined') {
        return '';
    }

    const token = window.location.search
        ? new URLSearchParams(window.location.search).get('token')
        : '';
    return token ? token.trim() : '';
}

type ResetPasswordPageProps = {
    onResetCompleteRedirect?: (path: string) => void;
};

export default function ResetPasswordPage({ onResetCompleteRedirect }: ResetPasswordPageProps) {
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        setToken(readTokenFromLocation());
    }, []);

    const missingToken = useMemo(() => !token, [token]);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (missingToken) {
            setError('Token inválido');
            return;
        }

        if (!newPassword.trim() || newPassword.trim().length < 6) {
            setError('Contraseña mínima de 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setStatus('loading');
        setError('');
        try {
            await resetPassword(token, newPassword);
            setDone(true);
            window.setTimeout(() => {
                const redirect = onResetCompleteRedirect || ((path: string) => window.location.assign(path));
                redirect('/login');
            }, 1400);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
        } finally {
            setStatus('idle');
        }
    }

    return (
        <section className="surface page auth">
            <div className="page__header">
                <h1>Nueva contraseña</h1>
                <p className="muted">Establece una nueva contraseña para tu cuenta.</p>
            </div>

            {missingToken ? (
                <Alert tone="error">Token inválido o faltante en el enlace.</Alert>
            ) : null}
            {done ? <Alert tone="success">Contraseña actualizada. Redirigiendo a login...</Alert> : null}

            <form className="form" onSubmit={handleSubmit}>
                <TextField
                    label="Nueva contraseña"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={missingToken || done}
                />
                <TextField
                    label="Confirmar contraseña"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={missingToken || done}
                />

                {error ? <Alert tone="error">{error}</Alert> : null}

                <Button
                    type="submit"
                    variant="primary"
                    disabled={missingToken || done || status === 'loading'}
                >
                    {status === 'loading' ? 'Actualizando...' : 'Actualizar contraseña'}
                </Button>
            </form>

            <div className="auth__switch">
                <a className="button button--ghost" href="/login">
                    Volver a login
                </a>
            </div>
        </section>
    );
}
