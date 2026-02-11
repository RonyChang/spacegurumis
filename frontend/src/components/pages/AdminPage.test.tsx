import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import AdminPage from './AdminPage';

const getProfileMock = vi.fn();
const listAdminUsersMock = vi.fn();
const createAdminUserMock = vi.fn();
const listAdminCatalogCategoriesMock = vi.fn();
const listAdminCatalogProductsMock = vi.fn();
const createAdminCatalogProductMock = vi.fn();
const updateAdminCatalogProductMock = vi.fn();
const createAdminCatalogVariantMock = vi.fn();
const updateAdminCatalogVariantMock = vi.fn();
const updateAdminCatalogVariantStockMock = vi.fn();
const listVariantImagesMock = vi.fn();
const presignVariantImageMock = vi.fn();
const registerVariantImageMock = vi.fn();
const updateVariantImageMock = vi.fn();
const deleteVariantImageMock = vi.fn();

vi.mock('../../lib/api/profile', () => ({
    getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

vi.mock('../../lib/api/admin', () => ({
    listAdminUsers: (...args: unknown[]) => listAdminUsersMock(...args),
    createAdminUser: (...args: unknown[]) => createAdminUserMock(...args),
    listAdminCatalogCategories: (...args: unknown[]) => listAdminCatalogCategoriesMock(...args),
    listAdminCatalogProducts: (...args: unknown[]) => listAdminCatalogProductsMock(...args),
    createAdminCatalogProduct: (...args: unknown[]) => createAdminCatalogProductMock(...args),
    updateAdminCatalogProduct: (...args: unknown[]) => updateAdminCatalogProductMock(...args),
    createAdminCatalogVariant: (...args: unknown[]) => createAdminCatalogVariantMock(...args),
    updateAdminCatalogVariant: (...args: unknown[]) => updateAdminCatalogVariantMock(...args),
    updateAdminCatalogVariantStock: (...args: unknown[]) => updateAdminCatalogVariantStockMock(...args),
    listVariantImages: (...args: unknown[]) => listVariantImagesMock(...args),
    presignVariantImage: (...args: unknown[]) => presignVariantImageMock(...args),
    registerVariantImage: (...args: unknown[]) => registerVariantImageMock(...args),
    updateVariantImage: (...args: unknown[]) => updateVariantImageMock(...args),
    deleteVariantImage: (...args: unknown[]) => deleteVariantImageMock(...args),
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

function mockAdminBootstrap() {
    getProfileMock.mockResolvedValueOnce(makeAdminPayload());
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
        data: [{ id: 10, name: 'Peluche', slug: 'peluche', isActive: true }],
        message: 'OK',
        errors: [],
        meta: {},
    });
    listAdminCatalogProductsMock.mockResolvedValue({
        data: [
            {
                id: 99,
                name: 'Amigurumi',
                slug: 'amigurumi',
                description: 'Desc',
                isActive: true,
                category: { id: 10, name: 'Peluche', slug: 'peluche', isActive: true },
                variants: [
                    {
                        id: 300,
                        sku: 'SKU-RED',
                        variantName: 'Rojo',
                        price: 49.9,
                        weightGrams: null,
                        sizeLabel: null,
                        stock: 8,
                        reserved: 0,
                    },
                ],
            },
        ],
        message: 'OK',
        errors: [],
        meta: {},
    });
    listVariantImagesMock.mockResolvedValue({ data: [], message: 'OK', errors: [], meta: {} });
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

    updateAdminCatalogProductMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    createAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogVariantStockMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    presignVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    registerVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteVariantImageMock.mockResolvedValue({ data: { deleted: true }, message: 'OK', errors: [], meta: {} });
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

test('admin can create another admin from console', async () => {
    render(<AdminPage />);

    await screen.findByRole('heading', { name: 'Consola admin' });
    const usersCardHeading = screen.getByRole('heading', { name: 'Usuarios admin' });
    const usersCard = usersCardHeading.closest('section');
    expect(usersCard).toBeTruthy();
    const usersScope = within(usersCard as HTMLElement);

    fireEvent.change(usersScope.getByLabelText('Email'), { target: { value: 'new-admin@spacegurumis.lat' } });
    fireEvent.change(usersScope.getByLabelText('Password (si es usuario nuevo)'), { target: { value: 'Secret1234' } });
    fireEvent.change(usersScope.getByLabelText('Nombre'), { target: { value: 'New' } });
    fireEvent.change(usersScope.getByLabelText('Apellido'), { target: { value: 'Admin' } });

    fireEvent.click(usersScope.getByRole('button', { name: 'Crear / promover admin' }));

    await waitFor(() => {
        expect(createAdminUserMock).toHaveBeenCalledWith({
            email: 'new-admin@spacegurumis.lat',
            password: 'Secret1234',
            firstName: 'New',
            lastName: 'Admin',
        });
    });
});

test('admin can create product with initial variant data from console', async () => {
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });
    const createProductHeading = screen.getByRole('heading', { name: 'Crear producto' });
    const createProductCard = createProductHeading.closest('section');
    expect(createProductCard).toBeTruthy();
    const productScope = within(createProductCard as HTMLElement);

    fireEvent.change(productScope.getByLabelText('Nombre de producto'), { target: { value: 'Nuevo peluche' } });
    fireEvent.change(productScope.getByLabelText('Slug'), { target: { value: 'nuevo-peluche' } });
    fireEvent.change(productScope.getByLabelText('Descripcion'), { target: { value: 'Descripcion nueva' } });
    fireEvent.change(productScope.getByLabelText('SKU'), { target: { value: 'SKU-NEW' } });
    fireEvent.change(productScope.getByLabelText('Precio'), { target: { value: '69.9' } });
    fireEvent.change(productScope.getByLabelText('Stock inicial'), { target: { value: '4' } });

    fireEvent.click(productScope.getByRole('button', { name: 'Crear producto + variante' }));

    await waitFor(() => {
        expect(createAdminCatalogProductMock).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Nuevo peluche',
                slug: 'nuevo-peluche',
                sku: 'SKU-NEW',
                price: 69.9,
                initialStock: 4,
            })
        );
    });
});

