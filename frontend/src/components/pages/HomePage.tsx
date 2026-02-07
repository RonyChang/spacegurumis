import React, { useEffect, useMemo, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import {
    getCatalogVariantDetail,
    listCatalogVariants,
    type CatalogVariant,
    type CatalogVariantDetail,
} from '../../lib/api/catalog';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { getAuthToken } from '../../lib/session/authToken';
import { buildWhatsappProductMessage, buildWhatsappUrl } from '../../lib/whatsapp';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const CATALOG_PAGE_SIZE = 9;

export default function HomePage() {
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    const [variants, setVariants] = useState<CatalogVariant[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [detailStatus, setDetailStatus] = useState<'idle' | 'loading'>('idle');
    const [detailError, setDetailError] = useState('');
    const [selected, setSelected] = useState<CatalogVariantDetail | null>(null);

    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');

    async function loadVariants(nextPage: number) {
        setStatus('loading');
        setError('');
        try {
            const res = await listCatalogVariants(nextPage, CATALOG_PAGE_SIZE);
            setVariants(Array.isArray(res.data) ? res.data : []);
            const meta = res.meta || { page: nextPage, totalPages: 1 };
            setPage(Number.isFinite(Number(meta.page)) ? Number(meta.page) : nextPage);
            setTotalPages(
                Number.isFinite(Number(meta.totalPages)) && Number(meta.totalPages) > 0
                    ? Number(meta.totalPages)
                    : 1
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar el catálogo.');
        } finally {
            setStatus('idle');
        }
    }

    async function loadVariantDetail(sku: string) {
        setDetailStatus('loading');
        setDetailError('');
        setSelected(null);
        try {
            const res = await getCatalogVariantDetail(sku);
            setSelected(res.data || null);
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : 'Error al cargar el producto.');
        } finally {
            setDetailStatus('idle');
        }
    }

    async function handleAddToCart(variant: CatalogVariant | CatalogVariantDetail) {
        const sku = variant && variant.sku ? String(variant.sku) : '';
        if (!sku) {
            return;
        }

        setMessage('');

        const token = getAuthToken();
        if (!token) {
            const current = readGuestCart();
            const existing = current.find((item) => item.sku === sku);
            if (existing) {
                existing.quantity += 1;
            } else {
                current.push({
                    sku,
                    productName: variant.product && variant.product.name ? variant.product.name : 'Producto',
                    variantName: variant.variantName || null,
                    price: Number(variant.price) || 0,
                    quantity: 1,
                });
            }

            writeGuestCart(current);
            setMessageTone('success');
            setMessage('Producto agregado al carrito.');
            return;
        }

        try {
            await addCartItemApi(token, sku, 1);
            setMessageTone('success');
            setMessage('Producto agregado al carrito.');
        } catch (err) {
            setMessageTone('error');
            setMessage(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
        }
    }

    useEffect(() => {
        loadVariants(1);
    }, []);

    const detailWhatsappUrl = useMemo(() => {
        if (!selected) {
            return '';
        }

        const productName = formatVariantTitle(selected);
        const messageText = buildWhatsappProductMessage({ productName, sku: selected.sku });
        return buildWhatsappUrl(messageText);
    }, [selected]);

    return (
        <section className="surface page">
            <div className="page__header">
                <h1>Catálogo</h1>
                <p className="muted">Explora las variantes disponibles y agrega tus favoritos al carrito.</p>
            </div>

            {message ? <Alert tone={messageTone}>{message}</Alert> : null}
            {error ? <Alert tone="error">{error}</Alert> : null}

            {status === 'loading' ? <p className="status">Cargando catálogo...</p> : null}
            {status === 'idle' && !variants.length ? (
                <p className="status">No hay productos registrados.</p>
            ) : null}

            <div className="grid grid--cards catalog">
                {variants.map((variant) => (
                    <article className="card" key={variant.sku}>
                        <h3 className="card__title">{formatVariantTitle(variant)}</h3>
                        <p className="card__meta">SKU: {variant.sku}</p>
                        <p className="card__price">{formatPrice(variant.price)}</p>
                        <p className="card__meta">Stock disponible: {variant.stockAvailable}</p>

                        <div className="card__actions">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => loadVariantDetail(variant.sku)}
                            >
                                Ver detalle
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => handleAddToCart(variant)}
                            >
                                Agregar
                            </Button>
                        </div>
                    </article>
                ))}
            </div>

            {totalPages > 1 ? (
                <div className="pagination">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => loadVariants(page - 1)}
                        disabled={page <= 1 || status === 'loading'}
                    >
                        Anterior
                    </Button>
                    <span className="pagination__info">
                        Página {page} de {totalPages}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => loadVariants(page + 1)}
                        disabled={page >= totalPages || status === 'loading'}
                    >
                        Siguiente
                    </Button>
                </div>
            ) : null}

            <section className="detail">
                <h2>Detalle</h2>

                {detailError ? <Alert tone="error">{detailError}</Alert> : null}
                {detailStatus === 'loading' ? <p className="status">Cargando detalle...</p> : null}

                {detailStatus === 'idle' && selected ? (
                    <div className="detail__content">
                        <h3 className="detail__title">{formatVariantTitle(selected)}</h3>
                        <p className="muted">SKU: {selected.sku}</p>
                        <p className="detail__price">{formatPrice(selected.price)}</p>
                        <p>Stock disponible: {selected.stockAvailable}</p>
                        <p className="muted">
                            {selected.product && selected.product.description
                                ? selected.product.description
                                : 'Sin descripción'}
                        </p>

                        <div className="detail__actions">
                            <Button type="button" variant="primary" onClick={() => handleAddToCart(selected)}>
                                Agregar al carrito
                            </Button>
                            {detailWhatsappUrl ? (
                                <a
                                    className="button button--dark"
                                    href={detailWhatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Consultar por WhatsApp
                                </a>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <p className="status">Selecciona un producto para ver el detalle.</p>
                )}
            </section>
        </section>
    );
}
