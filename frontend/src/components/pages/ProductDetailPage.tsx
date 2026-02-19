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
import { buildCatalogImageDeliveryUrl } from '../../lib/media/imageDelivery';
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

type GalleryImage = {
    originalUrl: string;
    detailUrl: string;
    detailFallbackUrl: string;
    thumbUrl: string;
    thumbFallbackUrl: string;
    altText: string | null;
    sortOrder: number | null;
};

const PLACEHOLDER_IMAGE_URL = '/placeholder-product.svg';

function toAbsoluteImageUrl(url: string): string {
    try {
        if (typeof window === 'undefined') {
            return new URL(url, 'http://localhost').toString();
        }
        return new URL(url, window.location.href).toString();
    } catch {
        return url;
    }
}

function sameImageUrl(left: string, right: string): boolean {
    return toAbsoluteImageUrl(left) === toAbsoluteImageUrl(right);
}

function imgErrorToPlaceholder(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === '1') {
        return;
    }
    img.dataset.fallbackApplied = '1';
    img.src = PLACEHOLDER_IMAGE_URL;
}

function pickPreferredUrl(source: unknown): string {
    if (typeof source !== 'string') {
        return '';
    }

    const value = source.trim();
    return value || '';
}

function handleGalleryImageError(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    const secondaryUrl = img.dataset.fallbackSecondary || '';
    const originalUrl = img.dataset.fallbackOriginal || '';
    const currentStage = img.dataset.fallbackStage || 'original';

    if (currentStage === 'transform' && secondaryUrl && !sameImageUrl(img.src, secondaryUrl)) {
        img.dataset.fallbackStage = 'transform-secondary';
        img.src = secondaryUrl;
        return;
    }

    if (
        (currentStage === 'transform' || currentStage === 'transform-secondary')
        && originalUrl
        && !sameImageUrl(img.src, originalUrl)
    ) {
        img.dataset.fallbackStage = 'original';
        img.src = originalUrl;
        return;
    }

    if (currentStage !== 'placeholder' && !sameImageUrl(img.src, PLACEHOLDER_IMAGE_URL)) {
        img.dataset.fallbackStage = 'placeholder';
        img.src = PLACEHOLDER_IMAGE_URL;
        return;
    }

    img.dataset.fallbackStage = 'done';
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

function normalizeQuantity(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }
    return Math.floor(value);
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
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);

    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');

    async function loadProduct() {
        setStatus('loading');
        setError('');
        setProduct(null);
        setSelectedVariant(null);
        setSelectedSku('');
        setSelectedImageIndex(0);

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
        const sku = selectedVariant && selectedVariant.sku ? String(selectedVariant.sku) : selectedSku;
        if (!sku) {
            return;
        }

        const safeQuantity = normalizeQuantity(quantity);
        setMessage('');

        try {
            await addCartItemApi(sku, safeQuantity);
            setMessageTone('success');
            setMessage('Producto agregado al carrito.');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                const current = readGuestCart();
                const existing = current.find((item) => item.sku === sku);
                if (existing) {
                    existing.quantity += safeQuantity;
                } else {
                    current.push({
                        sku,
                        productName:
                            selectedVariant && selectedVariant.product && selectedVariant.product.name
                                ? selectedVariant.product.name
                                : product && product.name
                                    ? product.name
                                    : 'Producto',
                        variantName: selectedVariant && selectedVariant.variantName ? selectedVariant.variantName : null,
                        price: Number(selectedVariant && selectedVariant.price !== null
                            ? selectedVariant.price
                            : getVariantSummary(product, sku)?.price || 0),
                        quantity: safeQuantity,
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
            setSelectedImageIndex(0);
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

    const gallery = useMemo<GalleryImage[]>(() => {
        const hasSelectedVariant = Boolean(selectedVariant && selectedVariant.sku);
        const variantImages = selectedVariant && Array.isArray(selectedVariant.images)
            ? selectedVariant.images.filter((item) => item && item.url)
            : [];
        if (variantImages.length) {
            return variantImages.map((image) => ({
                originalUrl: image.url,
                detailUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.detail)
                    || buildCatalogImageDeliveryUrl(image.url, 'detail'),
                detailFallbackUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.detail)
                    ? buildCatalogImageDeliveryUrl(image.url, 'detail')
                    : '',
                thumbUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.thumb)
                    || buildCatalogImageDeliveryUrl(image.url, 'thumb'),
                thumbFallbackUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.thumb)
                    ? buildCatalogImageDeliveryUrl(image.url, 'thumb')
                    : '',
                altText: image.altText || null,
                sortOrder: image.sortOrder ?? null,
            }));
        }

        // En detalle de variante, no reutilizar imagenes de producto si la variante no tiene galeria.
        if (hasSelectedVariant) {
            return [{
                originalUrl: PLACEHOLDER_IMAGE_URL,
                detailUrl: PLACEHOLDER_IMAGE_URL,
                detailFallbackUrl: '',
                thumbUrl: PLACEHOLDER_IMAGE_URL,
                thumbFallbackUrl: '',
                altText: null,
                sortOrder: 0,
            }];
        }

        const productImages = product && Array.isArray(product.images)
            ? product.images.filter((item) => item && item.url)
            : [];
        if (productImages.length) {
            return productImages.map((image) => ({
                originalUrl: image.url,
                detailUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.detail)
                    || buildCatalogImageDeliveryUrl(image.url, 'detail'),
                detailFallbackUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.detail)
                    ? buildCatalogImageDeliveryUrl(image.url, 'detail')
                    : '',
                thumbUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.thumb)
                    || buildCatalogImageDeliveryUrl(image.url, 'thumb'),
                thumbFallbackUrl: pickPreferredUrl(image.deliveryUrls && image.deliveryUrls.thumb)
                    ? buildCatalogImageDeliveryUrl(image.url, 'thumb')
                    : '',
                altText: image.altText || null,
                sortOrder: image.sortOrder ?? null,
            }));
        }

        return [{
            originalUrl: PLACEHOLDER_IMAGE_URL,
            detailUrl: PLACEHOLDER_IMAGE_URL,
            detailFallbackUrl: '',
            thumbUrl: PLACEHOLDER_IMAGE_URL,
            thumbFallbackUrl: '',
            altText: null,
            sortOrder: 0,
        }];
    }, [product, selectedVariant]);

    useEffect(() => {
        setSelectedImageIndex(0);
    }, [selectedSku]);

    const normalizedSelectedImageIndex = useMemo(() => {
        if (!gallery.length) {
            return 0;
        }

        const maxIndex = gallery.length - 1;
        if (selectedImageIndex < 0) {
            return maxIndex;
        }

        if (selectedImageIndex > maxIndex) {
            return 0;
        }

        return selectedImageIndex;
    }, [gallery.length, selectedImageIndex]);

    const galleryHasMultipleImages = gallery.length > 1;

    const selectPreviousImage = () => {
        if (!galleryHasMultipleImages) {
            return;
        }

        setSelectedImageIndex((current) => {
            if (current <= 0) {
                return gallery.length - 1;
            }
            return current - 1;
        });
    };

    const selectNextImage = () => {
        if (!galleryHasMultipleImages) {
            return;
        }

        setSelectedImageIndex((current) => {
            if (current >= gallery.length - 1) {
                return 0;
            }
            return current + 1;
        });
    };

    const handleMainGalleryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!galleryHasMultipleImages) {
            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            selectPreviousImage();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            selectNextImage();
        }
    };

    const currentImage = gallery[normalizedSelectedImageIndex] || gallery[0];
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

    const currentPrice = selectedVariant && selectedVariant.price !== null
        ? selectedVariant.price
        : selectedSummary && selectedSummary.price !== null
            ? selectedSummary.price
            : null;
    const currentStock = selectedVariant
        ? selectedVariant.stockAvailable
        : selectedSummary
            ? selectedSummary.stockAvailable
            : 0;

    const whatsappUrl = useMemo(() => {
        const sku = selectedVariant && selectedVariant.sku ? selectedVariant.sku : selectedSku;
        const messageText = buildWhatsappProductMessage({
            productName: variantTitle,
            sku: sku || '',
        });
        return buildWhatsappUrl(messageText);
    }, [selectedSku, selectedVariant, variantTitle]);

    const relatedVariants = useMemo(() => {
        if (!product || !Array.isArray(product.variants)) {
            return [];
        }

        return product.variants
            .filter((variant) => String(variant.sku) !== String(selectedSku))
            .slice(0, 4)
            .map((variant) => ({
                sku: String(variant.sku),
                label: variant.variantName || product.name,
                price: variant.price,
                href: `/products/${encodeURIComponent(product.slug)}?sku=${encodeURIComponent(String(variant.sku))}`,
            }));
    }, [product, selectedSku]);

    return (
        <section className="surface page storefront-shell detail-shell">
            <nav className="detail-shell__breadcrumb" aria-label="Breadcrumb">
                <a href="/" data-nav-prefetch>Inicio</a>
                <span>/</span>
                <a href="/shop" data-nav-prefetch>Tienda</a>
                <span>/</span>
                <span>{product ? product.name : 'Detalle'}</span>
            </nav>

            {error ? <Alert tone="error">{error}</Alert> : null}
            {status === 'loading' ? <p className="status">Cargando producto...</p> : null}

            {product ? (
                <div className="detail-shell__grid">
                    <div className="detail-shell__media panel-card">
                        <div className="gallery">
                            <div
                                className="gallery__main"
                                tabIndex={galleryHasMultipleImages ? 0 : -1}
                                onKeyDown={handleMainGalleryKeyDown}
                                aria-label={
                                    galleryHasMultipleImages
                                        ? `Galeria de imagenes (${normalizedSelectedImageIndex + 1} de ${gallery.length})`
                                        : undefined
                                }
                            >
                                {galleryHasMultipleImages ? (
                                    <>
                                        <button
                                            type="button"
                                            className="gallery__control gallery__control--prev"
                                            aria-label="Imagen anterior"
                                            onClick={selectPreviousImage}
                                        >
                                            <span aria-hidden="true">&lsaquo;</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="gallery__control gallery__control--next"
                                            aria-label="Imagen siguiente"
                                            onClick={selectNextImage}
                                        >
                                            <span aria-hidden="true">&rsaquo;</span>
                                        </button>
                                    </>
                                ) : null}
                                <img
                                    src={currentImage.detailUrl}
                                    alt={currentImage.altText || variantTitle}
                                    loading="eager"
                                    decoding="async"
                                    data-fallback-secondary={currentImage.detailFallbackUrl}
                                    data-fallback-original={currentImage.originalUrl}
                                    data-fallback-stage={
                                        currentImage.detailUrl !== currentImage.originalUrl
                                            ? 'transform'
                                            : 'original'
                                    }
                                    onError={handleGalleryImageError}
                                />
                            </div>
                            {gallery.length > 1 ? (
                                <div className="gallery__thumbs">
                                    {gallery.map((image, index) => (
                                        <button
                                            key={`${image.originalUrl}-${image.sortOrder}`}
                                            type="button"
                                            className={`gallery__thumb ${index === normalizedSelectedImageIndex ? 'gallery__thumb--active' : ''}`}
                                            onClick={() => setSelectedImageIndex(index)}
                                            aria-label={`Imagen ${index + 1} de ${gallery.length}`}
                                        >
                                            <img
                                                src={image.thumbUrl}
                                                alt={image.altText || variantTitle}
                                                loading="lazy"
                                                decoding="async"
                                                data-fallback-secondary={image.thumbFallbackUrl}
                                                data-fallback-original={image.originalUrl}
                                                data-fallback-stage={
                                                    image.thumbUrl !== image.originalUrl
                                                        ? 'transform'
                                                        : 'original'
                                                }
                                                onError={handleGalleryImageError}
                                            />
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="detail-shell__summary">
                        <article className="panel-card detail-summary">
                            <h1 className="detail__title">{variantTitle}</h1>
                            <p className="detail__price">{formatPrice(currentPrice)}</p>
                            <p className="card__meta">SKU: {selectedSku || 'Sin SKU'}</p>
                            <p className="card__meta">Stock disponible: {currentStock}</p>
                            <p className="muted">{product.description || 'Sin descripcion disponible.'}</p>

                            {Array.isArray(product.variants) && product.variants.length ? (
                                <div className="detail-page__variants">
                                    <p className="field__label">Variantes</p>
                                    <div className="detail-page__variant-list">
                                        {product.variants.map((item) => (
                                            <button
                                                key={item.sku}
                                                type="button"
                                                className={[
                                                    'chip',
                                                    String(item.sku) === selectedSku ? 'chip--active' : '',
                                                ].filter(Boolean).join(' ')}
                                                onClick={() => setSelectedSku(String(item.sku))}
                                            >
                                                {item.variantName || item.sku}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="detail-summary__quantity">
                                <p className="field__label">Cantidad</p>
                                <div className="qty-control">
                                    <button
                                        type="button"
                                        className="button button--ghost"
                                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                                        aria-label="Reducir cantidad"
                                    >
                                        -
                                    </button>
                                    <input
                                        className="field__input qty-control__input"
                                        type="number"
                                        min={1}
                                        value={quantity}
                                        onChange={(event) => setQuantity(normalizeQuantity(Number(event.target.value)))}
                                    />
                                    <button
                                        type="button"
                                        className="button button--ghost"
                                        onClick={() => setQuantity((current) => normalizeQuantity(current + 1))}
                                        aria-label="Aumentar cantidad"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

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
                        </article>

                        <article className="panel-card detail-facts">
                            <h2>Dato curioso</h2>
                            <p>
                                Cada Spacegurumi se teje a mano y puede tener ligeras variaciones unicas en textura y expresion.
                            </p>
                        </article>

                        <article className="panel-card detail-care">
                            <h2>Guia de cuidado</h2>
                            <ul className="list">
                                <li>Lavar a mano con agua fria.</li>
                                <li>Secar en superficie plana, sin sol directo.</li>
                                <li>No usar lejia ni plancha.</li>
                            </ul>
                        </article>
                    </div>
                </div>
            ) : null}

            {relatedVariants.length ? (
                <section className="panel-card detail-related">
                    <div className="section-shell__header">
                        <div>
                            <p className="section-eyebrow">Tripulacion</p>
                            <h2>Companeros de {product ? product.name : 'este modelo'}</h2>
                        </div>
                    </div>
                    <div className="grid grid--cards">
                        {relatedVariants.map((variant) => (
                            <article className="card storefront-card" key={variant.sku}>
                                <div className="card__thumb storefront-card__thumb">
                                    <img
                                        src="/placeholder-product.svg"
                                        alt={`${variant.label} (${variant.sku})`}
                                        loading="lazy"
                                        decoding="async"
                                        onError={imgErrorToPlaceholder}
                                    />
                                </div>
                                <h3 className="card__title storefront-card__title">{variant.label}</h3>
                                <p className="card__meta">SKU: {variant.sku}</p>
                                <p className="card__price storefront-card__price">{formatPrice(variant.price)}</p>
                                <div className="card__actions storefront-card__actions">
                                    <a className="button button--ghost" href={variant.href} data-nav-prefetch>
                                        Ver detalle
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}
        </section>
    );
}
