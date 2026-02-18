import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';

const forgotPasswordMock = vi.fn();
const resetPasswordMock = vi.fn();

vi.mock('../../lib/api/auth', () => ({
    forgotPassword: (...args: unknown[]) => forgotPasswordMock(...args),
    resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
    cleanup();
});

test('forgot-password sends request and shows generic confirmation', async () => {
    forgotPasswordMock.mockResolvedValueOnce({ data: { accepted: true } });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));

    await waitFor(() => {
        expect(forgotPasswordMock).toHaveBeenCalledWith('user@example.com');
    });
    expect(
        screen.getByText('Si el correo es elegible, enviaremos instrucciones de recuperación.')
    ).toBeInTheDocument();
});

test('reset-password validates token from query string before submit', () => {
    window.history.replaceState({}, '', '/reset-password');
    render(<ResetPasswordPage />);

    expect(screen.getByText('Token inválido o faltante en el enlace.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar contraseña' })).toBeDisabled();
});

test('reset-password submits valid data and redirects to login', async () => {
    resetPasswordMock.mockResolvedValueOnce({ data: { reset: true } });
    window.history.replaceState({}, '', '/reset-password?token=abcdef123456');
    const onRedirect = vi.fn();

    render(<ResetPasswordPage onResetCompleteRedirect={onRedirect} />);

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));

    await waitFor(() => {
        expect(resetPasswordMock).toHaveBeenCalledWith('abcdef123456', 'secret123');
    });
    expect(screen.getByText('Contraseña actualizada. Redirigiendo a login...')).toBeInTheDocument();

    await waitFor(
        () => {
            expect(onRedirect).toHaveBeenCalledWith('/login');
        },
        { timeout: 2500 }
    );
});
