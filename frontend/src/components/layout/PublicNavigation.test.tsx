import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import PublicNavigation from './PublicNavigation';

const getProfileMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('../../lib/api/profile', () => ({
    getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

vi.mock('../../lib/session/session', () => ({
    logout: (...args: unknown[]) => logoutMock(...args),
}));

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
    cleanup();
});

test('shows guest actions when profile check fails with 401', async () => {
    getProfileMock.mockRejectedValueOnce({ status: 401, name: 'ApiError' });

    render(<PublicNavigation initialAuthenticated={false} />);

    await waitFor(() => {
        expect(getProfileMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Perfil' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
    expect(screen.queryByRole('link', { name: /panel admin/i })).toBeNull();
});

test('shows authenticated actions when profile check succeeds', async () => {
    getProfileMock.mockResolvedValueOnce({
        data: { user: { id: 1, email: 'user@example.com', role: 'customer' } },
    });

    render(<PublicNavigation initialAuthenticated={false} />);

    await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Perfil' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).toBeNull();
});

test('logout transitions nav back to guest actions', async () => {
    getProfileMock.mockResolvedValueOnce({
        data: { user: { id: 2, email: 'auth@example.com', role: 'customer' } },
    });
    logoutMock.mockResolvedValueOnce(undefined);

    const onRedirect = vi.fn();

    render(<PublicNavigation initialAuthenticated={true} onLoggedOutRedirect={onRedirect} />);

    const logoutButton = await screen.findByRole('button', { name: 'Cerrar sesión' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
        expect(logoutMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(onRedirect).toHaveBeenCalledWith('/');
});