test('admin can update selected variant metadata and stock from console', async () => {
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });

    const variantsHeading = screen.getByRole('heading', { name: 'Variantes e imagenes' });
    const variantsCard = variantsHeading.closest('section');
    expect(variantsCard).toBeTruthy();
    const variantsScope = within(variantsCard as HTMLElement);

    const editVariantTitle = variantsScope.getByText('Editar variante seleccionada');
    const editVariantForm = editVariantTitle.closest('form');
    expect(editVariantForm).toBeTruthy();
    const editVariantScope = within(editVariantForm as HTMLElement);

    fireEvent.change(editVariantScope.getByLabelText('SKU'), { target: { value: 'SKU-RED-2' } });
    fireEvent.change(editVariantScope.getByLabelText('Nombre variante'), { target: { value: 'Rojo intenso' } });
    fireEvent.change(editVariantScope.getByLabelText('Precio'), { target: { value: '59.9' } });
    fireEvent.change(editVariantScope.getByLabelText('Stock'), { target: { value: '12' } });

    fireEvent.click(editVariantScope.getByRole('button', { name: 'Guardar variante' }));

    await waitFor(() => {
        expect(updateAdminCatalogVariantMock).toHaveBeenCalledWith(
            300,
            expect.objectContaining({
                sku: 'SKU-RED-2',
                variantName: 'Rojo intenso',
                price: 59.9,
            })
        );
    });
    await waitFor(() => {
        expect(updateAdminCatalogVariantStockMock).toHaveBeenCalledWith(300, 12);
    });
});

test('admin can upload, update, and delete variant images from console', async () => {
    listVariantImagesMock.mockResolvedValue({
        data: [
            {
                id: 900,
                productVariantId: 300,
                imageKey: 'variants/300/hero.webp',
                publicUrl: 'https://assets.spacegurumis.lat/variants/300/hero.webp',
                contentType: 'image/webp',
                byteSize: 1024,
                altText: 'Hero',
                sortOrder: 0,
            },
        ],
        message: 'OK',
        errors: [],
        meta: {},
    });
    presignVariantImageMock.mockResolvedValue({
        data: {
            uploadUrl: 'https://uploads.spacegurumis.lat/signed',
            imageKey: 'variants/300/new.webp',
            expiresIn: 120,
        },
        message: 'OK',
        errors: [],
        meta: {},
    });
    registerVariantImageMock.mockResolvedValue({
        data: {
            id: 901,
            productVariantId: 300,
            imageKey: 'variants/300/new.webp',
            publicUrl: 'https://assets.spacegurumis.lat/variants/300/new.webp',
            contentType: 'image/webp',
            byteSize: 3,
            altText: 'Nueva imagen',
            sortOrder: 2,
        },
        message: 'OK',
        errors: [],
        meta: {},
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'Consola admin' });

    const variantsHeading = screen.getByRole('heading', { name: 'Variantes e imagenes' });
    const variantsCard = variantsHeading.closest('section');
    expect(variantsCard).toBeTruthy();
    const variantsScope = within(variantsCard as HTMLElement);

    const uploadTitle = variantsScope.getByText('Subir imagen para variante');
    const uploadForm = uploadTitle.closest('form');
    expect(uploadForm).toBeTruthy();
    const uploadScope = within(uploadForm as HTMLElement);

    const file = new File(['img'], 'new.webp', { type: 'image/webp' });
    fireEvent.change(uploadScope.getByLabelText('Archivo'), { target: { files: [file] } });
    fireEvent.change(uploadScope.getByLabelText('Alt text'), { target: { value: 'Nueva imagen' } });
    fireEvent.change(uploadScope.getByLabelText('Orden'), { target: { value: '2' } });

    fireEvent.click(uploadScope.getByRole('button', { name: 'Subir y registrar imagen' }));

    await waitFor(() => {
        expect(presignVariantImageMock).toHaveBeenCalledWith(300, {
            contentType: 'image/webp',
            byteSize: 3,
        });
    });
    await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
            'https://uploads.spacegurumis.lat/signed',
            expect.objectContaining({
                method: 'PUT',
                body: file,
            })
        );
    });
    await waitFor(() => {
        expect(registerVariantImageMock).toHaveBeenCalledWith(
            300,
            expect.objectContaining({
                imageKey: 'variants/300/new.webp',
                contentType: 'image/webp',
                byteSize: 3,
                altText: 'Nueva imagen',
                sortOrder: 2,
            })
        );
    });

    const image = await screen.findByRole('img', { name: 'Hero' });
    const imageRow = image.closest('.admin-images__row');
    expect(imageRow).toBeTruthy();
    const imageScope = within(imageRow as HTMLElement);

    fireEvent.change(imageScope.getByLabelText('Alt text'), { target: { value: 'Hero actualizado' } });
    fireEvent.change(imageScope.getByLabelText('Orden'), { target: { value: '5' } });
    fireEvent.click(imageScope.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
        expect(updateVariantImageMock).toHaveBeenCalledWith(300, 900, {
            altText: 'Hero actualizado',
            sortOrder: 5,
        });
    });

    fireEvent.click(imageScope.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
        expect(deleteVariantImageMock).toHaveBeenCalledWith(300, 900);
    });
});
