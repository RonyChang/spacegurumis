import React, { useEffect, useState } from 'react';
import { verifyAdminTwoFactor } from '../../lib/api/auth';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { consumeFlash } from '../../lib/session/flash';
import { afterLogin } from '../../lib/session/session';

export default function AdminTwoFactorPage() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qpEmail = params.get('email') || '';
        if (qpEmail) {
            setEmail(qpEmail);
        }

        const flashMessage = consumeFlash('twoFactorMessage');
        if (flashMessage) {
            setMessage(flashMessage);
        } else {
            setMessage('Ingresa el código 2FA enviado a tu correo.');
        }
    }, []);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setStatus('loading');
        setError('');
        try {
            await verifyAdminTwoFactor(email, code);
            await afterLogin();
            setCode('');
            window.location.assign('/profile');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo validar el código.');
        } finally {
            setStatus('idle');
        }
    }

    return (
        <section className="surface page auth">
            <div className="page__header">
                <h1>Verificación admin</h1>
                <p className="muted">{message}</p>
            </div>

            <form className="form" onSubmit={handleSubmit}>
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    label="Código"
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />

                {error ? <Alert tone="error">{error}</Alert> : null}

                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Validando...' : 'Confirmar'}
                </Button>
            </form>

            <div className="auth__switch">
                <span className="muted">¿No recibiste el código?</span>
                <a className="button button--ghost" href="/login">
                    Volver a login
                </a>
            </div>
        </section>
    );
}
