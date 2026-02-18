import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import AdminUsersModulePage from './AdminUsersModulePage';
import AdminCatalogModulePage from './AdminCatalogModulePage';
import AdminImagesModulePage from './AdminImagesModulePage';
import AdminDiscountsModulePage from './AdminDiscountsModulePage';

const getProfileMock = vi.fn();

const listAdminUsersMock = vi.fn();
const createAdminUserMock = vi.fn();
const removeAdminUserMock = vi.fn();

const listAdminCatalogCategoriesMock = vi.fn();
const listAdminCatalogProductsMock = vi.fn();
const createAdminCatalogCategoryMock = vi.fn();
const createAdminCatalogProductMock = vi.fn();
const createAdminCatalogVariantMock = vi.fn();
const updateAdminCatalogCategoryMock = vi.fn();
const updateAdminCatalogProductMock = vi.fn();
const updateAdminCatalogVariantMock = vi.fn();
const updateAdminCatalogVariantStockMock = vi.fn();
const deleteAdminCatalogCategoryMock = vi.fn();
const deleteAdminCatalogProductMock = vi.fn();
const deleteAdminCatalogVariantMock = vi.fn();

const presignCategoryImageMock = vi.fn();
const registerCategoryImageMock = vi.fn();
const listCategoryImagesMock = vi.fn();
const updateCategoryImageMock = vi.fn();
const deleteCategoryImageMock = vi.fn();

const presignProductImageMock = vi.fn();
const registerProductImageMock = vi.fn();
const listProductImagesMock = vi.fn();
const updateProductImageMock = vi.fn();
const deleteProductImageMock = vi.fn();

const presignVariantImageMock = vi.fn();
const registerVariantImageMock = vi.fn();
const listVariantImagesMock = vi.fn();
const updateVariantImageMock = vi.fn();
const deleteVariantImageMock = vi.fn();

const listAdminDiscountsMock = vi.fn();
const createAdminDiscountMock = vi.fn();
const updateAdminDiscountMock = vi.fn();
const deleteAdminDiscountMock = vi.fn();
let fetchMock: ReturnType<typeof vi.fn>;

