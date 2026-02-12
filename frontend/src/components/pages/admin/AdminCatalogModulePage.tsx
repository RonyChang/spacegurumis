import React, { useEffect, useMemo, useState } from 'react';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import TextField from '../../ui/TextField';
import AdminGuard from '../../admin/AdminGuard';
import AdminShell from '../../admin/AdminShell';
import {
    createAdminCatalogCategory,
    createAdminCatalogProduct,
    createAdminCatalogVariant,
    deleteAdminCatalogCategory,
    deleteAdminCatalogProduct,
    deleteAdminCatalogVariant,
    listAdminCatalogCategories,
    listAdminCatalogProducts,
    updateAdminCatalogCategory,
    updateAdminCatalogProduct,
    updateAdminCatalogVariant,
    updateAdminCatalogVariantStock,
    type AdminCatalogCategory,
    type AdminCatalogProduct,
} from '../../../lib/api/admin';

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

export default function AdminCatalogModulePage() {
    const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
    const [products, setProducts] = useState<AdminCatalogProduct[]>([]);

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

    const [updateCategoryForm, setUpdateCategoryForm] = useState({
        name: '',
        slug: '',
        description: '',
        isActive: true,
    });

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

    async function loadCatalog() {
        setLoading(true);
        try {
            const [categoriesRes, productsRes] = await Promise.all([
                listAdminCatalogCategories(),
                listAdminCatalogProducts(),
            ]);
            setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
            setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudieron cargar datos de catalogo.',
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCatalog();
    }, []);

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

    const selectedEditCategory = useMemo(
        () => categories.find((category) => String(category.id) === editCategoryId) || null,
        [categories, editCategoryId]
    );

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
        if (!selectedEditCategory) {
            setUpdateCategoryForm({
                name: '',
                slug: '',
                description: '',
                isActive: true,
            });
            return;
        }

        setUpdateCategoryForm({
            name: selectedEditCategory.name || '',
            slug: selectedEditCategory.slug || '',
            description: selectedEditCategory.description || '',
            isActive: Boolean(selectedEditCategory.isActive),
        });
    }, [selectedEditCategory]);

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
            price:
                selectedEditVariant.price !== null && selectedEditVariant.price !== undefined
                    ? String(selectedEditVariant.price)
                    : '',
            weightGrams:
                selectedEditVariant.weightGrams !== null && selectedEditVariant.weightGrams !== undefined
                    ? String(selectedEditVariant.weightGrams)
                    : '',
            sizeLabel: selectedEditVariant.sizeLabel || '',
            stock: String(selectedEditVariant.stock || 0),
        });
    }, [selectedEditVariant]);

    async function handleCreateCatalog(event: React.FormEvent) {
        event.preventDefault();

        try {
            if (createProductMode === 'existing') {
                const productId = Number(createSelectedProductId || 0);
                if (!productId) {
                    setNotice({ tone: 'error', message: 'Selecciona un producto para agregar variante.' });
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

                setNotice({ tone: 'success', message: 'Variante creada en producto existente.' });
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

                const productId = created && created.data && created.data.product ? created.data.product.id : '?';
                setNotice({ tone: 'success', message: `Producto creado correctamente (#${productId}).` });
            }

            setCreateCategoryForm({ name: '', slug: '', description: '', isActive: true });
            setCreateProductForm({ name: '', slug: '', description: '', isActive: true });
            setCreateVariantForm({
                sku: '',
                variantName: '',
                price: '',
                initialStock: '',
                weightGrams: '',
                sizeLabel: '',
            });
            setCreateSelectedProductId('');
            await loadCatalog();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo completar creacion.',
            });
        }
    }

    async function handleUpdateCategory(event: React.FormEvent) {
        event.preventDefault();
        const categoryId = Number(editCategoryId || 0);
        if (!categoryId) {
            setNotice({ tone: 'error', message: 'Selecciona una categoria para editar.' });
            return;
        }

        try {
            await updateAdminCatalogCategory(categoryId, {
                name: updateCategoryForm.name.trim(),
                slug: updateCategoryForm.slug.trim().toLowerCase(),
                description: updateCategoryForm.description.trim() || null,
                isActive: updateCategoryForm.isActive,
            });
            setNotice({ tone: 'success', message: 'Categoria actualizada.' });
            await loadCatalog();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo actualizar categoria.',
            });
        }
    }

    async function handleUpdateProduct(event: React.FormEvent) {
        event.preventDefault();
        if (!editProductId) {
            setNotice({ tone: 'error', message: 'Selecciona un producto.' });
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
            setNotice({ tone: 'success', message: 'Producto actualizado.' });
            await loadCatalog();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo actualizar producto.',
            });
        }
    }

    async function handleUpdateVariant(event: React.FormEvent) {
        event.preventDefault();
        if (!editVariantId) {
            setNotice({ tone: 'error', message: 'Selecciona una variante.' });
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
            setNotice({ tone: 'success', message: 'Variante y stock actualizados.' });
            await loadCatalog();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo actualizar variante.',
            });
        }
    }

    async function handleDeleteByScope() {
        const categoryId = Number(editCategoryId || 0);

        try {
            if (editVariantId) {
                const confirmed =
                    typeof window === 'undefined'
                        ? true
                        : window.confirm(
                              `Vas a eliminar solo la variante ${selectedEditVariant?.sku || `#${editVariantId}`}.`
                          );
                if (!confirmed) {
                    return;
                }

                await deleteAdminCatalogVariant(editVariantId, {
                    categoryId: categoryId || undefined,
                    productId: editProductId || undefined,
                });
                setNotice({ tone: 'success', message: 'Variante eliminada.' });
                await loadCatalog();
                return;
            }

            if (editProductId) {
                const confirmed =
                    typeof window === 'undefined'
                        ? true
                        : window.confirm(
                              `Vas a eliminar el producto ${selectedEditProduct?.name || `#${editProductId}`} con todas sus variantes.`
                          );
                if (!confirmed) {
                    return;
                }

                await deleteAdminCatalogProduct(editProductId, { categoryId: categoryId || undefined });
                setNotice({ tone: 'success', message: 'Producto eliminado con sus variantes.' });
                await loadCatalog();
                return;
            }

            if (categoryId) {
                const category = categories.find((item) => item.id === categoryId);
                const confirmed =
                    typeof window === 'undefined'
                        ? true
                        : window.confirm(
                              `Vas a eliminar la categoria ${category ? category.name : `#${categoryId}`} y todo su arbol.`
                          );
                if (!confirmed) {
                    return;
                }

                await deleteAdminCatalogCategory(categoryId);
                setNotice({ tone: 'success', message: 'Categoria eliminada con su arbol.' });
                await loadCatalog();
                return;
            }

            setNotice({ tone: 'error', message: 'Selecciona categoria, producto o variante para eliminar.' });
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo completar eliminacion.',
            });
        }
    }

    return (
        <AdminGuard>
            <AdminShell
                title="Catalogo"
                description="Gestion unificada de categorias, productos y variantes con selectores encadenados."
            >
                {notice ? <Alert tone={notice.tone}>{notice.message}</Alert> : null}
                {loading ? <p className="status">Actualizando catalogo...</p> : null}

                <div className="admin-module-grid">
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
                                        onChange={(event) => {
                                            setCreateSelectedCategoryId(event.target.value);
                                            setCreateSelectedProductId('');
                                        }}
                                    >
                                        <option value="">Sin categoria</option>
                                        {categories.map((item) => (
                                            <option key={item.id} value={String(item.id)}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <>
                                    <TextField
                                        label="Nombre categoria"
                                        value={createCategoryForm.name}
                                        onChange={(event) =>
                                            setCreateCategoryForm((prev) => ({ ...prev, name: event.target.value }))
                                        }
                                        required={createCategoryMode === 'create'}
                                    />
                                    <TextField
                                        label="Slug categoria"
                                        value={createCategoryForm.slug}
                                        onChange={(event) =>
                                            setCreateCategoryForm((prev) => ({ ...prev, slug: event.target.value }))
                                        }
                                        required={createCategoryMode === 'create'}
                                    />
                                    <TextField
                                        label="Descripcion categoria"
                                        value={createCategoryForm.description}
                                        onChange={(event) =>
                                            setCreateCategoryForm((prev) => ({ ...prev, description: event.target.value }))
                                        }
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
                                        <option value="">Selecciona producto</option>
                                        {createFilteredProducts.map((item) => (
                                            <option key={item.id} value={String(item.id)}>
                                                {item.name} ({item.slug})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <>
                                    <TextField
                                        label="Nombre producto"
                                        value={createProductForm.name}
                                        onChange={(event) =>
                                            setCreateProductForm((prev) => ({ ...prev, name: event.target.value }))
                                        }
                                        required={createProductMode === 'create'}
                                    />
                                    <TextField
                                        label="Slug producto"
                                        value={createProductForm.slug}
                                        onChange={(event) =>
                                            setCreateProductForm((prev) => ({ ...prev, slug: event.target.value }))
                                        }
                                        required={createProductMode === 'create'}
                                    />
                                    <TextField
                                        label="Descripcion producto"
                                        value={createProductForm.description}
                                        onChange={(event) =>
                                            setCreateProductForm((prev) => ({ ...prev, description: event.target.value }))
                                        }
                                    />
                                </>
                            )}

                            <div className="form__grid">
                                <TextField
                                    label="SKU variante"
                                    value={createVariantForm.sku}
                                    onChange={(event) =>
                                        setCreateVariantForm((prev) => ({ ...prev, sku: event.target.value }))
                                    }
                                    required
                                />
                                <TextField
                                    label="Nombre variante"
                                    value={createVariantForm.variantName}
                                    onChange={(event) =>
                                        setCreateVariantForm((prev) => ({ ...prev, variantName: event.target.value }))
                                    }
                                />
                            </div>

                            <div className="form__grid">
                                <TextField
                                    label="Precio variante"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={createVariantForm.price}
                                    onChange={(event) =>
                                        setCreateVariantForm((prev) => ({ ...prev, price: event.target.value }))
                                    }
                                    required
                                />
                                <TextField
                                    label="Stock inicial variante"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={createVariantForm.initialStock}
                                    onChange={(event) =>
                                        setCreateVariantForm((prev) => ({ ...prev, initialStock: event.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div className="form__grid">
                                <TextField
                                    label="Peso (gramos)"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={createVariantForm.weightGrams}
                                    onChange={(event) =>
                                        setCreateVariantForm((prev) => ({ ...prev, weightGrams: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Talla"
                                    value={createVariantForm.sizeLabel}
                                    onChange={(event) =>
                                        setCreateVariantForm((prev) => ({ ...prev, sizeLabel: event.target.value }))
                                    }
                                />
                            </div>

                            <div className="form__actions">
                                <Button type="submit">
                                    {createProductMode === 'existing'
                                        ? 'Crear variante en producto existente'
                                        : 'Crear producto + variante'}
                                </Button>
                            </div>
                        </form>
                    </section>

                    <section className="card">
                        <h2 className="card__title">Editar y eliminar por alcance</h2>
                        <div className="form__grid">
                            <label className="field">
                                <span className="field__label">Categoria (edicion)</span>
                                <select
                                    className="field__input"
                                    value={editCategoryId}
                                    onChange={(event) => setEditCategoryId(event.target.value)}
                                >
                                    <option value="">Selecciona categoria</option>
                                    {categories.map((item) => (
                                        <option key={item.id} value={String(item.id)}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="field">
                                <span className="field__label">Producto (edicion)</span>
                                <select
                                    className="field__input"
                                    value={editProductId ? String(editProductId) : ''}
                                    onChange={(event) => setEditProductId(event.target.value ? Number(event.target.value) : 0)}
                                >
                                    <option value="">(ninguno)</option>
                                    {filteredEditProducts.map((item) => (
                                        <option key={item.id} value={String(item.id)}>
                                            {item.name} ({item.slug})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="field">
                                <span className="field__label">Variante (edicion)</span>
                                <select
                                    className="field__input"
                                    value={editVariantId ? String(editVariantId) : ''}
                                    onChange={(event) => setEditVariantId(event.target.value ? Number(event.target.value) : 0)}
                                >
                                    <option value="">(ninguna)</option>
                                    {selectedEditProduct
                                        ? selectedEditProduct.variants.map((variant) => (
                                              <option key={variant.id} value={String(variant.id)}>
                                                  {variant.sku}
                                                  {variant.variantName ? ` · ${variant.variantName}` : ''}
                                              </option>
                                          ))
                                        : null}
                                </select>
                            </label>
                        </div>

                        <form className="form" onSubmit={handleUpdateCategory}>
                            <h3>Editar categoria</h3>
                            <div className="form__grid">
                                <TextField
                                    label="Nombre categoria"
                                    value={updateCategoryForm.name}
                                    onChange={(event) =>
                                        setUpdateCategoryForm((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Slug categoria"
                                    value={updateCategoryForm.slug}
                                    onChange={(event) =>
                                        setUpdateCategoryForm((prev) => ({ ...prev, slug: event.target.value }))
                                    }
                                />
                            </div>
                            <TextField
                                label="Descripcion categoria"
                                value={updateCategoryForm.description}
                                onChange={(event) =>
                                    setUpdateCategoryForm((prev) => ({ ...prev, description: event.target.value }))
                                }
                            />
                            <div className="form__actions">
                                <Button type="submit">Actualizar categoria</Button>
                            </div>
                        </form>

                        <form className="form" onSubmit={handleUpdateProduct}>
                            <h3>Editar producto</h3>
                            <div className="form__grid">
                                <TextField
                                    label="Nombre producto"
                                    value={updateProductForm.name}
                                    onChange={(event) =>
                                        setUpdateProductForm((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Slug producto"
                                    value={updateProductForm.slug}
                                    onChange={(event) =>
                                        setUpdateProductForm((prev) => ({ ...prev, slug: event.target.value }))
                                    }
                                />
                            </div>
                            <TextField
                                label="Descripcion producto"
                                value={updateProductForm.description}
                                onChange={(event) =>
                                    setUpdateProductForm((prev) => ({ ...prev, description: event.target.value }))
                                }
                            />
                            <div className="form__actions">
                                <Button type="submit">Actualizar producto</Button>
                            </div>
                        </form>

                        <form className="form" onSubmit={handleUpdateVariant}>
                            <h3>Editar variante</h3>
                            <div className="form__grid">
                                <TextField
                                    label="SKU variante"
                                    value={updateVariantForm.sku}
                                    onChange={(event) =>
                                        setUpdateVariantForm((prev) => ({ ...prev, sku: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Nombre variante"
                                    value={updateVariantForm.variantName}
                                    onChange={(event) =>
                                        setUpdateVariantForm((prev) => ({ ...prev, variantName: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form__grid">
                                <TextField
                                    label="Precio"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={updateVariantForm.price}
                                    onChange={(event) =>
                                        setUpdateVariantForm((prev) => ({ ...prev, price: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Stock"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={updateVariantForm.stock}
                                    onChange={(event) =>
                                        setUpdateVariantForm((prev) => ({ ...prev, stock: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form__grid">
                                <TextField
                                    label="Peso (gramos)"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={updateVariantForm.weightGrams}
                                    onChange={(event) =>
                                        setUpdateVariantForm((prev) => ({ ...prev, weightGrams: event.target.value }))
                                    }
                                />
                                <TextField
                                    label="Talla"
                                    value={updateVariantForm.sizeLabel}
                                    onChange={(event) =>
                                        setUpdateVariantForm((prev) => ({ ...prev, sizeLabel: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form__actions">
                                <Button type="submit">Actualizar variante</Button>
                                <Button type="button" variant="danger" onClick={handleDeleteByScope}>
                                    Eliminar por alcance
                                </Button>
                            </div>
                        </form>
                    </section>
                </div>
            </AdminShell>
        </AdminGuard>
    );
}
