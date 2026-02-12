import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import AdminHubPage from './AdminHubPage';
import AdminUsersModulePage from './AdminUsersModulePage';

const getProfileMock = vi.fn();
const listAdminUsersMock = vi.fn();

vi.mock('../../../lib/api/profile', () => ({
    getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

vi.mock('../../../lib/api/admin', () => ({
    listAdminUsers: (...args: unknown[]) => listAdminUsersMock(...args),
    createAdminUser: vi.fn(),
    removeAdminUser: vi.fn(),
}));

beforeEach(() => {
    vi.resetAllMocks();
    getProfileMock.mockResolvedValue({
        data: {
            user: {
                id: 1,
                email: 'admin@spacegurumis.lat',
                role: 'admin',
            },
        },
        message: 'OK',
        errors: [],
        meta: {},
    });

    listAdminUsersMock.mockResolvedValue({
        data: [],
        message: 'OK',
        errors: [],
        meta: {},
    });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('renders admin hub with links to modular routes', async () => {
    render(<AdminHubPage />);

    await screen.findByRole('heading', { name: 'Panel de administracion' });
    expect(screen.getByRole('link', { name: 'Usuarios admin' })).toHaveAttribute('href', '/admin/usuarios-admin');
    expect(screen.getByRole('link', { name: 'Catalogo' })).toHaveAttribute('href', '/admin/catalogo');
    expect(screen.getByRole('link', { name: 'Imagenes' })).toHaveAttribute('href', '/admin/imagenes');
    expect(screen.getByRole('link', { name: 'Descuentos' })).toHaveAttribute('href', '/admin/descuentos');
});

test('blocks non-admin direct access to module route', async () => {
    getProfileMock.mockResolvedValueOnce({
        data: {
            user: {
                id: 8,
                email: 'customer@spacegurumis.lat',
                role: 'customer',
            },
        },
        message: 'OK',
        errors: [],
        meta: {},
    });

    render(<AdminUsersModulePage />);

    await screen.findByText('Tu cuenta no tiene permisos de administrador.');
    expect(screen.queryByRole('heading', { name: 'Usuarios admin' })).toBeNull();
});
