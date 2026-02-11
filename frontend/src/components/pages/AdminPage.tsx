import React, { useEffect, useMemo, useState } from 'react';
import {
    createAdminCatalogCategory,
    createAdminCatalogProduct,
    createAdminCatalogVariant,
    createAdminDiscount,
    createAdminUser,
    deleteAdminCatalogCategory,
    deleteAdminCatalogProduct,
    deleteAdminCatalogVariant,
    deleteVariantImage,
    listAdminCatalogCategories,
    listAdminCatalogProducts,
    listAdminDiscounts,
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
    type AdminDiscount,
    type AdminUser,
    type AdminVariantImage,
} from '../../lib/api/admin';
import { ApiError } from '../../lib/api/client';
import { getProfile } from '../../lib/api/profile';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

type NoticeTone = 'info' | 'success' | 'error';
type CategoryMode = 'existing' | 'create';
type ProductMode = 'existing' | 'create';

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
    const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);

    const [createAdminForm, setCreateAdminForm] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });

    const [createCategoryMode, setCreateCategoryMode] = useState<CategoryMode>('existing');
    const [createProductMode, setCreateProductMode] = useState<ProductMode>('create');
    const [createSelectedCategoryId, setCreateSelectedCategoryId] = useState('');
    const [createSelectedProductId, setCreateSelectedProductId] = useState('');

    const [createCategoryForm, setCreateCategoryForm] = useState({
        name: '',
        slug: '',
        description: '',
        isActive: true,
    });

    const [createProductForm, setCreateProductForm] = useState({
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

    const [editCategoryId, setEditCategoryId] = useState('');
    const [editProductId, setEditProductId] = useState<number>(0);
    const [editVariantId, setEditVariantId] = useState<number>(0);

    const [updateProductForm, setUpdateProductForm] = useState({
        categoryId: '',
        name: '',
        slug: '',
        description: '',
        isActive: true,
    });

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

    const [discountForm, setDiscountForm] = useState({
        code: '',
        percentage: '',
        isActive: true,
        startsAt: '',
        expiresAt: '',
        maxUses: '',
        minSubtotal: '',
    });

    function pushNotice(tone: NoticeTone, message: string) {
        setNoticeTone(tone);
        setNotice(message);
    }

    async function loadData() {
        setLoadingData(true);
        try {
            const [usersRes, categoriesRes, productsRes, discountsRes] = await Promise.all([
                listAdminUsers(),
                listAdminCatalogCategories(),
                listAdminCatalogProducts(),
                listAdminDiscounts(),
            ]);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
            setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
            setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
            setDiscounts(Array.isArray(discountsRes.data) ? discountsRes.data : []);
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

    const createFilteredProducts = useMemo(() => {
        if (!createSelectedCategoryId) {
            return products;
        }
        return products.filter((item) => item.category && String(item.category.id) === createSelectedCategoryId);
    }, [products, createSelectedCategoryId]);

    const filteredEditProducts = useMemo(() => {
        if (!editCategoryId) {
            return [];
        }
        return products.filter((item) => item.category && String(item.category.id) === editCategoryId);
    }, [products, editCategoryId]);

    const selectedEditProduct = useMemo(
        () => filteredEditProducts.find((item) => item.id === editProductId) || null,
        [filteredEditProducts, editProductId]
    );

    const selectedEditVariant = useMemo(() => {
        if (!selectedEditProduct) {
            return null;
        }
        return selectedEditProduct.variants.find((item) => item.id === editVariantId) || null;
    }, [selectedEditProduct, editVariantId]);

    useEffect(() => {
        setEditCategoryId((current) => {
            if (current && categories.some((category) => String(category.id) === current)) {
                return current;
            }

            const firstWithCategory = products.find((item) => item.category);
            if (firstWithCategory && firstWithCategory.category) {
                return String(firstWithCategory.category.id);
            }

            if (categories.length) {
                return String(categories[0].id);
            }

            return '';
        });
    }, [categories, products]);

    useEffect(() => {
        setEditProductId((current) => {
            if (current && filteredEditProducts.some((item) => item.id === current)) {
                return current;
            }
            return filteredEditProducts.length ? filteredEditProducts[0].id : 0;
        });
    }, [filteredEditProducts]);

    useEffect(() => {
        if (!selectedEditProduct) {
            setUpdateProductForm({
                categoryId: '',
                name: '',
                slug: '',
                description: '',
                isActive: true,
            });
            setEditVariantId(0);
            return;
        }

        setUpdateProductForm({
            categoryId: selectedEditProduct.category ? String(selectedEditProduct.category.id) : '',
            name: selectedEditProduct.name || '',
            slug: selectedEditProduct.slug || '',
            description: selectedEditProduct.description || '',
            isActive: Boolean(selectedEditProduct.isActive),
        });

        setEditVariantId((current) => {
            if (current && selectedEditProduct.variants.some((item) => item.id === current)) {
                return current;
            }
            return selectedEditProduct.variants.length ? selectedEditProduct.variants[0].id : 0;
        });
    }, [selectedEditProduct]);

    useEffect(() => {
        if (!selectedEditVariant) {
            setUpdateVariantForm({
                sku: '',
                variantName: '',
                price: '',
                weightGrams: '',
                sizeLabel: '',
                stock: '',
            });
            return;
        }

        setUpdateVariantForm({
            sku: selectedEditVariant.sku || '',
            variantName: selectedEditVariant.variantName || '',
            price: selectedEditVariant.price !== null && selectedEditVariant.price !== undefined
                ? String(selectedEditVariant.price)
                : '',
            weightGrams: selectedEditVariant.weightGrams !== null && selectedEditVariant.weightGrams !== undefined
                ? String(selectedEditVariant.weightGrams)
                : '',
            sizeLabel: selectedEditVariant.sizeLabel || '',
            stock: String(selectedEditVariant.stock || 0),
        });
    }, [selectedEditVariant]);

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
        if (!editVariantId) {
            setVariantImages([]);
            setImageDrafts({});
            return;
        }
        refreshVariantImages(editVariantId);
    }, [editVariantId]);

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

    async function handleCreateCatalog(event: React.FormEvent) {
        event.preventDefault();
        try {
            if (createProductMode === 'existing') {
                const productId = Number(createSelectedProductId || 0);
                if (!productId) {
                    pushNotice('error', 'Selecciona un producto para agregar variante.');
                    return;
                }

                await createAdminCatalogVariant(productId, {
                    sku: createVariantForm.sku.trim(),
                    variantName: createVariantForm.variantName.trim() || null,
                    price: Number(createVariantForm.price),
                    initialStock: asIntegerOrZero(createVariantForm.initialStock),
                    weightGrams: asNumberOrNull(createVariantForm.weightGrams),
                    sizeLabel: createVariantForm.sizeLabel.trim() || null,
                });

                pushNotice('success', 'Variante creada en producto existente.');
            } else {
                let categoryId: number | null = null;
                if (createCategoryMode === 'existing') {
                    categoryId = createSelectedCategoryId ? Number(createSelectedCategoryId) : null;
                } else {
                    const createdCategory = await createAdminCatalogCategory({
                        name: createCategoryForm.name.trim(),
                        slug: createCategoryForm.slug.trim().toLowerCase(),
                        description: createCategoryForm.description.trim() || null,
                        isActive: createCategoryForm.isActive,
                    });
                    categoryId = createdCategory.data.id;
                }

                const created = await createAdminCatalogProduct({
                    categoryId,
                    name: createProductForm.name.trim(),
                    slug: createProductForm.slug.trim().toLowerCase(),
                    description: createProductForm.description.trim() || null,
                    isActive: createProductForm.isActive,
                    sku: createVariantForm.sku.trim(),
                    variantName: createVariantForm.variantName.trim() || null,
                    price: Number(createVariantForm.price),
                    initialStock: asIntegerOrZero(createVariantForm.initialStock),
                    weightGrams: asNumberOrNull(createVariantForm.weightGrams),
                    sizeLabel: createVariantForm.sizeLabel.trim() || null,
                });

                pushNotice(
                    'success',
                    `Producto creado: #${created.data.product.id}, variante ${created.data.variant.sku}.`
                );
            }

            setCreateCategoryForm({
                name: '',
                slug: '',
                description: '',
                isActive: true,
            });
            setCreateProductForm({
                name: '',
                slug: '',
                description: '',
                isActive: true,
            });
            setCreateVariantForm({
                sku: '',
                variantName: '',
                price: '',
                initialStock: '',
                weightGrams: '',
                sizeLabel: '',
            });
            setCreateSelectedProductId('');
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo completar creacion.');
        }
    }

    async function handleUpdateProduct(event: React.FormEvent) {
        event.preventDefault();
        if (!editProductId) {
            pushNotice('error', 'Selecciona un producto.');
            return;
        }

        try {
            await updateAdminCatalogProduct(editProductId, {
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

    async function handleUpdateVariant(event: React.FormEvent) {
        event.preventDefault();
        if (!editVariantId) {
            pushNotice('error', 'Selecciona una variante.');
            return;
        }

        try {
            await updateAdminCatalogVariant(editVariantId, {
                sku: updateVariantForm.sku.trim(),
                variantName: updateVariantForm.variantName.trim() || null,
                price: Number(updateVariantForm.price),
                weightGrams: asNumberOrNull(updateVariantForm.weightGrams),
                sizeLabel: updateVariantForm.sizeLabel.trim() || null,
            });
            await updateAdminCatalogVariantStock(editVariantId, asIntegerOrZero(updateVariantForm.stock));
            pushNotice('success', 'Variante y stock actualizados.');
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo actualizar variante.');
        }
    }

    async function handleDeleteByScope() {
        const categoryId = Number(editCategoryId || 0);
        if (editVariantId) {
            const confirmed = window.confirm(
                `Vas a eliminar solo la variante ${selectedEditVariant?.sku || `#${editVariantId}`}. Esta accion no se puede deshacer.`
            );
            if (!confirmed) {
                return;
            }
            await deleteAdminCatalogVariant(editVariantId);
            pushNotice('success', 'Variante eliminada.');
            await loadData();
            return;
        }

        if (editProductId) {
            const confirmed = window.confirm(
                `Vas a eliminar el producto ${selectedEditProduct?.name || `#${editProductId}`} con todas sus variantes.`
            );
            if (!confirmed) {
                return;
            }
            await deleteAdminCatalogProduct(editProductId);
            pushNotice('success', 'Producto eliminado con sus variantes.');
            await loadData();
            return;
        }

        if (categoryId) {
            const category = categories.find((item) => item.id === categoryId);
            const confirmed = window.confirm(
                `Vas a eliminar la categoria ${category ? category.name : `#${categoryId}`} y todo su arbol de catalogo.`
            );
            if (!confirmed) {
                return;
            }
            await deleteAdminCatalogCategory(categoryId);
            pushNotice('success', 'Categoria eliminada con su arbol de catalogo.');
            await loadData();
            return;
        }

        pushNotice('error', 'Selecciona categoria, producto o variante para eliminar.');
    }

    async function handleUploadVariantImage(event: React.FormEvent) {
        event.preventDefault();
        if (!editVariantId) {
            pushNotice('error', 'Selecciona una variante para subir imagenes.');
            return;
        }
        if (!uploadFile) {
            pushNotice('error', 'Selecciona un archivo de imagen.');
            return;
        }

        try {
            const presigned = await presignVariantImage(editVariantId, {
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

            await registerVariantImage(editVariantId, {
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
            await refreshVariantImages(editVariantId);
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo subir la imagen.');
        }
    }

    async function handleUpdateImage(imageId: number) {
        if (!editVariantId) {
            pushNotice('error', 'Selecciona una variante.');
            return;
        }

        const draft = imageDrafts[imageId] || { altText: '', sortOrder: '0' };
        try {
            await updateVariantImage(editVariantId, imageId, {
                altText: draft.altText.trim() || null,
                sortOrder: asIntegerOrZero(draft.sortOrder),
            });
            pushNotice('success', 'Imagen actualizada.');
            await refreshVariantImages(editVariantId);
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo actualizar imagen.');
        }
    }

    async function handleDeleteImage(imageId: number) {
        if (!editVariantId) {
            pushNotice('error', 'Selecciona una variante.');
            return;
        }
        try {
            await deleteVariantImage(editVariantId, imageId);
            pushNotice('success', 'Imagen eliminada.');
            await refreshVariantImages(editVariantId);
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo eliminar imagen.');
        }
    }

    async function handleCreateDiscount(event: React.FormEvent) {
        event.preventDefault();
        try {
            await createAdminDiscount({
                code: discountForm.code.trim(),
                percentage: Number(discountForm.percentage),
                isActive: discountForm.isActive,
                startsAt: discountForm.startsAt.trim() || null,
                expiresAt: discountForm.expiresAt.trim() || null,
                maxUses: discountForm.maxUses.trim() ? asIntegerOrZero(discountForm.maxUses) : null,
                minSubtotal: discountForm.minSubtotal.trim() ? Number(discountForm.minSubtotal) : null,
            });
            pushNotice('success', 'Codigo de descuento creado.');
            setDiscountForm({
                code: '',
                percentage: '',
                isActive: true,
                startsAt: '',
                expiresAt: '',
                maxUses: '',
                minSubtotal: '',
            });
            await loadData();
        } catch (err) {
            pushNotice('error', err instanceof Error ? err.message : 'No se pudo crear el descuento.');
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
                <p className="muted">Gestion de administradores, catalogo, variantes, imagenes y descuentos.</p>
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
                    <h2 className="card__title">Crear categoria/producto/variante</h2>
                    <form className="form" onSubmit={handleCreateCatalog}>
                        <div className="form__grid">
                            <label className="field">
                                <span className="field__label">Modo categoria</span>
                                <select
                                    className="field__input"
                                    value={createCategoryMode}
                                    onChange={(event) => setCreateCategoryMode(event.target.value as CategoryMode)}
                                >
                                    <option value="existing">Usar categoria existente</option>
                                    <option value="create">Crear nueva categoria</option>
                                </select>
                            </label>
                            <label className="field">
                                <span className="field__label">Modo producto</span>
                                <select
                                    className="field__input"
                                    value={createProductMode}
                                    onChange={(event) => setCreateProductMode(event.target.value as ProductMode)}
                                >
                                    <option value="create">Crear nuevo producto</option>
                                    <option value="existing">Usar producto existente</option>
                                </select>
                            </label>
                        </div>

                        {createCategoryMode === 'existing' ? (
                            <label className="field">
                                <span className="field__label">Categoria (creacion)</span>
                                <select
                                    className="field__input"
                                    value={createSelectedCategoryId}
                                    onChange={(event) => setCreateSelectedCategoryId(event.target.value)}
                                >
                                    <option value="">Sin categoria</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <>
                                <p className="field__label">Nueva categoria</p>
                                <div className="form__grid">
                                    <TextField
                                        label="Nombre categoria"
                                        value={createCategoryForm.name}
                                        onChange={(event) => setCreateCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                                        required
                                    />
                                    <TextField
                                        label="Slug categoria"
                                        value={createCategoryForm.slug}
                                        onChange={(event) => setCreateCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
                                        required
                                    />
                                </div>
                                <TextField
                                    label="Descripcion categoria"
                                    value={createCategoryForm.description}
                                    onChange={(event) => setCreateCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
                                />
                            </>
                        )}

                        {createProductMode === 'existing' ? (
                            <label className="field">
                                <span className="field__label">Producto existente (creacion)</span>
                                <select
                                    className="field__input"
                                    value={createSelectedProductId}
                                    onChange={(event) => setCreateSelectedProductId(event.target.value)}
                                >
                                    <option value="">Selecciona un producto</option>
                                    {createFilteredProducts.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.slug})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <>
                                <p className="field__label">Nuevo producto</p>
                                <div className="form__grid">
                                    <TextField
                                        label="Nombre producto"
                                        value={createProductForm.name}
                                        onChange={(event) => setCreateProductForm((prev) => ({ ...prev, name: event.target.value }))}
                                        required
                                    />
                                    <TextField
                                        label="Slug producto"
                                        value={createProductForm.slug}
                                        onChange={(event) => setCreateProductForm((prev) => ({ ...prev, slug: event.target.value }))}
                                        required
                                    />
                                </div>
                                <TextField
                                    label="Descripcion producto"
                                    value={createProductForm.description}
                                    onChange={(event) => setCreateProductForm((prev) => ({ ...prev, description: event.target.value }))}
                                />
                            </>
                        )}

                        <p className="field__label">Datos de variante</p>
                        <div className="form__grid">
                            <TextField
                                label="SKU variante"
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
                                label="Precio variante"
                                type="number"
                                min="0"
                                step="0.01"
                                value={createVariantForm.price}
                                onChange={(event) => setCreateVariantForm((prev) => ({ ...prev, price: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Stock inicial variante"
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
                            <Button type="submit">
                                {createProductMode === 'existing' ? 'Crear variante en producto existente' : 'Crear producto + variante'}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>

            <div className="admin-page__grid">
                <section className="card">
                    <h2 className="card__title">Editar variante de producto</h2>

                    <label className="field">
                        <span className="field__label">Categoria (edicion)</span>
                        <select
                            className="field__input"
                            value={editCategoryId}
                            onChange={(event) => setEditCategoryId(event.target.value)}
                        >
                            <option value="">Selecciona una categoria</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="field">
                        <span className="field__label">Producto (edicion)</span>
                        <select
                            className="field__input"
                            value={editProductId || ''}
                            onChange={(event) => setEditProductId(Number(event.target.value) || 0)}
                        >
                            <option value="">Selecciona un producto</option>
                            {filteredEditProducts.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.slug})
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="field">
                        <span className="field__label">Variante (edicion)</span>
                        <select
                            className="field__input"
                            value={editVariantId || ''}
                            onChange={(event) => setEditVariantId(Number(event.target.value) || 0)}
                        >
                            <option value="">Selecciona una variante</option>
                            {selectedEditProduct && selectedEditProduct.variants.map((item: AdminCatalogVariant) => (
                                <option key={item.id} value={item.id}>
                                    {item.sku} - {item.variantName || 'Sin nombre'}
                                </option>
                            ))}
                        </select>
                    </label>

                    <form className="form" onSubmit={handleUpdateProduct}>
                        <p className="field__label">Editar producto seleccionado</p>
                        <div className="form__grid">
                            <TextField
                                label="Nombre producto (edicion)"
                                value={updateProductForm.name}
                                onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, name: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Slug producto (edicion)"
                                value={updateProductForm.slug}
                                onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, slug: event.target.value }))}
                                required
                            />
                        </div>
                        <TextField
                            label="Descripcion producto (edicion)"
                            value={updateProductForm.description}
                            onChange={(event) => setUpdateProductForm((prev) => ({ ...prev, description: event.target.value }))}
                        />
                        <div className="form__actions">
                            <Button type="submit">Guardar producto</Button>
                        </div>
                    </form>

                    <form className="form" onSubmit={handleUpdateVariant}>
                        <p className="field__label">Editar variante seleccionada</p>
                        <div className="form__grid">
                            <TextField
                                label="SKU variante (edicion)"
                                value={updateVariantForm.sku}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, sku: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Nombre variante (edicion)"
                                value={updateVariantForm.variantName}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, variantName: event.target.value }))}
                            />
                        </div>
                        <div className="form__grid">
                            <TextField
                                label="Precio variante (edicion)"
                                type="number"
                                min="0"
                                step="0.01"
                                value={updateVariantForm.price}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, price: event.target.value }))}
                                required
                            />
                            <TextField
                                label="Stock variante (edicion)"
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
                                label="Peso variante (edicion)"
                                type="number"
                                min="0"
                                step="1"
                                value={updateVariantForm.weightGrams}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, weightGrams: event.target.value }))}
                            />
                            <TextField
                                label="Talla variante (edicion)"
                                value={updateVariantForm.sizeLabel}
                                onChange={(event) => setUpdateVariantForm((prev) => ({ ...prev, sizeLabel: event.target.value }))}
                            />
                        </div>
                        <div className="form__actions">
                            <Button type="submit">Guardar variante</Button>
                        </div>
                    </form>

                    <div className="form__actions">
                        <Button type="button" variant="danger" onClick={handleDeleteByScope}>
                            Eliminar por alcance
                        </Button>
                    </div>
                </section>

                <section className="card">
                    <h2 className="card__title">Imagenes de variante</h2>
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

            <section className="card">
                <h2 className="card__title">Codigos de descuento</h2>
                <p className="card__meta">Codigos activos e historicos: {discounts.length}</p>
                <div className="admin-list">
                    {discounts.map((discount) => (
                        <div className="admin-list__row" key={discount.id}>
                            <strong>{discount.code}</strong>
                            <span className="muted">
                                {discount.percentage}% | usados {discount.usedCount}
                                {discount.maxUses !== null ? `/${discount.maxUses}` : ''}
                            </span>
                        </div>
                    ))}
                </div>
                <form className="form" onSubmit={handleCreateDiscount}>
                    <div className="form__grid">
                        <TextField
                            label="Codigo descuento"
                            value={discountForm.code}
                            onChange={(event) => setDiscountForm((prev) => ({ ...prev, code: event.target.value }))}
                            required
                        />
                        <TextField
                            label="Porcentaje descuento"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={discountForm.percentage}
                            onChange={(event) => setDiscountForm((prev) => ({ ...prev, percentage: event.target.value }))}
                            required
                        />
                    </div>
                    <div className="form__grid">
                        <TextField
                            label="Min subtotal"
                            type="number"
                            min="0"
                            step="0.01"
                            value={discountForm.minSubtotal}
                            onChange={(event) => setDiscountForm((prev) => ({ ...prev, minSubtotal: event.target.value }))}
                        />
                        <TextField
                            label="Max usos"
                            type="number"
                            min="1"
                            step="1"
                            value={discountForm.maxUses}
                            onChange={(event) => setDiscountForm((prev) => ({ ...prev, maxUses: event.target.value }))}
                        />
                    </div>
                    <div className="form__grid">
                        <TextField
                            label="Inicio"
                            type="datetime-local"
                            value={discountForm.startsAt}
                            onChange={(event) => setDiscountForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                        />
                        <TextField
                            label="Expira"
                            type="datetime-local"
                            value={discountForm.expiresAt}
                            onChange={(event) => setDiscountForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                        />
                    </div>
                    <label className="field">
                        <span className="field__label">Activo</span>
                        <select
                            className="field__input"
                            value={discountForm.isActive ? '1' : '0'}
                            onChange={(event) => setDiscountForm((prev) => ({ ...prev, isActive: event.target.value === '1' }))}
                        >
                            <option value="1">Si</option>
                            <option value="0">No</option>
                        </select>
                    </label>
                    <div className="form__actions">
                        <Button type="submit">Crear descuento</Button>
                    </div>
                </form>
            </section>
        </section>
    );
}