vi.mock('../../../lib/api/profile', () => ({
    getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

vi.mock('../../../lib/api/admin', () => ({
    listAdminUsers: (...args: unknown[]) => listAdminUsersMock(...args),
    createAdminUser: (...args: unknown[]) => createAdminUserMock(...args),
    removeAdminUser: (...args: unknown[]) => removeAdminUserMock(...args),

    listAdminCatalogCategories: (...args: unknown[]) => listAdminCatalogCategoriesMock(...args),
    listAdminCatalogProducts: (...args: unknown[]) => listAdminCatalogProductsMock(...args),
    createAdminCatalogCategory: (...args: unknown[]) => createAdminCatalogCategoryMock(...args),
    createAdminCatalogProduct: (...args: unknown[]) => createAdminCatalogProductMock(...args),
    createAdminCatalogVariant: (...args: unknown[]) => createAdminCatalogVariantMock(...args),
    updateAdminCatalogCategory: (...args: unknown[]) => updateAdminCatalogCategoryMock(...args),
    updateAdminCatalogProduct: (...args: unknown[]) => updateAdminCatalogProductMock(...args),
    updateAdminCatalogVariant: (...args: unknown[]) => updateAdminCatalogVariantMock(...args),
    updateAdminCatalogVariantStock: (...args: unknown[]) => updateAdminCatalogVariantStockMock(...args),
    deleteAdminCatalogCategory: (...args: unknown[]) => deleteAdminCatalogCategoryMock(...args),
    deleteAdminCatalogProduct: (...args: unknown[]) => deleteAdminCatalogProductMock(...args),
    deleteAdminCatalogVariant: (...args: unknown[]) => deleteAdminCatalogVariantMock(...args),

    presignCategoryImage: (...args: unknown[]) => presignCategoryImageMock(...args),
    registerCategoryImage: (...args: unknown[]) => registerCategoryImageMock(...args),
    listCategoryImages: (...args: unknown[]) => listCategoryImagesMock(...args),
    updateCategoryImage: (...args: unknown[]) => updateCategoryImageMock(...args),
    deleteCategoryImage: (...args: unknown[]) => deleteCategoryImageMock(...args),

    presignProductImage: (...args: unknown[]) => presignProductImageMock(...args),
    registerProductImage: (...args: unknown[]) => registerProductImageMock(...args),
    listProductImages: (...args: unknown[]) => listProductImagesMock(...args),
    updateProductImage: (...args: unknown[]) => updateProductImageMock(...args),
    deleteProductImage: (...args: unknown[]) => deleteProductImageMock(...args),

    presignVariantImage: (...args: unknown[]) => presignVariantImageMock(...args),
    registerVariantImage: (...args: unknown[]) => registerVariantImageMock(...args),
    listVariantImages: (...args: unknown[]) => listVariantImagesMock(...args),
    updateVariantImage: (...args: unknown[]) => updateVariantImageMock(...args),
    deleteVariantImage: (...args: unknown[]) => deleteVariantImageMock(...args),

    listAdminDiscounts: (...args: unknown[]) => listAdminDiscountsMock(...args),
    createAdminDiscount: (...args: unknown[]) => createAdminDiscountMock(...args),
    updateAdminDiscount: (...args: unknown[]) => updateAdminDiscountMock(...args),
    deleteAdminDiscount: (...args: unknown[]) => deleteAdminDiscountMock(...args),
}));

function makeAdminProfile() {
    return {
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
    };
}

function makeCatalogProducts() {
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
    ];
}

beforeEach(() => {
    vi.resetAllMocks();

    getProfileMock.mockResolvedValue(makeAdminProfile());

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
    createAdminUserMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    removeAdminUserMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });

    listAdminCatalogCategoriesMock.mockResolvedValue({
        data: [{ id: 10, name: 'Categoria A', slug: 'cat-a', isActive: true }],
        message: 'OK',
        errors: [],
        meta: {},
    });
    listAdminCatalogProductsMock.mockResolvedValue({
        data: makeCatalogProducts(),
        message: 'OK',
        errors: [],
        meta: {},
    });

    createAdminCatalogCategoryMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    createAdminCatalogProductMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    createAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogCategoryMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogProductMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminCatalogVariantStockMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteAdminCatalogCategoryMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteAdminCatalogProductMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteAdminCatalogVariantMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });

    presignCategoryImageMock.mockResolvedValue({
        data: {
            uploadUrl: 'https://upload.test/category',
            imageKey: 'categories/10/new.webp',
            publicUrl: 'https://assets.spacegurumis.lat/categories/10/new.webp',
            expiresInSeconds: 120,
            headers: { 'Content-Type': 'image/webp' },
        },
        message: 'OK',
        errors: [],
        meta: {},
    });
    registerCategoryImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    listCategoryImagesMock.mockResolvedValue({ data: [], message: 'OK', errors: [], meta: {} });
    updateCategoryImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteCategoryImageMock.mockResolvedValue({ data: { deleted: true }, message: 'OK', errors: [], meta: {} });

    presignProductImageMock.mockResolvedValue({
        data: {
            uploadUrl: 'https://upload.test/product',
            imageKey: 'products/101/new.webp',
            publicUrl: 'https://assets.spacegurumis.lat/products/101/new.webp',
            expiresInSeconds: 120,
            headers: { 'Content-Type': 'image/webp' },
        },
        message: 'OK',
        errors: [],
        meta: {},
    });
    registerProductImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    listProductImagesMock.mockResolvedValue({ data: [], message: 'OK', errors: [], meta: {} });
    updateProductImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteProductImageMock.mockResolvedValue({ data: { deleted: true }, message: 'OK', errors: [], meta: {} });

    presignVariantImageMock.mockResolvedValue({
        data: {
            uploadUrl: 'https://upload.test/variant',
            imageKey: 'variants/300/new.webp',
            publicUrl: 'https://assets.spacegurumis.lat/variants/300/new.webp',
            expiresInSeconds: 120,
            headers: { 'Content-Type': 'image/webp' },
        },
        message: 'OK',
        errors: [],
        meta: {},
    });
    registerVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    listVariantImagesMock.mockResolvedValue({ data: [], message: 'OK', errors: [], meta: {} });
    updateVariantImageMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteVariantImageMock.mockResolvedValue({ data: { deleted: true }, message: 'OK', errors: [], meta: {} });

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
    createAdminDiscountMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    updateAdminDiscountMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });
    deleteAdminDiscountMock.mockResolvedValue({ data: {}, message: 'OK', errors: [], meta: {} });

    fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('users module supports admin removal with confirmation', async () => {
    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmMock);

    render(<AdminUsersModulePage />);

    const button = await screen.findByRole('button', { name: 'Remover admin admin@spacegurumis.lat' });
    fireEvent.click(button);

    await waitFor(() => {
        expect(removeAdminUserMock).toHaveBeenCalledWith(1);
    });
});

test('catalog module deletes variant using scoped context', async () => {
    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmMock);

    render(<AdminCatalogModulePage />);

    await screen.findByRole('heading', { name: 'Catalogo' });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar por alcance' }));

    await waitFor(() => {
        expect(deleteAdminCatalogVariantMock).toHaveBeenCalledWith(300, {
            categoryId: 10,
            productId: 101,
        });
    });
});

