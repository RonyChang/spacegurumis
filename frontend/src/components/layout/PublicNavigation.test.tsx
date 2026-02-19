import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import PublicNavigation from './PublicNavigation';
import { ApiError } from '../../lib/api/client';

const getProfileMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('../../lib/api/profile', () => ({
    getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

vi.mock('../../lib/session/session', () => ({
    logout: (...args: unknown[]) => logoutMock(...args),
}));

function deferredPromise<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));
});

afterEach(() => {
    cleanup();
});

test('keeps authenticated actions visible from first paint without flashing guest links', async () => {
    const profileDeferred = deferredPromise<{ data: unknown }>();
    getProfileMock.mockReturnValueOnce(profileDeferred.promise);

    render(<PublicNavigation initialSession="authenticated" />);

    expect(screen.getByRole('link', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).toBeNull();

    profileDeferred.resolve({
        data: { user: { id: 1, email: 'user@example.com', role: 'customer' } },
    });
    await waitFor(() => {
        expect(getProfileMock).toHaveBeenCalledTimes(1);
    });
});

test('renders neutral state when initial session is unknown and settles after revalidation', async () => {
    const profileDeferred = deferredPromise<{ data: unknown }>();
    getProfileMock.mockReturnValueOnce(profileDeferred.promise);

    render(<PublicNavigation initialSession="unknown" />);

    expect(screen.getByRole('status')).toHaveTextContent('Verificando sesion...');
    expect(screen.queryByRole('link', { name: 'Login' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Perfil' })).toBeNull();

    profileDeferred.resolve({
        data: { user: { id: 2, email: 'user@example.com', role: 'customer' } },
    });

    await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Perfil' })).toBeInTheDocument();
    });
});

test('shows guest actions when profile revalidation returns unauthorized', async () => {
    getProfileMock.mockRejectedValueOnce(new ApiError('No autorizado', 401, null));

    render(<PublicNavigation initialSession="guest" />);

    await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Perfil' })).toBeNull();
    expect(screen.queryByRole('button', { name: /cerrar sesion/i })).toBeNull();
});

test('logout transitions nav back to guest actions and redirects to home', async () => {
    getProfileMock.mockResolvedValueOnce({
        data: { user: { id: 2, email: 'auth@example.com', role: 'customer' } },
    });
    logoutMock.mockResolvedValueOnce(undefined);

    const onRedirect = vi.fn();

    render(<PublicNavigation initialSession="authenticated" onLoggedOutRedirect={onRedirect} />);

    const logoutButton = await screen.findByRole('button', { name: 'Cerrar sesion' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
        expect(logoutMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(onRedirect).toHaveBeenCalledWith('/');
});

test('mobile menu toggle is accessible and closes on link click and escape', async () => {
    getProfileMock.mockRejectedValueOnce(new ApiError('No autorizado', 401, null));
    window.innerWidth = 390;
    window.dispatchEvent(new Event('resize'));

    render(<PublicNavigation initialSession="guest" />);

    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('link', { name: 'Tienda' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('mobile menu closes automatically when viewport returns to desktop width', async () => {
    getProfileMock.mockRejectedValueOnce(new ApiError('No autorizado', 401, null));
    window.innerWidth = 390;
    window.dispatchEvent(new Event('resize'));

    render(<PublicNavigation initialSession="guest" />);

    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
});
