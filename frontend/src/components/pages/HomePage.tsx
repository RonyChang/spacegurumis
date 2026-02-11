import React, { useEffect, useMemo, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import {
    getCatalogVariantDetail,
    listCatalogVariants,
    type CatalogVariant,
    type CatalogVariantDetail,
} from '../../lib/api/catalog';
import { listSiteAssetsBySlot, type SiteAsset } from '../../lib/api/siteAssets';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { buildWhatsappProductMessage, buildWhatsappUrl } from '../../lib/whatsapp';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const CATALOG_PAGE_SIZE = 9;
const HERO_SLOT = 'home-hero';
const BANNER_SLOT = 'home-banner';
const HERO_FALLBACK_ASSETS: SiteAsset[] = [
    {
        id: 0,
        slot: HERO_SLOT,
        title: 'Coleccion destacada',
        altText: 'Coleccion destacada de amigurumis',
        publicUrl: '/site-fallback-hero.svg',
        sortOrder: 0,
    },
];
const BANNER_FALLBACK_ASSETS: SiteAsset[] = [
    {
        id: 0,
        slot: BANNER_SLOT,
        title: 'Nuevos modelos cada semana',
        altText: 'Nuevos modelos de amigurumis',
        publicUrl: '/site-fallback-banner.svg',
        sortOrder: 0,
    },
];

function imgErrorToPlaceholder(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === '1') {
        return;
    }
    img.dataset.fallbackApplied = '1';
    img.src = '/placeholder-product.svg';
}

function normalizeSiteAssets(data: SiteAsset[] | null | undefined, fallback: SiteAsset[]) {
    const items = Array.isArray(data)
        ? data.filter((item) => item && typeof item.publicUrl === 'string' && item.publicUrl.trim())
        : [];

    return items.length ? items : fallback;
}

export default function HomePage() {
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    const [variants, setVariants] = useState<CatalogVariant[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [detailStatus, setDetailStatus] = useState<'idle' | 'loading'>('idle');
    const [detailError, setDetailError] = useState('');
    const [selected, setSelected] = useState<CatalogVariantDetail | null>(null);
    const [heroAssets, setHeroAssets] = useState<SiteAsset[]>(HERO_FALLBACK_ASSETS);
    const [bannerAssets, setBannerAssets] = useState<SiteAsset[]>(BANNER_FALLBACK_ASSETS);

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

    async function loadDecorativeAssets() {
        const [heroResult, bannerResult] = await Promise.allSettled([
            listSiteAssetsBySlot(HERO_SLOT),
            listSiteAssetsBySlot(BANNER_SLOT),
        ]);

        if (heroResult.status === 'fulfilled') {
            setHeroAssets(normalizeSiteAssets(heroResult.value.data, HERO_FALLBACK_ASSETS));
        } else {
            setHeroAssets(HERO_FALLBACK_ASSETS);
        }

        if (bannerResult.status === 'fulfilled') {
            setBannerAssets(normalizeSiteAssets(bannerResult.value.data, BANNER_FALLBACK_ASSETS));
        } else {
            setBannerAssets(BANNER_FALLBACK_ASSETS);
        }
    }

    async function handleAddToCart(variant: CatalogVariant | CatalogVariantDetail) {
        const sku = variant && variant.sku ? String(variant.sku) : '';
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
                // Not logged in: fallback to guest cart.
                const current = readGuestCart();
                const existing = current.find((item) => item.sku === sku);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    current.push({
                        sku,
                        productName:
                            variant.product && variant.product.name ? variant.product.name : 'Producto',
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

            setMessageTone('error');
            setMessage(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
        }
    }

    useEffect(() => {
        loadVariants(1);
        loadDecorativeAssets();
    }, []);

    const detailWhatsappUrl = useMemo(() => {
        if (!selected) {
            return '';
        }

        const productName = formatVariantTitle(selected);
        const messageText = buildWhatsappProductMessage({ productName, sku: selected.sku });
        return buildWhatsappUrl(messageText);
    }, [selected]);

    const selectedImages = useMemo(() => {
        if (!selected || !Array.isArray(selected.images)) {
            return [];
        }
        return selected.images.filter((img) => img && img.url);
    }, [selected]);

    const heroAsset = heroAssets[0] || HERO_FALLBACK_ASSETS[0];
    const visibleBanners = bannerAssets.slice(0, 2);

    return (
        <section className="surface page">
            <section className="home-decor" aria-label="Decoracion principal">
                <article className="hero-slot">
                    <img
                        src={heroAsset.publicUrl}
                        alt={heroAsset.altText || 'Hero decorativo'}
                        loading="lazy"
                        decoding="async"
                        onError={imgErrorToPlaceholder}
                    />
                    <div className="hero-slot__overlay">
                        <p className="hero-slot__eyebrow">Spacegurumis</p>
                        <h2>{heroAsset.title || 'Coleccion destacada'}</h2>
                    </div>
                </article>
                <aside className="banner-slot">
                    {visibleBanners.map((asset, index) => (
                        <article className="banner-slot__card" key={`${asset.id}-${index}`}>
                            <img
                                src={asset.publicUrl}
                                alt={asset.altText || 'Banner decorativo'}
                                loading="lazy"
                                decoding="async"
                                onError={imgErrorToPlaceholder}
                            />
                            {asset.title ? <p>{asset.title}</p> : null}
                        </article>
                    ))}
                </aside>
            </section>

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
                        <div className="card__thumb">
                            <img
                                src={variant.imageUrl || '/placeholder-product.svg'}
                                alt={formatVariantTitle(variant)}
                                loading="lazy"
                                decoding="async"
                                onError={imgErrorToPlaceholder}
                            />
                        </div>
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
                        <div className="gallery">
                            <div className="gallery__main">
                                <img
                                    src={selectedImages[0]?.url || '/placeholder-product.svg'}
                                    alt={selectedImages[0]?.altText || formatVariantTitle(selected)}
                                    loading="lazy"
                                    decoding="async"
                                    onError={imgErrorToPlaceholder}
                                />
                            </div>
                            {selectedImages.length > 1 ? (
                                <div className="gallery__thumbs">
                                    {selectedImages.map((image) => (
                                        <img
                                            key={image.url}
                                            className="gallery__thumb"
                                            src={image.url}
                                            alt={image.altText || formatVariantTitle(selected)}
                                            loading="lazy"
                                            decoding="async"
                                            onError={imgErrorToPlaceholder}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
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
