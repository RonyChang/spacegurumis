import React, { useEffect, useMemo, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import {
    listCatalogVariants,
    type CatalogVariant,
    type CatalogVariantHighlight,
} from '../../lib/api/catalog';
import { listSiteAssetsBySlot, type SiteAsset } from '../../lib/api/siteAssets';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { buildCatalogImageDeliveryUrl } from '../../lib/media/imageDelivery';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const CATALOG_PAGE_SIZE = 12;
const HERO_SLOT = 'home-hero';
const HERO_IMAGE_PLACEHOLDER = '/placeholder-product.svg';
const DECORATIVE_FALLBACK_ASSETS: SiteAsset[] = [];

export type HomeCatalogInitialState = {
    variants: CatalogVariant[];
    page: number;
    totalPages: number;
    highlights?: {
        bestSeller?: CatalogVariantHighlight | null;
    };
};

export type HomeSlotsInitialState = {
    hero: SiteAsset[];
};

export type HomePageInitialData = {
    catalog: HomeCatalogInitialState | null;
    slots: HomeSlotsInitialState | null;
};

type HomePageProps = {
    initialData?: HomePageInitialData | null;
};

type FeaturedCollection = {
    slug: string;
    name: string;
    total: number;
    imageUrl: string;
};

type HomeHeroContent = {
    source: 'highlight' | 'catalog' | 'placeholder';
    imageUrl: string;
    altText: string;
    variantName: string;
};

function imgErrorToPlaceholder(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === '1') {
        return;
    }
    img.dataset.fallbackApplied = '1';
    img.src = HERO_IMAGE_PLACEHOLDER;
}

function normalizeSiteAssets(data: SiteAsset[] | null | undefined, fallback: SiteAsset[]) {
    const items = Array.isArray(data)
        ? data.filter((item) => item && typeof item.publicUrl === 'string' && item.publicUrl.trim())
        : [];

    return items.length ? items : fallback;
}

function buildDetailUrl(variant: CatalogVariant) {
    const slug = variant && variant.product && variant.product.slug ? String(variant.product.slug) : '';
    const sku = variant && variant.sku ? String(variant.sku) : '';
    const encodedSlug = encodeURIComponent(slug);
    const encodedSku = encodeURIComponent(sku);
    return `/products/${encodedSlug}?sku=${encodedSku}`;
}

function pickPreferredPresetUrl(source: unknown) {
    if (typeof source !== 'string') {
        return '';
    }

    const value = source.trim();
    return value || '';
}

function resolveVariantImageUrl(variant: CatalogVariant | null | undefined, preset: 'thumb' | 'card' | 'detail') {
    const preferred = pickPreferredPresetUrl(variant?.imageDeliveryUrls?.[preset]);
    if (preferred) {
        return preferred;
    }

    const original = pickPreferredPresetUrl(variant?.imageUrl);
    if (!original) {
        return HERO_IMAGE_PLACEHOLDER;
    }

    const transformed = buildCatalogImageDeliveryUrl(original, preset);
    return pickPreferredPresetUrl(transformed) || original;
}

function resolveHighlightImageUrl(
    highlight: CatalogVariantHighlight | null | undefined,
    preset: 'thumb' | 'card' | 'detail'
) {
    const preferred = pickPreferredPresetUrl(highlight?.imageDeliveryUrls?.[preset]);
    if (preferred) {
        return preferred;
    }

    const original = pickPreferredPresetUrl(highlight?.imageUrl);
    if (!original) {
        return '';
    }

    const transformed = buildCatalogImageDeliveryUrl(original, preset);
    return pickPreferredPresetUrl(transformed) || original;
}

function buildFeaturedCollections(variants: CatalogVariant[]) {
    const grouped = new Map<string, FeaturedCollection>();

    for (const variant of variants) {
        const slug = String(variant.category?.slug || 'general');
        const categoryName = String(variant.category?.name || 'Coleccion');
        const previous = grouped.get(slug);
        if (previous) {
            previous.total += 1;
            continue;
        }

        grouped.set(slug, {
            slug,
            name: categoryName,
            total: 1,
            imageUrl: resolveVariantImageUrl(variant, 'card'),
        });
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total).slice(0, 3);
}

