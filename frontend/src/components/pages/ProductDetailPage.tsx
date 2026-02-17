import React, { useEffect, useMemo, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import {
    getCatalogProductDetail,
    getCatalogVariantDetail,
    type CatalogProductDetail,
    type CatalogVariantDetail,
} from '../../lib/api/catalog';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import { buildWhatsappProductMessage, buildWhatsappUrl } from '../../lib/whatsapp';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

type ProductDetailPageProps = {
    slug: string;
    initialData?: ProductDetailInitialData | null;
};

export type ProductDetailInitialData = {
    product: CatalogProductDetail;
    selectedSku: string;
    selectedVariant: CatalogVariantDetail | null;
};

function imgErrorToPlaceholder(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === '1') {
        return;
    }
    img.dataset.fallbackApplied = '1';
    img.src = '/placeholder-product.svg';
}

function getUrlSkuParam() {
    if (typeof window === 'undefined') {
        return '';
    }

    const raw = new URLSearchParams(window.location.search).get('sku');
    return raw ? raw.trim() : '';
}

function updateUrlSkuParam(sku: string) {
    if (typeof window === 'undefined') {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    if (sku) {
        params.set('sku', sku);
    } else {
        params.delete('sku');
    }

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
}

function pickInitialSku(product: CatalogProductDetail, requestedSku = '') {
    const requested = requestedSku.trim();
    const availableSkus = new Set(
        (Array.isArray(product.variants) ? product.variants : [])
            .map((item) => String(item && item.sku ? item.sku : '').trim())
            .filter(Boolean)
    );

    if (requested && availableSkus.has(requested)) {
        return requested;
    }

    return product.variants && product.variants.length ? String(product.variants[0].sku) : '';
}

function getVariantSummary(product: CatalogProductDetail | null, sku: string) {
    if (!product || !sku || !Array.isArray(product.variants)) {
        return null;
    }

    return product.variants.find((item) => String(item.sku) === sku) || null;
}

export default function ProductDetailPage({
    slug,
    initialData = null,
}: ProductDetailPageProps) {
    const initialProduct = initialData && initialData.product && String(initialData.product.slug) === slug
        ? initialData.product
        : null;
    const initialSelectedSku = initialProduct
        ? pickInitialSku(initialProduct, initialData && initialData.selectedSku ? initialData.selectedSku : '')
        : '';
    const initialSelectedVariant =
        initialData
        && initialData.selectedVariant
        && String(initialData.selectedVariant.sku) === initialSelectedSku
            ? initialData.selectedVariant
            : null;

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [product, setProduct] = useState<CatalogProductDetail | null>(initialProduct);

    const [selectedSku, setSelectedSku] = useState(initialSelectedSku);
    const [variantStatus, setVariantStatus] = useState<'idle' | 'loading'>('idle');
    const [variantError, setVariantError] = useState('');
    const [selectedVariant, setSelectedVariant] = useState<CatalogVariantDetail | null>(initialSelectedVariant);

    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');

    async function loadProduct() {
        setStatus('loading');
        setError('');
        setProduct(null);
        setSelectedVariant(null);
        setSelectedSku('');

        try {
            const res = await getCatalogProductDetail(slug);
            const item = res.data || null;
            setProduct(item);
            if (item) {
                setSelectedSku(pickInitialSku(item, getUrlSkuParam()));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo cargar el producto.');
        } finally {
            setStatus('idle');
        }
    }

    async function loadVariant(sku: string) {
        if (!sku) {
            setVariantError('');
            setSelectedVariant(null);
            return;
        }

        setVariantStatus('loading');
        setVariantError('');
        try {
            const res = await getCatalogVariantDetail(sku);
            setSelectedVariant(res.data || null);
        } catch (err) {
            setVariantError(err instanceof Error ? err.message : 'No se pudo cargar la variante.');
            setSelectedVariant(null);
        } finally {
            setVariantStatus('idle');
        }
    }

    async function handleAddToCart() {
        const sku = selectedVariant && selectedVariant.sku ? String(selectedVariant.sku) : '';
        if (!sku) {
            return;
        }

        setMessage('');

        try {
            await addCartItemApi(sku, 1);
            setMessageTone('success');
            setMessage('Producto agregado al carrito.');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                const current = readGuestCart();
                const existing = current.find((item) => item.sku === sku);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    current.push({
                        sku,
                        productName:
                            selectedVariant.product && selectedVariant.product.name
                                ? selectedVariant.product.name
                                : product && product.name
                                    ? product.name
                                    : 'Producto',
                        variantName: selectedVariant.variantName || null,
                        price: Number(selectedVariant.price) || 0,
                        quantity: 1,
                    });
                }

                writeGuestCart(current);
                setMessageTone('success');
                setMessage('Producto agregado al carrito.');
                return;
            }

            setMessageTone('error');
            setMessage(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
        }
    }

    useEffect(() => {
        if (initialProduct) {
            setStatus('idle');
            setError('');
            setProduct(initialProduct);
            setSelectedSku(initialSelectedSku);
            setVariantStatus('idle');
            setVariantError('');
            setSelectedVariant(initialSelectedVariant);
            return;
        }

        loadProduct();
    }, [initialProduct, initialSelectedSku, initialSelectedVariant, slug]);

    useEffect(() => {
        if (!selectedSku) {
            return;
        }

        updateUrlSkuParam(selectedSku);
        if (selectedVariant && String(selectedVariant.sku) === selectedSku) {
            return;
        }
        loadVariant(selectedSku);
    }, [selectedSku, selectedVariant]);

    const selectedSummary = useMemo(
        () => getVariantSummary(product, selectedSku),
        [product, selectedSku]
    );

    const gallery = useMemo(() => {
        const variantImages = selectedVariant && Array.isArray(selectedVariant.images)
            ? selectedVariant.images.filter((item) => item && item.url)
            : [];
        if (variantImages.length) {
            return variantImages;
        }

        const productImages = product && Array.isArray(product.images)
            ? product.images.filter((item) => item && item.url)
            : [];
        if (productImages.length) {
            return productImages;
        }

        return [{ url: '/placeholder-product.svg', altText: null, sortOrder: 0 }];
    }, [product, selectedVariant]);

    const variantTitle = useMemo(() => {
        if (selectedVariant) {
            return formatVariantTitle(selectedVariant);
        }

        if (product) {
            const summaryName = selectedSummary && selectedSummary.variantName
                ? `${product.name} - ${selectedSummary.variantName}`
                : product.name;
            return summaryName;
        }

        return 'Producto';
    }, [product, selectedSummary, selectedVariant]);

    const whatsappUrl = useMemo(() => {
        const sku = selectedVariant && selectedVariant.sku ? selectedVariant.sku : selectedSku;
        const messageText = buildWhatsappProductMessage({
            productName: variantTitle,
            sku: sku || '',
        });
        return buildWhatsappUrl(messageText);
    }, [selectedSku, selectedVariant, variantTitle]);

    return (
        <section className="surface page detail-page">
            <div className="page__header">
                <h1>Detalle de producto</h1>
                {product ? <p className="muted">{product.name}</p> : null}
            </div>

            {error ? <Alert tone="error">{error}</Alert> : null}
            {status === 'loading' ? <p className="status">Cargando producto...</p> : null}

            {product ? (
                <div className="detail-page__content">
                    <div className="gallery">
                        <div className="gallery__main">
                            <img
                                src={gallery[0].url}
                                alt={gallery[0].altText || variantTitle}
                                loading="lazy"
                                decoding="async"
                                onError={imgErrorToPlaceholder}
                            />
                        </div>
                        {gallery.length > 1 ? (
                            <div className="gallery__thumbs">
                                {gallery.map((image) => (
                                    <img
                                        key={`${image.url}-${image.sortOrder}`}
                                        className="gallery__thumb"
                                        src={image.url}
                                        alt={image.altText || variantTitle}
                                        loading="lazy"
                                        decoding="async"
                                        onError={imgErrorToPlaceholder}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="detail-page__info">
                        <h2 className="detail__title">{variantTitle}</h2>
                        <p className="card__meta">Slug: {product.slug}</p>
                        {selectedSku ? <p className="card__meta">SKU: {selectedSku}</p> : null}
                        <p className="detail__price">
                            {formatPrice(
                                selectedVariant && selectedVariant.price !== null
                                    ? selectedVariant.price
                                    : selectedSummary && selectedSummary.price !== null
                                        ? selectedSummary.price
                                        : null
                            )}
                        </p>
                        <p>
                            Stock disponible:{' '}
                            {selectedVariant
                                ? selectedVariant.stockAvailable
                                : selectedSummary
                                    ? selectedSummary.stockAvailable
                                    : 0}
                        </p>
                        <p className="muted">{product.description || 'Sin descripcion'}</p>

                        {Array.isArray(product.variants) && product.variants.length ? (
                            <div className="detail-page__variants">
                                <p className="field__label">Variantes</p>
                                <div className="detail-page__variant-list">
                                    {product.variants.map((item) => (
                                        <button
                                            key={item.sku}
                                            type="button"
                                            className={[
                                                'button',
                                                'button--ghost',
                                                String(item.sku) === selectedSku ? 'detail-page__variant--active' : '',
                                            ].filter(Boolean).join(' ')}
                                            onClick={() => setSelectedSku(String(item.sku))}
                                        >
                                            {item.variantName || item.sku}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {variantError ? <Alert tone="error">{variantError}</Alert> : null}
                        {variantStatus === 'loading' ? (
                            <p className="status">Cargando variante seleccionada...</p>
                        ) : null}

                        {message ? <Alert tone={messageTone}>{message}</Alert> : null}
                        <div className="detail__actions">
                            <Button type="button" variant="primary" onClick={handleAddToCart}>
                                Agregar al carrito
                            </Button>
                            {whatsappUrl ? (
                                <a
                                    className="button button--whatsapp"
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Consultar por WhatsApp
                                </a>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
