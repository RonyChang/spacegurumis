import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { ApiError } from '../../lib/api/client';
import OrdersPage from './OrdersPage';

const listOrdersMock = vi.fn();
const getOrderDetailMock = vi.fn();
const clearSessionMock = vi.fn();
const assignMock = vi.fn();

vi.mock('../../lib/api/orders', () => ({
    listOrders: (...args: unknown[]) => listOrdersMock(...args),
    getOrderDetail: (...args: unknown[]) => getOrderDetailMock(...args),
}));

vi.mock('../../lib/session/session', async () => {
    const actual = await vi.importActual<typeof import('../../lib/session/session')>('../../lib/session/session');
    return {
        ...actual,
        clearSession: (...args: unknown[]) => clearSessionMock(...args),
    };
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', {
        ...window.location,
        assign: assignMock,
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

test('after logout, protected orders request returning 401 clears session and redirects to /login', async () => {
    listOrdersMock.mockRejectedValueOnce(new ApiError('No autorizado', 401, null));

    render(<OrdersPage />);

    await waitFor(() => {
        expect(listOrdersMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
        expect(clearSessionMock).toHaveBeenCalledTimes(1);
    });
    expect(assignMock).toHaveBeenCalledWith('/login');
});
