import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import AdminPage from './AdminPage';

const getProfileMock = vi.fn();
const listAdminUsersMock = vi.fn();
const createAdminUserMock = vi.fn();
const listAdminCatalogCategoriesMock = vi.fn();
const createAdminCatalogCategoryMock = vi.fn();
const listAdminCatalogProductsMock = vi.fn();
const createAdminCatalogProductMock = vi.fn();
const updateAdminCatalogProductMock = vi.fn();
const createAdminCatalogVariantMock = vi.fn();
const updateAdminCatalogVariantMock = vi.fn();
const updateAdminCatalogVariantStockMock = vi.fn();
const deleteAdminCatalogCategoryMock = vi.fn();
const deleteAdminCatalogProductMock = vi.fn();
const deleteAdminCatalogVariantMock = vi.fn();
const listVariantImagesMock = vi.fn();
const presignVariantImageMock = vi.fn();
const registerVariantImageMock = vi.fn();
const updateVariantImageMock = vi.fn();
const deleteVariantImageMock = vi.fn();
const listAdminDiscountsMock = vi.fn();
const createAdminDiscountMock = vi.fn();

vi.mock('../../lib/api/profile', () => ({
    getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

vi.mock('../../lib/api/admin', () => ({
    listAdminUsers: (...args: unknown[]) => listAdminUsersMock(...args),
    createAdminUser: (...args: unknown[]) => createAdminUserMock(...args),
    listAdminCatalogCategories: (...args: unknown[]) => listAdminCatalogCategoriesMock(...args),
    createAdminCatalogCategory: (...args: unknown[]) => createAdminCatalogCategoryMock(...args),
    listAdminCatalogProducts: (...args: unknown[]) => listAdminCatalogProductsMock(...args),
    createAdminCatalogProduct: (...args: unknown[]) => createAdminCatalogProductMock(...args),
    updateAdminCatalogProduct: (...args: unknown[]) => updateAdminCatalogProductMock(...args),
    createAdminCatalogVariant: (...args: unknown[]) => createAdminCatalogVariantMock(...args),
    updateAdminCatalogVariant: (...args: unknown[]) => updateAdminCatalogVariantMock(...args),
    updateAdminCatalogVariantStock: (...args: unknown[]) => updateAdminCatalogVariantStockMock(...args),
    deleteAdminCatalogCategory: (...args: unknown[]) => deleteAdminCatalogCategoryMock(...args),
    deleteAdminCatalogProduct: (...args: unknown[]) => deleteAdminCatalogProductMock(...args),
    deleteAdminCatalogVariant: (...args: unknown[]) => deleteAdminCatalogVariantMock(...args),
    listVariantImages: (...args: unknown[]) => listVariantImagesMock(...args),
    presignVariantImage: (...args: unknown[]) => presignVariantImageMock(...args),
    registerVariantImage: (...args: unknown[]) => registerVariantImageMock(...args),
    updateVariantImage: (...args: unknown[]) => updateVariantImageMock(...args),
    deleteVariantImage: (...args: unknown[]) => deleteVariantImageMock(...args),
    listAdminDiscounts: (...args: unknown[]) => listAdminDiscountsMock(...args),
    createAdminDiscount: (...args: unknown[]) => createAdminDiscountMock(...args),
}));

function makeAdminPayload() {
    return {
        data: {
            user: {
                id: 1,
                email: 'admin@spacegurumis.lat',
                firstName: 'Admin',
                lastName: 'Owner',
                role: 'admin',
            },
        },
        message: 'OK',
        errors: [],
        meta: {},
    };
}

function makeProducts() {
    return [
        {
            id: 101,
            name: 'Peluche',
            slug: 'peluche-a',
            description: 'Desc A',
            isActive: true,
            category: { id: 10, name: 'Categoria A', slug: 'cat-a', isActive: true },
            variants: [
                {
                    id: 300,
                    sku: 'SKU-A',
                    variantName: 'Rojo',
                    price: 49.9,
                    weightGrams: null,
                    sizeLabel: null,
                    stock: 8,
                    reserved: 0,
                },
            ],
        },
        {
            id: 102,
            name: 'Peluche',
            slug: 'peluche-b',
            description: 'Desc B',
            isActive: true,
            category: { id: 10, name: 'Categoria A', slug: 'cat-a', isActive: true },
            variants: [
                {
                    id: 301,
                    sku: 'SKU-B',
                    variantName: 'Azul',
                    price: 59.9,
                    weightGrams: null,
                    sizeLabel: null,
                    stock: 5,
                    reserved: 0,
                },
            ],
        },
    ];
}

function mockAdminBootstrap() {
    getProfileMock.mockResolvedValue(makeAdminPayload());
    listAdminUsersMock.mockResolvedValue({
        data: [
            {
                id: 1,
                email: 'admin@spacegurumis.lat',
                firstName: 'Admin',
                lastName: 'Owner',
                role: 'admin',
                isActive: true,
                emailVerifiedAt: null,
                createdAt: null,
                updatedAt: null,
            },
        ],
        message: 'OK',
        errors: [],
        meta: {},
    });
    listAdminCatalogCategoriesMock.mockResolvedValue({
        data: [{ id: 10, name: 'Categoria A', slug: 'cat-a', isActive: true }],
        message: 'OK',
        errors: [],
        meta: {},
    });
    listAdminCatalogProductsMock.mockResolvedValue({
        data: makeProducts(),
        message: 'OK',
        errors: [],
        meta: {},
    });
    listVariantImagesMock.mockResolvedValue({ data: [], message: 'OK', errors: [], meta: {} });
    listAdminDiscountsMock.mockResolvedValue({
        data: [
            {
                id: 1,
                code: 'WELCOME10',
                percentage: 10,
                isActive: true,
                startsAt: null,
                expiresAt: null,
                maxUses: 100,
                usedCount: 5,
                minSubtotal: 25,
            },
        ],
        message: 'OK',
        errors: [],
        meta: {},
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    mockAdminBootstrap();

    createAdminUserMock.mockResolvedValue({
        data: {
            action: 'created',
            user: {
                id: 2,
                email: 'new-admin@spacegurumis.lat',
                firstName: 'New',
                lastName: 'Admin',
                role: 'admin',
            },
        },
        message: 'Creado',
        errors: [],
        meta: {},
    });
    createAdminCatalogCategoryMock.mockResolvedValue({
        data: { id: 55, name: 'Nueva categoria', slug: 'nueva-categoria', isActive: true },
        message: 'Creado',
        errors: [],
        meta: {},
    });
    createAdminCatalogProductMock.mockResolvedValue({
        data: {
            product: { id: 120, name: 'Nuevo', slug: 'nuevo' },
            variant: { id: 121, sku: 'SKU-NEW' },
            inventory: { id: 122, stock: 4 },
        },
        message: 'Creado',
        errors: [],
        meta: {},
    });
    createAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'Creado', errors: [], meta: {} });

    updateAdminCatalogProductMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogVariantStockMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteAdminCatalogCategoryMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteAdminCatalogProductMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    presignVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    registerVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteVariantImageMock.mockResolvedValue({ data: { deleted: true }, message: 'OK', errors: [], meta: {} });
    createAdminDiscountMock.mockResolvedValue({
        data: {
            id: 2,
            code: 'PROMO15',
            percentage: 15,
            isActive: true,
            startsAt: null,
            expiresAt: null,
            maxUses: null,
            usedCount: 0,
            minSubtotal: null,
        },
        message: 'Creado',
        errors: [],
        meta: {},
    });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('redirects non-admin users away from admin console', async () => {
    getProfileMock.mockReset();
    getProfileMock.mockResolvedValueOnce({
        data: {
            user: {
                id: 8,
                email: 'customer@spacegurumis.lat',
                firstName: 'Customer',
                lastName: 'User',
                role: 'customer',
            },
        },
        message: 'OK',
        errors: [],
        meta: {},
    });
    render(<AdminPage />);

    await screen.findByText('Tu cuenta no tiene permisos de administrador.');
    await screen.findByText('Redirigiendo...');
    expect(screen.queryByRole('heading', { name: 'Consola admin' })).toBeNull();
});

test('supports create flow mode switching and product selector disambiguation with slug', async () => {
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });

    fireEvent.change(screen.getByLabelText('Modo producto'), { target: { value: 'existing' } });
    fireEvent.change(screen.getByLabelText('Categoria (creacion)'), { target: { value: '10' } });

    const productSelect = screen.getByLabelText('Producto existente (creacion)');
    const optionTexts = Array.from((productSelect as HTMLSelectElement).options).map((item) => item.textContent || '');
    expect(optionTexts).toContain('Peluche (peluche-a)');
    expect(optionTexts).toContain('Peluche (peluche-b)');

    fireEvent.change(productSelect, { target: { value: '102' } });
    fireEvent.change(screen.getByLabelText('SKU variante'), { target: { value: 'SKU-NEW' } });
    fireEvent.change(screen.getByLabelText('Precio variante'), { target: { value: '39.9' } });
    fireEvent.change(screen.getByLabelText('Stock inicial variante'), { target: { value: '6' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear variante en producto existente' }));

    await waitFor(() => {
        expect(createAdminCatalogVariantMock).toHaveBeenCalledWith(
            102,
            expect.objectContaining({
                sku: 'SKU-NEW',
                price: 39.9,
                initialStock: 6,
            })
        );
    });
});

test('supports create flow for new category + new product + initial variant', async () => {
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });

    fireEvent.change(screen.getByLabelText('Modo categoria'), { target: { value: 'create' } });
    fireEvent.change(screen.getByLabelText('Nombre categoria'), { target: { value: 'Nueva categoria' } });
    fireEvent.change(screen.getByLabelText('Slug categoria'), { target: { value: 'nueva-categoria' } });

    fireEvent.change(screen.getByLabelText('Nombre producto'), { target: { value: 'Producto nuevo' } });
    fireEvent.change(screen.getByLabelText('Slug producto'), { target: { value: 'producto-nuevo' } });

    fireEvent.change(screen.getByLabelText('SKU variante'), { target: { value: 'SKU-CREATE' } });
    fireEvent.change(screen.getByLabelText('Precio variante'), { target: { value: '69.9' } });
    fireEvent.change(screen.getByLabelText('Stock inicial variante'), { target: { value: '9' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear producto + variante' }));

    await waitFor(() => {
        expect(createAdminCatalogCategoryMock).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Nueva categoria',
                slug: 'nueva-categoria',
            })
        );
    });
    await waitFor(() => {
        expect(createAdminCatalogProductMock).toHaveBeenCalledWith(
            expect.objectContaining({
                categoryId: 55,
                name: 'Producto nuevo',
                slug: 'producto-nuevo',
                sku: 'SKU-CREATE',
                initialStock: 9,
            })
        );
    });
});

test('supports destructive actions by selected scope', async () => {
    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmMock);

    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar por alcance' }));
    await waitFor(() => {
        expect(deleteAdminCatalogVariantMock).toHaveBeenCalledWith(300);
    });

    fireEvent.change(screen.getByLabelText('Variante (edicion)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar por alcance' }));
    await waitFor(() => {
        expect(deleteAdminCatalogProductMock).toHaveBeenCalledWith(101);
    });

    fireEvent.change(screen.getByLabelText('Producto (edicion)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar por alcance' }));
    await waitFor(() => {
        expect(deleteAdminCatalogCategoryMock).toHaveBeenCalledWith(10);
    });
});

