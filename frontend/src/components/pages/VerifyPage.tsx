import React, { useEffect, useState } from 'react';
import { resendVerification, verifyEmail } from '../../lib/api/auth';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { consumeFlash } from '../../lib/session/flash';
import { saveSession } from '../../lib/session/session';

export default function VerifyPage() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [resendStatus, setResendStatus] = useState<'idle' | 'loading'>('idle');
    const [resendMessage, setResendMessage] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qpEmail = params.get('email') || '';
        if (qpEmail) {
            setEmail(qpEmail);
        }

        const flashMessage = consumeFlash('verifyMessage');
        if (flashMessage) {
            setMessage(flashMessage);
        }
    }, []);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setStatus('loading');
        setError('');
        setMessage('');
        try {
            const res = await verifyEmail(email, code);
            await saveSession(res.data.token);
            setCode('');
            window.location.assign('/profile');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo verificar el email.');
        } finally {
            setStatus('idle');
        }
    }

    async function handleResend() {
        if (!email) {
            setResendMessage('Ingresa tu email primero.');
            return;
        }

        setResendStatus('loading');
        setResendMessage('');
        try {
            await resendVerification(email);
            setResendMessage('Código reenviado. Revisa tu correo.');
        } catch (err) {
            setResendMessage(err instanceof Error ? err.message : 'No se pudo reenviar el código.');
        } finally {
            setResendStatus('idle');
        }
    }

    return (
        <section className="surface page auth">
            <div className="page__header">
                <h1>Verificar email</h1>
                <p className="muted">Ingresa el código de 6 dígitos que enviamos a tu correo.</p>
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
                {message ? <Alert tone="info">{message}</Alert> : null}
                {resendMessage ? <Alert tone="info">{resendMessage}</Alert> : null}

                <div className="form__actions">
                    <Button type="submit" variant="primary" disabled={status === 'loading'}>
                        {status === 'loading' ? 'Verificando...' : 'Confirmar'}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleResend}
                        disabled={resendStatus === 'loading'}
                    >
                        {resendStatus === 'loading' ? 'Reenviando...' : 'Reenviar código'}
                    </Button>
                </div>
            </form>

            <div className="auth__switch">
                <span className="muted">¿Ya verificaste?</span>
                <a className="button button--ghost" href="/login">
                    Volver a login
                </a>
            </div>
        </section>
    );
}