test('images module uploads category image when only category is selected', async () => {
    render(<AdminImagesModulePage />);

    await screen.findByRole('heading', { name: 'Imagenes' });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '10' } });

    const file = new File(['img'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir imagen' }));

    await waitFor(() => {
        expect(presignCategoryImageMock).toHaveBeenCalledWith(10, {
            contentType: 'image/webp',
            byteSize: file.size,
        });
    });

    await waitFor(() => {
        expect(registerCategoryImageMock).toHaveBeenCalledWith(
            10,
            expect.objectContaining({
                imageKey: 'categories/10/new.webp',
                contentType: 'image/webp',
            })
        );
    });
});

test('images module shows presign-stage error and stops flow when presign fails', async () => {
    presignCategoryImageMock.mockRejectedValueOnce(new Error('Request failed'));

    render(<AdminImagesModulePage />);
    await screen.findByRole('heading', { name: 'Imagenes' });

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '10' } });
    const file = new File(['img'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir imagen' }));

    await screen.findByText(/No se pudo iniciar la subida \(presign\)/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(registerCategoryImageMock).not.toHaveBeenCalled();
});

test('images module validates presign contract before PUT', async () => {
    presignCategoryImageMock.mockResolvedValueOnce({ data: { uploadUrl: '', imageKey: '' }, message: 'OK', errors: [], meta: {} });

    render(<AdminImagesModulePage />);
    await screen.findByRole('heading', { name: 'Imagenes' });

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '10' } });
    const file = new File(['img'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir imagen' }));

    await screen.findByText(/Respuesta presign invalida/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(registerCategoryImageMock).not.toHaveBeenCalled();
});

test('images module shows upload-stage error and skips register on PUT network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(<AdminImagesModulePage />);
    await screen.findByRole('heading', { name: 'Imagenes' });

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '10' } });
    const file = new File(['img'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir imagen' }));

    await screen.findByText(/No se pudo subir el archivo a R2 \(upload\)/i);
    expect(registerCategoryImageMock).not.toHaveBeenCalled();
});

test('images module shows register-stage error when register fails after successful PUT', async () => {
    registerCategoryImageMock.mockRejectedValueOnce(new Error('register rejected'));

    render(<AdminImagesModulePage />);
    await screen.findByRole('heading', { name: 'Imagenes' });

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '10' } });
    const file = new File(['img'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir imagen' }));

    await screen.findByText(/fallo el registro en backend \(register\)/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('images module removes only one image from variant gallery', async () => {
    listVariantImagesMock.mockResolvedValueOnce({
        data: [
            {
                id: 900,
                productVariantId: 300,
                imageKey: 'variants/300/red.webp',
                publicUrl: 'https://assets.spacegurumis.lat/variants/300/red.webp',
                contentType: 'image/webp',
                byteSize: 123,
                altText: 'Rojo',
                sortOrder: 0,
            },
        ],
        message: 'OK',
        errors: [],
        meta: {},
    });

    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmMock);

    render(<AdminImagesModulePage />);

    await screen.findByRole('heading', { name: 'Imagenes' });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Producto (opcional)'), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText('Variante (opcional)'), { target: { value: '300' } });

    const deleteButtons = await screen.findAllByRole('button', { name: 'Eliminar' });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
        expect(deleteVariantImageMock).toHaveBeenCalledWith(300, 900, {
            categoryId: 10,
            productId: 101,
        });
    });
});

test('discount module surfaces actionable validation error on invalid payload', async () => {
    createAdminDiscountMock.mockRejectedValueOnce(
        new Error('Rango de fechas invalido: startsAt debe ser menor que expiresAt')
    );

    render(<AdminDiscountsModulePage />);

    await screen.findByRole('heading', { name: 'Descuentos' });
    const createSection = screen.getByRole('heading', { name: 'Crear descuento' }).closest('section');
    if (!createSection) {
        throw new Error('Create discount section not found');
    }
    const createForm = within(createSection);

    fireEvent.change(createForm.getByLabelText('Codigo descuento'), { target: { value: 'promo15' } });
    fireEvent.change(createForm.getByLabelText('Porcentaje descuento'), { target: { value: '15' } });
    fireEvent.change(createForm.getByLabelText('Inicio'), { target: { value: '2026-03-10T10:00' } });
    fireEvent.change(createForm.getByLabelText('Expira'), { target: { value: '2026-03-09T10:00' } });
    fireEvent.click(createForm.getByRole('button', { name: 'Crear descuento' }));

    await screen.findByText('Rango de fechas invalido: startsAt debe ser menor que expiresAt');
});
