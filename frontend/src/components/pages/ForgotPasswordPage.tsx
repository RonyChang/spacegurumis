import React, { useState } from 'react';
import { forgotPassword } from '../../lib/api/auth';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setStatus('loading');
        setError('');
        try {
            await forgotPassword(email);
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
        } finally {
            setStatus('idle');
        }
    }

    return (
        <section className="surface page auth">
            <div className="page__header">
                <h1>Recuperar contraseña</h1>
                <p className="muted">Ingresa tu correo y te enviaremos instrucciones si tu cuenta es elegible.</p>
            </div>

            {submitted ? (
                <Alert tone="success">
                    Si el correo es elegible, enviaremos instrucciones de recuperación.
                </Alert>
            ) : null}

            <form className="form" onSubmit={handleSubmit}>
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                {error ? <Alert tone="error">{error}</Alert> : null}

                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Enviando...' : 'Enviar instrucciones'}
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