test('supports discount list and creation from admin section', async () => {
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });

    await screen.findByText('WELCOME10');
    fireEvent.change(screen.getByLabelText('Codigo descuento'), { target: { value: 'promo15' } });
    fireEvent.change(screen.getByLabelText('Porcentaje descuento'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Min subtotal'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Max usos'), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear descuento' }));

    await waitFor(() => {
        expect(createAdminDiscountMock).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'promo15',
                percentage: 15,
                minSubtotal: 50,
                maxUses: 100,
            })
        );
    });
});

test('shows actionable validation error when discount payload is invalid', async () => {
    createAdminDiscountMock.mockRejectedValueOnce(new Error('Rango de fechas invalido: startsAt debe ser menor que expiresAt'));

    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });

    fireEvent.change(screen.getByLabelText('Codigo descuento'), { target: { value: 'promo15' } });
    fireEvent.change(screen.getByLabelText('Porcentaje descuento'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '2026-03-10T10:00' } });
    fireEvent.change(screen.getByLabelText('Expira'), { target: { value: '2026-03-09T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear descuento' }));

    await waitFor(() => {
        expect(createAdminDiscountMock).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'promo15',
                percentage: 15,
                startsAt: '2026-03-10T10:00',
                expiresAt: '2026-03-09T10:00',
            })
        );
    });
    await screen.findByText('Rango de fechas invalido: startsAt debe ser menor que expiresAt');
});
