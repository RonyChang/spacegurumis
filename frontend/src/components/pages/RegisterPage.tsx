import React, { useState } from 'react';
import { register } from '../../lib/api/auth';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { setFlash } from '../../lib/session/flash';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setStatus('loading');
        setError('');
        try {
            await register(email, password);
            setFlash('verifyMessage', 'Revisa tu correo y coloca el código de verificación.');
            const encoded = encodeURIComponent(email);
            window.location.assign(`/verify?email=${encoded}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo registrar el usuario.');
        } finally {
            setStatus('idle');
        }
    }

    return (
        <section className="surface page auth">
            <div className="page__header">
                <h1>Crear cuenta</h1>
                <p className="muted">Completa tu nombre luego desde el perfil.</p>
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
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error ? <Alert tone="error">{error}</Alert> : null}

                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Registrando...' : 'Crear cuenta'}
                </Button>
            </form>

            <div className="auth__switch">
                <span className="muted">¿Ya tienes cuenta?</span>
                <a className="button button--ghost" href="/login">
                    Iniciar sesión
                </a>
            </div>
        </section>
    );
}
