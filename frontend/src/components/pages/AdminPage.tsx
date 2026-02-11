import React, { useEffect, useMemo, useState } from 'react';
import {
    createAdminCatalogProduct,
    createAdminCatalogVariant,
    createAdminUser,
    deleteVariantImage,
    listAdminCatalogCategories,
    listAdminCatalogProducts,
    listAdminUsers,
    listVariantImages,
    presignVariantImage,
    registerVariantImage,
    updateAdminCatalogProduct,
    updateAdminCatalogVariant,
    updateAdminCatalogVariantStock,
    updateVariantImage,
    type AdminCatalogCategory,
    type AdminCatalogProduct,
    type AdminCatalogVariant,
    type AdminUser,
    type AdminVariantImage,
} from '../../lib/api/admin';
import { ApiError } from '../../lib/api/client';
import { getProfile } from '../../lib/api/profile';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

type NoticeTone = 'info' | 'success' | 'error';

function asNumberOrNull(value: string) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
}

function asIntegerOrZero(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }
    return Math.max(0, Math.round(parsed));
}

export default function AdminPage() {
    const [accessState, setAccessState] = useState<'checking' | 'granted' | 'denied'>('checking');
    const [accessMessage, setAccessMessage] = useState('');
    const [accessRedirectPath, setAccessRedirectPath] = useState('');
    const [loadingData, setLoadingData] = useState(false);

    const [noticeTone, setNoticeTone] = useState<NoticeTone>('info');
    const [notice, setNotice] = useState('');

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
    const [products, setProducts] = useState<AdminCatalogProduct[]>([]);

    const [createAdminForm, setCreateAdminForm] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });

    const [createProductForm, setCreateProductForm] = useState({
        categoryId: '',
        name: '',
        slug: '',
        description: '',
        isActive: true,
        sku: '',
        variantName: '',
        price: '',
        initialStock: '',
        weightGrams: '',
        sizeLabel: '',
    });

    const [selectedProductId, setSelectedProductId] = useState<number>(0);
    const [updateProductForm, setUpdateProductForm] = useState({
        categoryId: '',
        name: '',
        slug: '',
        description: '',
        isActive: true,
    });

    const [createVariantForm, setCreateVariantForm] = useState({
        sku: '',
        variantName: '',
        price: '',
        initialStock: '',
        weightGrams: '',
        sizeLabel: '',
    });

    const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
    const [updateVariantForm, setUpdateVariantForm] = useState({
        sku: '',
        variantName: '',
        price: '',
        weightGrams: '',
        sizeLabel: '',
        stock: '',
    });

    const [variantImages, setVariantImages] = useState<AdminVariantImage[]>([]);
    const [imageDrafts, setImageDrafts] = useState<Record<number, { altText: string; sortOrder: string }>>({});
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadAltText, setUploadAltText] = useState('');
    const [uploadSortOrder, setUploadSortOrder] = useState('0');

    function pushNotice(tone: NoticeTone, message: string) {
        setNoticeTone(tone);
        setNotice(message);
    }

    async function loadData() {
        setLoadingData(true);
        try {
            const [usersRes, categoriesRes, productsRes] = await Promise.all([
                listAdminUsers(),
                listAdminCatalogCategories(),
                listAdminCatalogProducts(),
            ]);
            const nextUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
            const nextCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
            const nextProducts = Array.isArray(productsRes.data) ? productsRes.data : [];

            setUsers(nextUsers);
            setCategories(nextCategories);
            setProducts(nextProducts);

            if (nextProducts.length) {
                setSelectedProductId((current) => {
                    if (current && nextProducts.some((item) => item.id === current)) {
                        return current;
                    }
                    return nextProducts[0].id;
                });
            } else {
                setSelectedProductId(0);
            }
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudieron cargar datos de admin.');
        } finally {
            setLoadingData(false);
        }
    }

    async function bootstrap() {
        setAccessState('checking');
        setAccessMessage('');
        setAccessRedirectPath('');

        try {
            const profileRes = await getProfile();
            const user = profileRes && profileRes.data ? profileRes.data.user : null;
            if (!user) {
                setAccessState('denied');
                setAccessMessage('No tienes una sesion valida. Inicia sesion para continuar.');
                setAccessRedirectPath('/login');
                return;
            }

            if (String(user.role || '').toLowerCase() !== 'admin') {
                setAccessState('denied');
                setAccessMessage('Tu cuenta no tiene permisos de administrador.');
                setAccessRedirectPath('/');
                return;
            }

            setAccessState('granted');
            await loadData();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setAccessState('denied');
                setAccessMessage('Debes iniciar sesion como administrador para acceder.');
                setAccessRedirectPath('/login');
                return;
            }

            setAccessState('denied');
            setAccessMessage(err instanceof Error ? err.message : 'No se pudo validar acceso.');
            setAccessRedirectPath('/login');
        }
    }

    useEffect(() => {
        bootstrap();
    }, []);

    useEffect(() => {
        if (accessState !== 'denied' || !accessRedirectPath) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        window.location.assign(accessRedirectPath);
    }, [accessState, accessRedirectPath]);

    const selectedProduct = useMemo(
        () => products.find((item) => item.id === selectedProductId) || null,
        [products, selectedProductId]
    );

    const selectedVariant = useMemo(() => {
        if (!selectedProduct || !Array.isArray(selectedProduct.variants)) {
            return null;
        }
        return selectedProduct.variants.find((item) => item.id === selectedVariantId) || null;
    }, [selectedProduct, selectedVariantId]);

    useEffect(() => {
        if (!selectedProduct) {
            setUpdateProductForm({
                categoryId: '',
                name: '',
                slug: '',
                description: '',
                isActive: true,
            });
            setSelectedVariantId(0);
            return;
        }

        setUpdateProductForm({
            categoryId: selectedProduct.category ? String(selectedProduct.category.id) : '',
            name: selectedProduct.name || '',
            slug: selectedProduct.slug || '',
            description: selectedProduct.description || '',
            isActive: Boolean(selectedProduct.isActive),
        });

        if (selectedProduct.variants.length) {
            setSelectedVariantId((current) => {
                if (current && selectedProduct.variants.some((item) => item.id === current)) {
                    return current;
                }
                return selectedProduct.variants[0].id;
            });
        } else {
            setSelectedVariantId(0);
        }
    }, [selectedProduct]);

    useEffect(() => {
        if (!selectedVariant) {
            setUpdateVariantForm({
                sku: '',
                variantName: '',
                price: '',
                weightGrams: '',
                sizeLabel: '',
                stock: '',
            });
            setVariantImages([]);
            setImageDrafts({});
            return;
        }

        setUpdateVariantForm({
            sku: selectedVariant.sku || '',
            variantName: selectedVariant.variantName || '',
            price: selectedVariant.price !== null && selectedVariant.price !== undefined ? String(selectedVariant.price) : '',
            weightGrams: selectedVariant.weightGrams !== null && selectedVariant.weightGrams !== undefined
                ? String(selectedVariant.weightGrams)
                : '',
            sizeLabel: selectedVariant.sizeLabel || '',
            stock: String(selectedVariant.stock || 0),
        });
    }, [selectedVariant]);

    async function refreshVariantImages(variantId: number) {
        if (!variantId) {
            setVariantImages([]);
            setImageDrafts({});
            return;
        }

        try {
            const res = await listVariantImages(variantId);
            const items = Array.isArray(res.data) ? res.data : [];
            setVariantImages(items);
            const drafts: Record<number, { altText: string; sortOrder: string }> = {};
            for (const item of items) {
                drafts[item.id] = {
                    altText: item.altText || '',
                    sortOrder: String(item.sortOrder ?? 0),
                };
            }
            setImageDrafts(drafts);
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudieron cargar imagenes.');
        }
    }

    useEffect(() => {
        if (!selectedVariantId) {
            setVariantImages([]);
            setImageDrafts({});
            return;
        }
        refreshVariantImages(selectedVariantId);
    }, [selectedVariantId]);

    async function handleCreateAdminUser(event: React.FormEvent) {
        event.preventDefault();
        try {
            const payload = {
                email: createAdminForm.email.trim(),
                password: createAdminForm.password.trim() || undefined,
                firstName: createAdminForm.firstName.trim() || undefined,
                lastName: createAdminForm.lastName.trim() || undefined,
            };
            const res = await createAdminUser(payload);
            const action = res.data && res.data.action ? res.data.action : 'created';
            pushNotice('success', `Admin ${action === 'promoted' ? 'promovido' : 'creado'} correctamente.`);
            setCreateAdminForm({ email: '', password: '', firstName: '', lastName: '' });
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo crear admin.');
        }
    }

    async function handleCreateProduct(event: React.FormEvent) {
        event.preventDefault();
        try {
            const payload = {
                categoryId: createProductForm.categoryId ? Number(createProductForm.categoryId) : null,
                name: createProductForm.name.trim(),
                slug: createProductForm.slug.trim().toLowerCase(),
                description: createProductForm.description.trim() || null,
                isActive: createProductForm.isActive,
                sku: createProductForm.sku.trim(),
                variantName: createProductForm.variantName.trim() || null,
                price: Number(createProductForm.price),
                initialStock: asIntegerOrZero(createProductForm.initialStock),
                weightGrams: asNumberOrNull(createProductForm.weightGrams),
                sizeLabel: createProductForm.sizeLabel.trim() || null,
            };
            const res = await createAdminCatalogProduct(payload);
            pushNotice(
                'success',
                `Producto creado: #${res.data.product.id}, variante ${res.data.variant.sku}.`
            );
            setCreateProductForm({
                categoryId: '',
                name: '',
                slug: '',
                description: '',
                isActive: true,
                sku: '',
                variantName: '',
                price: '',
                initialStock: '',
                weightGrams: '',
                sizeLabel: '',
            });
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo crear producto.');
        }
    }

    async function handleUpdateProduct(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedProductId) {
            pushNotice('error', 'Selecciona un producto.');
            return;
        }

        try {
            await updateAdminCatalogProduct(selectedProductId, {
                categoryId: updateProductForm.categoryId ? Number(updateProductForm.categoryId) : null,
                name: updateProductForm.name.trim(),
                slug: updateProductForm.slug.trim().toLowerCase(),
                description: updateProductForm.description.trim() || null,
                isActive: updateProductForm.isActive,
            });
            pushNotice('success', 'Producto actualizado.');
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo actualizar producto.');
        }
    }

    async function handleCreateVariant(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedProductId) {
            pushNotice('error', 'Selecciona un producto para crear la variante.');
            return;
        }

        try {
            await createAdminCatalogVariant(selectedProductId, {
                sku: createVariantForm.sku.trim(),
                variantName: createVariantForm.variantName.trim() || null,
                price: Number(createVariantForm.price),
                initialStock: asIntegerOrZero(createVariantForm.initialStock),
                weightGrams: asNumberOrNull(createVariantForm.weightGrams),
                sizeLabel: createVariantForm.sizeLabel.trim() || null,
            });
            pushNotice('success', 'Variante creada.');
            setCreateVariantForm({
                sku: '',
                variantName: '',
                price: '',
                initialStock: '',
                weightGrams: '',
                sizeLabel: '',
            });
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo crear variante.');
        }
    }

    async function handleUpdateVariant(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedVariantId) {
            pushNotice('error', 'Selecciona una variante.');
            return;
        }

        try {
            await updateAdminCatalogVariant(selectedVariantId, {
                sku: updateVariantForm.sku.trim(),
                variantName: updateVariantForm.variantName.trim() || null,
                price: Number(updateVariantForm.price),
                weightGrams: asNumberOrNull(updateVariantForm.weightGrams),
                sizeLabel: updateVariantForm.sizeLabel.trim() || null,
            });
            await updateAdminCatalogVariantStock(selectedVariantId, asIntegerOrZero(updateVariantForm.stock));
            pushNotice('success', 'Variante y stock actualizados.');
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo actualizar variante.');
        }
    }

    async function handleUploadVariantImage(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedVariantId) {
            pushNotice('error', 'Selecciona una variante para subir imagenes.');
            return;
        }
        if (!uploadFile) {
            pushNotice('error', 'Selecciona un archivo de imagen.');
            return;
        }

        try {
            const presigned = await presignVariantImage(selectedVariantId, {
                contentType: uploadFile.type,
                byteSize: uploadFile.size,
            });
            const signed = presigned.data;

            const putRes = await fetch(signed.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': uploadFile.type },
                body: uploadFile,
            });
            if (!putRes.ok) {
                throw new Error(`Fallo la subida a R2 (${putRes.status})`);
            }

            await registerVariantImage(selectedVariantId, {
                imageKey: signed.imageKey,
                contentType: uploadFile.type,
                byteSize: uploadFile.size,
                altText: uploadAltText.trim() || null,
                sortOrder: asIntegerOrZero(uploadSortOrder),
            });

            setUploadFile(null);
            setUploadAltText('');
            setUploadSortOrder('0');
            pushNotice('success', 'Imagen registrada correctamente.');
            await refreshVariantImages(selectedVariantId);
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo subir la imagen.');
        }
    }

    async function handleUpdateImage(imageId: number) {
        if (!selectedVariantId) {
            pushNotice('error', 'Selecciona una variante.');
            return;
        }

        const draft = imageDrafts[imageId] || { altText: '', sortOrder: '0' };
        try {
            await updateVariantImage(selectedVariantId, imageId, {
                altText: draft.altText.trim() || null,
                sortOrder: asIntegerOrZero(draft.sortOrder),
            });
            pushNotice('success', 'Imagen actualizada.');
            await refreshVariantImages(selectedVariantId);
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo actualizar imagen.');
        }
    }

    async function handleDeleteImage(imageId: number) {
        if (!selectedVariantId) {
            pushNotice('error', 'Selecciona una variante.');
            return;
        }
        try {
            await deleteVariantImage(selectedVariantId, imageId);
            pushNotice('success', 'Imagen eliminada.');
            await refreshVariantImages(selectedVariantId);
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo eliminar imagen.');
        }
    }

    if (accessState === 'checking') {
        return (
            <section className="surface page">
                <h1>Admin</h1>
                <p className="status">Validando acceso...</p>
            </section>
        );
    }

    if (accessState === 'denied') {
        return (
            <section className="surface page">
                <h1>Admin</h1>
                <Alert tone="error">{accessMessage || 'Acceso denegado'}</Alert>
                <p className="status">Redirigiendo...</p>
            </section>
        );
    }

    return (
        <section className="surface page admin-page">
            <div className="page__header">
                <h1>Consola admin</h1>
                <p className="muted">Gestion de administradores, productos, variantes e imagenes.</p>
            </div>

            {notice ? <Alert tone={noticeTone}>{notice}</Alert> : null}
            {loadingData ? <p className="status">Actualizando datos...</p> : null}

            <div className="admin-page__grid">
                <section className="card">
                    <h2 className="card__title">Usuarios admin</h2>
                    <p className="card__meta">Admins actuales: {users.length}</p>
                    <div className="admin-list">
                        {users.map((user) => (
                            <div className="admin-list__row" key={user.id}>
                                <strong>{user.email}</strong>
                                <span className="muted">{user.firstName || ''} {user.lastName || ''}</span>
                            </div>
                        ))}
                    </div>
                    <form className="form" onSubmit={handleCreateAdminUser}>
                        <TextField
                            label="Email"
                            type="email"
                            value={createAdminForm.email}
                            onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, email: event.target.value }))}
                            required
                        />
                        <TextField
                            label="Password (si es usuario nuevo)"
                            type="password"
                            value={createAdminForm.password}
                            onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, password: event.target.value }))}
                        />
                        <div className="form__grid">
                            <TextField
                                label="Nombre"
                                value={createAdminForm.firstName}
                                onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, firstName: event.target.value }))}
                            />
                            <TextField
                                label="Apellido"
                                value={createAdminForm.lastName}
                                onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, lastName: event.target.value }))}
                            />
                        </div>
                        <div className="form__actions">
                            <Button type="submit">Crear / promover admin</Button>
                        </div>
                    </form>
                </section>

                <section className="card">
                    <h2 className="card__title">Crear producto</h2>
                    <form className="form" onSubmit={handleCreateProduct}>
                        <div className="form__grid">
                            <TextField
                                label="Nombre de producto"
                                value={createProductForm.name}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, name: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Slug"
                                value={createProductForm.slug}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, slug: event.target.value }))}
                                required
                            />
                        </div>
                        <TextField
                            label="Descripcion"
                            value={createProductForm.description}
                            onChange={(event) => setCreateProductForm((prev) => ({ ...prev, description: event.target.value }))}
                        />
                        <div className="form__grid">
                            <label className="field">
                                <span className="field__label">Categoria</span>
                                <select
                                    className="field__input"
                                    value={createProductForm.categoryId}
                                    onChange={(event) => setCreateProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                                >
                                    <option value="">Sin categoria</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span className="field__label">Activo</span>
                                <select
                                    className="field__input"
                                    value={createProductForm.isActive ? '1' : '0'}
                                    onChange={(event) => setCreateProductForm((prev) => ({ ...prev, isActive: event.target.value === '1' }))}
                                >
                                    <option value="1">Si</option>
                                    <option value="0">No</option>
                                </select>
                            </label>
                        </div>

                        <p className="field__label">Variante inicial</p>
                        <div className="form__grid">
                            <TextField
                                label="SKU"
                                value={createProductForm.sku}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Nombre variante"
                                value={createProductForm.variantName}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, variantName: event.target.value }))}
                            />
                        </div>
                        <div className="form__grid">
                            <TextField
                                label="Precio"
                                type="number"
                                min="0"
                                step="0.01"
                                value={createProductForm.price}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, price: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Stock inicial"
                                type="number"
                                min="0"
                                step="1"
                                value={createProductForm.initialStock}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, initialStock: event.target.value }))}
                                required
                            />
                        </div>
                        <div className="form__grid">
                            <TextField
                                label="Peso (gramos)"
                                type="number"
                                min="0"
                                step="1"
                                value={createProductForm.weightGrams}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, weightGrams: event.target.value }))}
                            />
                            <TextField
                                label="Talla"
                                value={createProductForm.sizeLabel}
                                onChange={(event) => setCreateProductForm((prev) => ({ ...prev, sizeLabel: event.target.value }))}
                            />
                        </div>
                        <div className="form__actions">
                            <Button type="submit">Crear producto + variante</Button>
                        </div>
                    </form>
                </section>
            </div>

            <div className="admin-page__grid">
                <section className="card">
                    <h2 className="card__title">Editar producto</h2>
                    <label className="field">
                        <span className="field__label">Producto</span>
                        <select
                            className="field__input"
                            value={selectedProductId || ''}
                            onChange={(event) => setSelectedProductId(Number(event.target.value) || 0)}
                        >
                            <option value="">Selecciona un producto</option>
                            {products.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.slug})
                                </option>
                            ))}
                        </select>
                    </label>

                    <form className="form" onSubmit={handleUpdateProduct}>
                        <div className="form__grid">
                            <TextField
                                label="Nombre"
                                value={updateProductForm.name}
                                onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, name: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Slug"
                                value={updateProductForm.slug}
                                onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, slug: event.target.value }))}
                                required
                            />
                        </div>
                        <TextField
                            label="Descripcion"
                            value={updateProductForm.description}
                            onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, description: event.target.value }))}
                        />
                        <div className="form__grid">
                            <label className="field">
                                <span className="field__label">Categoria</span>
                                <select
                                    className="field__input"
                                    value={updateProductForm.categoryId}
                                    onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                                >
                                    <option value="">Sin categoria</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span className="field__label">Activo</span>
                                <select
                                    className="field__input"
                                    value={updateProductForm.isActive ? '1' : '0'}
                                    onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, isActive: event.target.value === '1' }))}
                                >
                                    <option value="1">Si</option>
                                    <option value="0">No</option>
                                </select>
                            </label>
                        </div>
                        <div className="form__actions">
                            <Button type="submit">Guardar producto</Button>
                        </div>
                    </form>
                </section>

                <section className="card">
                    <h2 className="card__title">Variantes e imagenes</h2>
                    <p className="card__meta">Dashboard fuera de alcance en esta iteracion.</p>
                    <label className="field">
                        <span className="field__label">Variante</span>
                        <select
                            className="field__input"
                            value={selectedVariantId || ''}
                            onChange={(event) => setSelectedVariantId(Number(event.target.value) || 0)}
                        >
                            <option value="">Selecciona una variante</option>
                            {selectedProduct && selectedProduct.variants.map((item: AdminCatalogVariant) => (
                                <option key={item.id} value={item.id}>
                                    {item.sku} - {item.variantName || 'Sin nombre'}
                                </option>
                            ))}
                        </select>
                    </label>

                    <form className="form" onSubmit={handleCreateVariant}>
                        <p className="field__label">Nueva variante</p>
                        <div className="form__grid">
                            <TextField
                                label="SKU"
                                value={createVariantForm.sku}
                                onChange={(event) => setCreateVariantForm((prev) => ({ ...prev, sku: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Nombre variante"
                                value={createVariantForm.variantName}
                                onChange={(event) => setCreateVariantForm((prev) => ({ ...prev, variantName: event.target.value }))}
                            />
                        </div>
                        <div className="form__grid">
                            <TextField
                                label="Precio"
                                type="number"
                                min="0"
                                step="0.01"
                                value={createVariantForm.price}
                                onChange={(event) => setCreateVariantForm((prev) => ({ ...prev, price: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Stock inicial"
                                type="number"
                                min="0"
                                step="1"
                                value={createVariantForm.initialStock}
                                onChange={(event) => setCreateVariantForm((prev) => ({ ...prev, initialStock: event.target.value }))}
                            />
                        </div>
                        <div className="form__grid">
                            <TextField
                                label="Peso (gramos)"
                                type="number"
                                min="0"
                                step="1"
                                value={createVariantForm.weightGrams}
                                onChange={(event) => setCreateVariantForm((prev) => ({ ...prev, weightGrams: event.target.value }))}
                            />
                            <TextField
                                label="Talla"
                                value={createVariantForm.sizeLabel}
                                onChange={(event) => setCreateVariantForm((prev) => ({ ...prev, sizeLabel: event.target.value }))}
                            />
                        </div>
                        <div className="form__actions">
                            <Button type="submit">Crear variante</Button>
                        </div>
                    </form>

                    <form className="form" onSubmit={handleUpdateVariant}>
                        <p className="field__label">Editar variante seleccionada</p>
                        <div className="form__grid">
                            <TextField
                                label="SKU"
                                value={updateVariantForm.sku}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, sku: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Nombre variante"
                                value={updateVariantForm.variantName}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, variantName: event.target.value }))}
                            />
                        </div>
                        <div className="form__grid">
                            <TextField
                                label="Precio"
                                type="number"
                                min="0"
                                step="0.01"
                                value={updateVariantForm.price}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, price: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Stock"
                                type="number"
                                min="0"
                                step="1"
                                value={updateVariantForm.stock}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, stock: event.target.value }))}
                                required
                            />
                        </div>
                        <div className="form__grid">
                            <TextField
                                label="Peso (gramos)"
                                type="number"
                                min="0"
                                step="1"
                                value={updateVariantForm.weightGrams}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, weightGrams: event.target.value }))}
                            />
                            <TextField
                                label="Talla"
                                value={updateVariantForm.sizeLabel}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, sizeLabel: event.target.value }))}
                            />
                        </div>
                        <div className="form__actions">
                            <Button type="submit">Guardar variante</Button>
                        </div>
                    </form>

                    <form className="form" onSubmit={handleUploadVariantImage}>
                        <p className="field__label">Subir imagen para variante</p>
                        <label className="field">
                            <span className="field__label">Archivo</span>
                            <input
                                className="field__input"
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                                    setUploadFile(file);
                                }}
                            />
                        </label>
                        <div className="form__grid">
                            <TextField
                                label="Alt text"
                                value={uploadAltText}
                                onChange={(event) => setUploadAltText(event.target.value)}
                            />
                            <TextField
                                label="Orden"
                                type="number"
                                min="0"
                                step="1"
                                value={uploadSortOrder}
                                onChange={(event) => setUploadSortOrder(event.target.value)}
                            />
                        </div>
                        <div className="form__actions">
                            <Button type="submit">Subir y registrar imagen</Button>
                        </div>
                    </form>

                    <div className="admin-images">
                        <p className="field__label">Imagenes registradas</p>
                        {variantImages.length ? (
                            variantImages.map((image) => (
                                <div className="admin-images__row" key={image.id}>
                                    <img src={image.publicUrl} alt={image.altText || 'Imagen variante'} />
                                    <div className="admin-images__meta">
                                        <TextField
                                            label="Alt text"
                                            value={imageDrafts[image.id]?.altText || ''}
                                            onChange={(event) => setImageDrafts((prev) => ({
                                                ...prev,
                                                [image.id]: {
                                                    altText: event.target.value,
                                                    sortOrder: prev[image.id]?.sortOrder || '0',
                                                },
                                            }))}
                                        />
                                        <TextField
                                            label="Orden"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={imageDrafts[image.id]?.sortOrder || '0'}
                                            onChange={(event) => setImageDrafts((prev) => ({
                                                ...prev,
                                                [image.id]: {
                                                    altText: prev[image.id]?.altText || '',
                                                    sortOrder: event.target.value,
                                                },
                                            }))}
                                        />
                                        <div className="form__actions">
                                            <Button type="button" variant="ghost" onClick={() => handleUpdateImage(image.id)}>
                                                Guardar
                                            </Button>
                                            <Button type="button" variant="danger" onClick={() => handleDeleteImage(image.id)}>
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="status">No hay imagenes para esta variante.</p>
                        )}
                    </div>
                </section>
            </div>
        </section>
    );
}
