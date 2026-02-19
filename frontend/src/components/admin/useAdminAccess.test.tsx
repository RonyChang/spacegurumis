import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { ApiError } from '../../lib/api/client';
import { useAdminAccess } from './useAdminAccess';

const getProfileMock = vi.fn();

vi.mock('../../lib/api/profile', () => ({
    getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

function AccessProbe() {
    const access = useAdminAccess();
    return (
        <div>
            <p data-testid="status">{access.status}</p>
            <p data-testid="redirect">{access.redirectPath}</p>
        </div>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

test('denies direct admin access for unauthenticated users', async () => {
    getProfileMock.mockRejectedValueOnce(new ApiError('No autorizado', 401, null));

    render(<AccessProbe />);

    await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('denied');
    });
    expect(screen.getByTestId('redirect').textContent).toBe('/login');
});

test('denies direct admin access for authenticated non-admin users', async () => {
    getProfileMock.mockResolvedValueOnce({
        data: { user: { id: 1, email: 'customer@example.com', role: 'customer' } },
    });

    render(<AccessProbe />);

    await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('denied');
    });
    expect(screen.getByTestId('redirect').textContent).toBe('/');
});

test('grants direct admin access only for admin role users', async () => {
    getProfileMock.mockResolvedValueOnce({
        data: { user: { id: 99, email: 'admin@example.com', role: 'admin' } },
    });

    render(<AccessProbe />);

    await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('granted');
    });
    expect(screen.getByTestId('redirect').textContent).toBe('');
});
