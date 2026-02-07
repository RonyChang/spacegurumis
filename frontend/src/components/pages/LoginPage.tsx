import React, { useEffect, useState } from 'react';
import { login } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { getAuthToken } from '../../lib/session/authToken';
import { setFlash } from '../../lib/session/flash';
import { saveSession } from '../../lib/session/session';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { buildGoogleStartUrl } from '../../lib/api/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            window.location.assign('/profile');
        }
    }, []);

    useEffect(() => {
        if (!window.location.hash) {
            return;
        }

        const hashValue = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash;
        const params = new URLSearchParams(hashValue);
        const token = params.get('token');
        const errorParam = params.get('error');

        if (token) {
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
            saveSession(token)
                .then(() => window.location.assign('/profile'))
                .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.'));
            return;
        }

        if (errorParam) {
            setError(errorParam);
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
        }
    }, []);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setStatus('loading');
        setError('');
        try {
            const res = await login(email, password);
            const data = res.data;

            if (data && 'twoFactorRequired' in data && data.twoFactorRequired) {
                setFlash('twoFactorMessage', 'Ingresa el código enviado a tu correo.');
                const encoded = encodeURIComponent(data.email || email);
                window.location.assign(`/admin-2fa?email=${encoded}`);
                return;
            }

            await saveSession(data.token);
            setPassword('');
            window.location.assign('/profile');
        } catch (err) {
            if (err instanceof ApiError && err.status === 403) {
                setFlash('verifyMessage', err.message || 'Email no verificado');
                const encoded = encodeURIComponent(email);
                window.location.assign(`/verify?email=${encoded}`);
                return;
            }

            setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
        } finally {
            setStatus('idle');
        }
    }

    function handleGoogleLogin() {
        window.location.assign(buildGoogleStartUrl());
    }

    return (
        <section className="surface page auth">
            <div className="page__header">
                <h1>Iniciar sesión</h1>
                <p className="muted">Ingresa con tu email o continúa con Google.</p>
            </div>

            <div className="auth__actions">
                <button className="button button--dark" type="button" onClick={handleGoogleLogin}>
                    Continuar con Google
                </button>
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
                    label="Contraseña"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error ? <Alert tone="error">{error}</Alert> : null}

                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Ingresando...' : 'Ingresar'}
                </Button>
            </form>

            <div className="auth__switch">
                <span className="muted">¿No tienes cuenta?</span>
                <a className="button button--ghost" href="/register">
                    Crear cuenta
                </a>
            </div>
        </section>
    );
}