function pickCatalogFallbackVariant(variants: CatalogVariant[]) {
    return variants.find((variant) => {
        const sku = String(variant?.sku || '').trim();
        const productName = String(variant?.product?.name || '').trim();
        return Boolean(sku && productName);
    }) || null;
}

function resolveHeroContent(
    highlight: CatalogVariantHighlight | null | undefined,
    variants: CatalogVariant[]
): HomeHeroContent {
    const highlightSku = String(highlight?.sku || '').trim();
    const highlightVariantName = String(highlight?.variantName || '').trim();
    const highlightProductName = String(highlight?.product?.name || '').trim();
    const highlightImageUrl = resolveHighlightImageUrl(highlight, 'card');

    if (highlightSku && highlightProductName && highlightImageUrl) {
        return {
            source: 'highlight',
            imageUrl: highlightImageUrl,
            altText: `${highlightProductName} - ${highlightVariantName || highlightProductName}`,
            variantName: highlightVariantName || highlightProductName,
        };
    }

    const fallbackVariant = pickCatalogFallbackVariant(variants);
    if (fallbackVariant) {
        const fallbackName = String(fallbackVariant.variantName || fallbackVariant.product.name || 'Producto');
        const productName = String(fallbackVariant.product?.name || 'Producto');
        return {
            source: 'catalog',
            imageUrl: resolveVariantImageUrl(fallbackVariant, 'card'),
            altText: `${productName} - ${fallbackName}`,
            variantName: fallbackName,
        };
    }

    return {
        source: 'placeholder',
        imageUrl: HERO_IMAGE_PLACEHOLDER,
        altText: 'Coleccion principal de Spacegurumis',
        variantName: 'Coleccion Spacegurumis',
    };
}

function getHeroSourceLabel(source: HomeHeroContent['source']) {
    if (source === 'highlight') {
        return 'Mas vendido';
    }

    if (source === 'catalog') {
        return 'Destacado';
    }

    return 'Coleccion';
}

