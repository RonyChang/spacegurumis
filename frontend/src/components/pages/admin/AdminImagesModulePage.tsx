import React, { useEffect, useMemo, useState } from 'react';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import TextField from '../../ui/TextField';
import AdminGuard from '../../admin/AdminGuard';
import AdminShell from '../../admin/AdminShell';
import {
    deleteCategoryImage,
    deleteProductImage,
    deleteVariantImage,
    listAdminCatalogCategories,
    listAdminCatalogProducts,
    listCategoryImages,
    listProductImages,
    listVariantImages,
    presignCategoryImage,
    presignProductImage,
    presignVariantImage,
    registerCategoryImage,
    registerProductImage,
    registerVariantImage,
    updateCategoryImage,
    updateProductImage,
    updateVariantImage,
    type AdminCatalogCategory,
    type AdminCatalogProduct,
} from '../../../lib/api/admin';

type NoticeTone = 'info' | 'success' | 'error';
type ImageScope = 'none' | 'category' | 'product' | 'variant';

type ManagedImage = {
    id: number;
    scope: Exclude<ImageScope, 'none'>;
    publicUrl: string;
    altText: string | null;
    sortOrder: number;
};

function asIntegerOrZero(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }
    return Math.max(0, Math.round(parsed));
}

export default function AdminImagesModulePage() {
    const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
    const [products, setProducts] = useState<AdminCatalogProduct[]>([]);

    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');

    const [images, setImages] = useState<ManagedImage[]>([]);
    const [imageDrafts, setImageDrafts] = useState<Record<number, { altText: string; sortOrder: string }>>({});

    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadAltText, setUploadAltText] = useState('');
    const [uploadSortOrder, setUploadSortOrder] = useState('0');

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
                message: error instanceof Error ? error.message : 'No se pudo cargar catalogo para imagenes.',
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCatalog();
    }, []);

    const filteredProducts = useMemo(() => {
        if (!selectedCategoryId) {
            return [];
        }

        return products.filter((product) => product.category && String(product.category.id) === selectedCategoryId);
    }, [products, selectedCategoryId]);

    const selectedProduct = useMemo(
        () => filteredProducts.find((product) => String(product.id) === selectedProductId) || null,
        [filteredProducts, selectedProductId]
    );

    useEffect(() => {
        if (!selectedCategoryId) {
            setSelectedProductId('');
            setSelectedVariantId('');
            return;
        }

        if (selectedProductId && filteredProducts.some((product) => String(product.id) === selectedProductId)) {
            return;
        }

        setSelectedProductId('');
        setSelectedVariantId('');
    }, [selectedCategoryId, selectedProductId, filteredProducts]);

    useEffect(() => {
        if (!selectedProductId) {
            setSelectedVariantId('');
            return;
        }

        if (!selectedProduct) {
            setSelectedVariantId('');
            return;
        }

        if (selectedVariantId && selectedProduct.variants.some((variant) => String(variant.id) === selectedVariantId)) {
            return;
        }

        setSelectedVariantId('');
    }, [selectedProductId, selectedVariantId, selectedProduct]);

    const scope: ImageScope = useMemo(() => {
        if (!selectedCategoryId) {
            return 'none';
        }
        if (!selectedProductId) {
            return 'category';
        }
        if (!selectedVariantId) {
            return 'product';
        }
        return 'variant';
    }, [selectedCategoryId, selectedProductId, selectedVariantId]);

    async function refreshImages() {
        if (scope === 'none') {
            setImages([]);
            setImageDrafts({});
            return;
        }

        try {
            if (scope === 'category') {
                const categoryId = Number(selectedCategoryId);
                const res = await listCategoryImages(categoryId);
                const list = (Array.isArray(res.data) ? res.data : []).map((item) => ({
                    id: item.id,
                    scope: 'category' as const,
                    publicUrl: item.publicUrl,
                    altText: item.altText,
                    sortOrder: item.sortOrder,
                }));
                setImages(list);
            }

            if (scope === 'product') {
                const productId = Number(selectedProductId);
                const categoryId = Number(selectedCategoryId);
                const res = await listProductImages(productId, { categoryId });
                const list = (Array.isArray(res.data) ? res.data : []).map((item) => ({
                    id: item.id,
                    scope: 'product' as const,
                    publicUrl: item.publicUrl,
                    altText: item.altText,
                    sortOrder: item.sortOrder,
                }));
                setImages(list);
            }

            if (scope === 'variant') {
                const variantId = Number(selectedVariantId);
                const categoryId = Number(selectedCategoryId);
                const productId = Number(selectedProductId);
                const res = await listVariantImages(variantId, { categoryId, productId });
                const list = (Array.isArray(res.data) ? res.data : []).map((item) => ({
                    id: item.id,
                    scope: 'variant' as const,
                    publicUrl: item.publicUrl,
                    altText: item.altText,
                    sortOrder: item.sortOrder,
                }));
                setImages(list);
            }
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo listar imagenes del scope.',
            });
            setImages([]);
        }
    }

    useEffect(() => {
        refreshImages();
    }, [scope, selectedCategoryId, selectedProductId, selectedVariantId]);

    useEffect(() => {
        const drafts: Record<number, { altText: string; sortOrder: string }> = {};
        images.forEach((image) => {
            drafts[image.id] = {
                altText: image.altText || '',
                sortOrder: String(image.sortOrder ?? 0),
            };
        });
        setImageDrafts(drafts);
    }, [images]);

    async function handleUpload(event: React.FormEvent) {
        event.preventDefault();

        if (scope === 'none') {
            setNotice({ tone: 'error', message: 'Selecciona al menos una categoria.' });
            return;
        }

        if (!uploadFile) {
            setNotice({ tone: 'error', message: 'Selecciona un archivo de imagen.' });
            return;
        }

        try {
            const payload = {
                contentType: uploadFile.type,
                byteSize: uploadFile.size,
            };

            let uploadUrl = '';
            let imageKey = '';

            if (scope === 'category') {
                const categoryId = Number(selectedCategoryId);
                const presigned = await presignCategoryImage(categoryId, payload);
                uploadUrl = presigned.data.uploadUrl;
                imageKey = presigned.data.imageKey;
            }

            if (scope === 'product') {
                const productId = Number(selectedProductId);
                const categoryId = Number(selectedCategoryId);
                const presigned = await presignProductImage(productId, payload, { categoryId });
                uploadUrl = presigned.data.uploadUrl;
                imageKey = presigned.data.imageKey;
            }

            if (scope === 'variant') {
                const variantId = Number(selectedVariantId);
                const categoryId = Number(selectedCategoryId);
                const productId = Number(selectedProductId);
                const presigned = await presignVariantImage(variantId, payload, { categoryId, productId });
                uploadUrl = presigned.data.uploadUrl;
                imageKey = presigned.data.imageKey;
            }

            const putRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': uploadFile.type },
                body: uploadFile,
            });
            if (!putRes.ok) {
                throw new Error(`Fallo la subida a R2 (${putRes.status})`);
            }

            const registerPayload = {
                imageKey,
                contentType: uploadFile.type,
                byteSize: uploadFile.size,
                altText: uploadAltText.trim() || null,
                sortOrder: asIntegerOrZero(uploadSortOrder),
            };

            if (scope === 'category') {
                await registerCategoryImage(Number(selectedCategoryId), registerPayload);
            }

            if (scope === 'product') {
                await registerProductImage(Number(selectedProductId), registerPayload, {
                    categoryId: Number(selectedCategoryId),
                });
            }

            if (scope === 'variant') {
                await registerVariantImage(Number(selectedVariantId), registerPayload, {
                    categoryId: Number(selectedCategoryId),
                    productId: Number(selectedProductId),
                });
            }

            setUploadFile(null);
            setUploadAltText('');
            setUploadSortOrder('0');
            setNotice({ tone: 'success', message: 'Imagen subida y registrada.' });
            await refreshImages();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo subir imagen.',
            });
        }
    }

    async function handleUpdateImage(imageId: number) {
        const draft = imageDrafts[imageId] || { altText: '', sortOrder: '0' };

        try {
            if (scope === 'category') {
                await updateCategoryImage(Number(selectedCategoryId), imageId, {
                    altText: draft.altText.trim() || null,
                    sortOrder: asIntegerOrZero(draft.sortOrder),
                });
            }

            if (scope === 'product') {
                await updateProductImage(
                    Number(selectedProductId),
                    imageId,
                    {
                        altText: draft.altText.trim() || null,
                        sortOrder: asIntegerOrZero(draft.sortOrder),
                    },
                    { categoryId: Number(selectedCategoryId) }
                );
            }

            if (scope === 'variant') {
                await updateVariantImage(
                    Number(selectedVariantId),
                    imageId,
                    {
                        altText: draft.altText.trim() || null,
                        sortOrder: asIntegerOrZero(draft.sortOrder),
                    },
                    {
                        categoryId: Number(selectedCategoryId),
                        productId: Number(selectedProductId),
                    }
                );
            }

            setNotice({ tone: 'success', message: 'Imagen actualizada.' });
            await refreshImages();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo actualizar imagen.',
            });
        }
    }

    async function handleDeleteImage(imageId: number) {
        const message =
            scope === 'variant'
                ? 'Vas a eliminar una imagen de la galeria de variante.'
                : 'Vas a eliminar la imagen del scope seleccionado.';
        if (typeof window !== 'undefined') {
            const ok = window.confirm(message);
            if (!ok) {
                return;
            }
        }

        try {
            if (scope === 'category') {
                await deleteCategoryImage(Number(selectedCategoryId), imageId);
            }

            if (scope === 'product') {
                await deleteProductImage(Number(selectedProductId), imageId, { categoryId: Number(selectedCategoryId) });
            }

            if (scope === 'variant') {
                await deleteVariantImage(Number(selectedVariantId), imageId, {
                    categoryId: Number(selectedCategoryId),
                    productId: Number(selectedProductId),
                });
            }

            setNotice({ tone: 'success', message: 'Imagen eliminada.' });
            await refreshImages();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo eliminar imagen.',
            });
        }
    }

    async function handleDeleteAllVariantImages() {
        if (scope !== 'variant') {
            return;
        }

        if (!images.length) {
            setNotice({ tone: 'info', message: 'No hay imagenes para eliminar.' });
            return;
        }

        if (typeof window !== 'undefined') {
            const ok = window.confirm('Vas a eliminar toda la galeria de la variante seleccionada.');
            if (!ok) {
                return;
            }
        }

        try {
            for (const image of images) {
                await deleteVariantImage(Number(selectedVariantId), image.id, {
                    categoryId: Number(selectedCategoryId),
                    productId: Number(selectedProductId),
                });
            }
            setNotice({ tone: 'success', message: 'Galeria de variante eliminada.' });
            await refreshImages();
        } catch (error) {
            setNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'No se pudo eliminar galeria.',
            });
        }
    }

    return (
        <AdminGuard>
            <AdminShell
                title="Imagenes"
                description="Asigna imagenes por scope: categoria (1), producto (1) o variante (galeria)."
            >
                {notice ? <Alert tone={notice.tone}>{notice.message}</Alert> : null}
                {loading ? <p className="status">Cargando catalogo...</p> : null}

                <div className="admin-module-grid">
                    <section className="card">
                        <h2 className="card__title">Seleccion de scope</h2>
                        <div className="form__grid">
                            <label className="field">
                                <span className="field__label">Categoria</span>
                                <select
                                    className="field__input"
                                    value={selectedCategoryId}
                                    onChange={(event) => setSelectedCategoryId(event.target.value)}
                                >
                                    <option value="">Selecciona categoria</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="field">
                                <span className="field__label">Producto (opcional)</span>
                                <select
                                    className="field__input"
                                    value={selectedProductId}
                                    onChange={(event) => setSelectedProductId(event.target.value)}
                                    disabled={!selectedCategoryId}
                                >
                                    <option value="">(ninguno)</option>
                                    {filteredProducts.map((product) => (
                                        <option key={product.id} value={String(product.id)}>
                                            {product.name} ({product.slug})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="field">
                                <span className="field__label">Variante (opcional)</span>
                                <select
                                    className="field__input"
                                    value={selectedVariantId}
                                    onChange={(event) => setSelectedVariantId(event.target.value)}
                                    disabled={!selectedProduct}
                                >
                                    <option value="">(ninguna)</option>
                                    {selectedProduct
                                        ? selectedProduct.variants.map((variant) => (
                                              <option key={variant.id} value={String(variant.id)}>
                                                  {variant.sku}
                                                  {variant.variantName ? ` · ${variant.variantName}` : ''}
                                              </option>
                                          ))
                                        : null}
                                </select>
                            </label>
                        </div>

                        <p className="status">
                            Scope activo:{' '}
                            <strong>
                                {scope === 'none'
                                    ? 'sin seleccionar'
                                    : scope === 'category'
                                      ? 'categoria (imagen unica)'
                                      : scope === 'product'
                                        ? 'producto (imagen unica)'
                                        : 'variante (galeria multiple)'}
                            </strong>
                        </p>

                        <form className="form" onSubmit={handleUpload}>
                            <label className="field">
                                <span className="field__label">Archivo de imagen</span>
                                <input
                                    className="field__input"
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => setUploadFile(event.target.files && event.target.files[0] ? event.target.files[0] : null)}
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
                                    min={0}
                                    step="1"
                                    value={uploadSortOrder}
                                    onChange={(event) => setUploadSortOrder(event.target.value)}
                                />
                            </div>
                            <div className="form__actions">
                                <Button type="submit">Subir imagen</Button>
                            </div>
                        </form>

                        {(scope === 'category' || scope === 'product') && images.length ? (
                            <p className="status">Al registrar una nueva imagen en este scope, reemplaza la anterior.</p>
                        ) : null}
                    </section>

                    <section className="card">
                        <h2 className="card__title">Imagenes del scope</h2>
                        {!images.length ? <p className="status">No hay imagenes registradas para el scope actual.</p> : null}

                        <div className="admin-images">
                            {images.map((image) => (
                                <article className="admin-images__row" key={image.id}>
                                    <img src={image.publicUrl} alt={image.altText || 'Imagen de catalogo'} loading="lazy" />
                                    <div className="admin-images__meta">
                                        <TextField
                                            label="Alt text"
                                            value={imageDrafts[image.id]?.altText || ''}
                                            onChange={(event) =>
                                                setImageDrafts((prev) => ({
                                                    ...prev,
                                                    [image.id]: {
                                                        ...prev[image.id],
                                                        altText: event.target.value,
                                                    },
                                                }))
                                            }
                                        />
                                        <TextField
                                            label="Orden"
                                            type="number"
                                            min={0}
                                            step="1"
                                            value={imageDrafts[image.id]?.sortOrder || '0'}
                                            onChange={(event) =>
                                                setImageDrafts((prev) => ({
                                                    ...prev,
                                                    [image.id]: {
                                                        ...prev[image.id],
                                                        sortOrder: event.target.value,
                                                    },
                                                }))
                                            }
                                        />
                                        <div className="form__actions">
                                            <Button type="button" onClick={() => handleUpdateImage(image.id)}>
                                                Guardar metadatos
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="danger"
                                                onClick={() => handleDeleteImage(image.id)}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {scope === 'variant' && images.length ? (
                            <div className="form__actions">
                                <Button type="button" variant="danger" onClick={handleDeleteAllVariantImages}>
                                    Eliminar todas las imagenes de la variante
                                </Button>
                            </div>
                        ) : null}
                    </section>
                </div>
            </AdminShell>
        </AdminGuard>
    );
}