export default function HomePage({ initialData = null }: HomePageProps) {
    const initialCatalog = initialData && initialData.catalog ? initialData.catalog : null;
    const initialSlots = initialData && initialData.slots ? initialData.slots : null;

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    const [variants, setVariants] = useState<CatalogVariant[]>(
        initialCatalog && Array.isArray(initialCatalog.variants) ? initialCatalog.variants : []
    );
    const [bestSellerHighlight, setBestSellerHighlight] = useState<CatalogVariantHighlight | null>(
        initialCatalog && initialCatalog.highlights && initialCatalog.highlights.bestSeller
            ? initialCatalog.highlights.bestSeller
            : null
    );
    const [heroAssets, setHeroAssets] = useState<SiteAsset[]>(
        normalizeSiteAssets(initialSlots ? initialSlots.hero : undefined, DECORATIVE_FALLBACK_ASSETS)
    );

    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');

    async function loadVariants() {
        setStatus('loading');
        setError('');
        try {
            const res = await listCatalogVariants({
                page: 1,
                pageSize: CATALOG_PAGE_SIZE,
                includeHighlights: true,
            });
            setVariants(Array.isArray(res.data) ? res.data : []);
            const nextHighlight = res.meta && res.meta.highlights
                ? res.meta.highlights.bestSeller || null
                : null;
            setBestSellerHighlight(nextHighlight);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar el catalogo.');
        } finally {
            setStatus('idle');
        }
    }

    async function loadDecorativeAssets() {
        try {
            const heroResult = await listSiteAssetsBySlot(HERO_SLOT);
            setHeroAssets(normalizeSiteAssets(heroResult.data, DECORATIVE_FALLBACK_ASSETS));
        } catch {
            setHeroAssets(DECORATIVE_FALLBACK_ASSETS);
        }
    }

    async function handleAddToCart(variant: CatalogVariant) {
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

            setMessageTone('error');
            setMessage(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
        }
    }

    useEffect(() => {
        if (!initialCatalog) {
            loadVariants();
        }

        if (!initialSlots) {
            loadDecorativeAssets();
        }
    }, [initialCatalog, initialSlots]);

    const heroContent = useMemo(
        () => resolveHeroContent(bestSellerHighlight, variants),
        [bestSellerHighlight, variants]
    );
    const decorativeHeroAsset = heroAssets[0] || null;
    const featuredCollections = useMemo(() => buildFeaturedCollections(variants), [variants]);
    const highlightedVariants = useMemo(() => variants.slice(0, 4), [variants]);

    return (
        <section className="surface page storefront-shell home-shell">
            <section className="home-hero panel-card">
                <div className="home-hero__content">
                    <p className="section-eyebrow">Hechos con amor espacial</p>
                    <h1>
                        <span>Spacegurumi Friends</span>
                    </h1>
                    <p>
                        Companeros tejidos a mano desde el espacio para acompanarte todos los dias.
                    </p>
                    <div className="home-hero__actions">
                        <a className="button button--primary" href="/shop" data-nav-prefetch>Adoptar ahora</a>
                        <a className="button button--ghost" href="/special-orders" data-nav-prefetch>
                            Pedidos especiales
                        </a>
                    </div>
                    {decorativeHeroAsset ? (
                        <div className="home-hero__decor">
                            <img
                                src={decorativeHeroAsset.publicUrl}
                                alt={decorativeHeroAsset.altText || decorativeHeroAsset.title || 'Decoracion home'}
                                loading="lazy"
                                decoding="async"
                                onError={imgErrorToPlaceholder}
                            />
                            <span>{decorativeHeroAsset.title || 'Decoracion de temporada'}</span>
                        </div>
                    ) : null}
                </div>

                <article className="home-hero__featured" aria-label="Producto destacado">
                    <img
                        src={heroContent.imageUrl}
                        alt={heroContent.altText}
                        loading="eager"
                        decoding="async"
                        onError={imgErrorToPlaceholder}
                    />
                    <div className="home-hero__featured-overlay">
                        <p>{getHeroSourceLabel(heroContent.source)}</p>
                        <h2>{heroContent.variantName}</h2>
                    </div>
                </article>
            </section>

            <section className="panel-card section-shell">
                <div className="section-shell__header">
                    <div>
                        <p className="section-eyebrow">Explora la galaxia</p>
                        <h2>Colecciones destacadas</h2>
                    </div>
                </div>

                <div className="grid collection-grid">
                    {featuredCollections.map((collection) => (
                        <article className="collection-card" key={collection.slug}>
                            <img
                                src={collection.imageUrl}
                                alt={`Coleccion ${collection.name}`}
                                loading="lazy"
                                decoding="async"
                                onError={imgErrorToPlaceholder}
                            />
                            <div className="collection-card__overlay">
                                <p>{collection.total} items</p>
                                <h3>{collection.name}</h3>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="panel-card section-shell">
                <div className="section-shell__header">
                    <div>
                        <p className="section-eyebrow">Recien aterrizados</p>
                        <h2>Favoritos de la semana</h2>
                    </div>
                    <a className="section-shell__link" href="/shop" data-nav-prefetch>Ver tienda</a>
                </div>

                {message ? <Alert tone={messageTone}>{message}</Alert> : null}
                {error ? <Alert tone="error">{error}</Alert> : null}
                {status === 'loading' ? <p className="status">Cargando productos...</p> : null}
                {status === 'idle' && !highlightedVariants.length ? (
                    <p className="status">No hay productos registrados.</p>
                ) : null}

                <div className="grid grid--cards catalog">
                    {highlightedVariants.map((variant, index) => (
                        <article className="card storefront-card" key={variant.sku}>
                            <div className="card__thumb storefront-card__thumb">
                                <img
                                    src={resolveVariantImageUrl(variant, 'card')}
                                    alt={formatVariantTitle(variant)}
                                    loading={index < 2 ? 'eager' : 'lazy'}
                                    decoding="async"
                                    onError={imgErrorToPlaceholder}
                                />
                            </div>
                            <p className="storefront-card__category">{variant.category.name}</p>
                            <h3 className="card__title storefront-card__title">{formatVariantTitle(variant)}</h3>
                            <p className="card__price storefront-card__price">{formatPrice(variant.price)}</p>
                            <p className="card__meta">Stock disponible: {variant.stockAvailable}</p>

                            <div className="card__actions storefront-card__actions">
                                <a className="button button--ghost" href={buildDetailUrl(variant)} data-nav-prefetch>
                                    Ver detalle
                                </a>
                                <Button type="button" variant="primary" onClick={() => handleAddToCart(variant)}>
                                    Agregar
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}
