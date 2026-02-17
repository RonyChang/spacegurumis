import React, { useEffect, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import { listCatalogVariants, type CatalogVariant } from '../../lib/api/catalog';
import { listSiteAssetsBySlot, type SiteAsset } from '../../lib/api/siteAssets';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { buildWhatsappUrl } from '../../lib/whatsapp';
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
        title: 'Haz tu pedido especial',
        altText: 'Banner de pedidos especiales de amigurumis',
        publicUrl: '/site-fallback-banner.svg',
        sortOrder: 0,
    },
];
const HOME_PROMO_COPY = 'Haz tu pedido aquí, contáctanos por wsp con tu pedido especial para cotizar :)';
const HOME_PROMO_WHATSAPP_MESSAGE = 'Hola, quiero cotizar un pedido especial para amigurumis.';

export type HomeCatalogInitialState = {
    variants: CatalogVariant[];
    page: number;
    totalPages: number;
};

export type HomeSlotsInitialState = {
    hero: SiteAsset[];
    banner: SiteAsset[];
};

export type HomePageInitialData = {
    catalog: HomeCatalogInitialState | null;
    slots: HomeSlotsInitialState | null;
};

type HomePageProps = {
    initialData?: HomePageInitialData | null;
};

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

function buildDetailUrl(variant: CatalogVariant) {
    const slug = variant && variant.product && variant.product.slug ? String(variant.product.slug) : '';
    const sku = variant && variant.sku ? String(variant.sku) : '';
    const encodedSlug = encodeURIComponent(slug);
    const encodedSku = encodeURIComponent(sku);
    return `/products/${encodedSlug}?sku=${encodedSku}`;
}

export default function HomePage({ initialData = null }: HomePageProps) {
    const initialCatalog = initialData && initialData.catalog ? initialData.catalog : null;
    const initialSlots = initialData && initialData.slots ? initialData.slots : null;

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    const [variants, setVariants] = useState<CatalogVariant[]>(
        initialCatalog && Array.isArray(initialCatalog.variants) ? initialCatalog.variants : []
    );
    const [page, setPage] = useState(
        initialCatalog && Number.isFinite(Number(initialCatalog.page)) ? Number(initialCatalog.page) : 1
    );
    const [totalPages, setTotalPages] = useState(
        initialCatalog
            && Number.isFinite(Number(initialCatalog.totalPages))
            && Number(initialCatalog.totalPages) > 0
            ? Number(initialCatalog.totalPages)
            : 1
    );

    const [heroAssets, setHeroAssets] = useState<SiteAsset[]>(
        normalizeSiteAssets(initialSlots ? initialSlots.hero : undefined, HERO_FALLBACK_ASSETS)
    );
    const [bannerAssets, setBannerAssets] = useState<SiteAsset[]>(
        normalizeSiteAssets(initialSlots ? initialSlots.banner : undefined, BANNER_FALLBACK_ASSETS)
    );

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
            setError(err instanceof Error ? err.message : 'Error al cargar el catalogo.');
        } finally {
            setStatus('idle');
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
            loadVariants(1);
        }

        if (!initialSlots) {
            loadDecorativeAssets();
        }
    }, [initialCatalog, initialSlots]);

    const heroAsset = heroAssets[0] || HERO_FALLBACK_ASSETS[0];
    const promoBannerAsset = bannerAssets[0] || BANNER_FALLBACK_ASSETS[0];
    const secondaryBannerAsset = bannerAssets[1] || null;
    const promoWhatsappUrl = buildWhatsappUrl(HOME_PROMO_WHATSAPP_MESSAGE);

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
                    <article className="promo-cta">
                        <img
                            src={promoBannerAsset.publicUrl}
                            alt={promoBannerAsset.altText || 'Banner promocional de pedidos especiales'}
                            loading="lazy"
                            decoding="async"
                            onError={imgErrorToPlaceholder}
                        />
                        <div className="promo-cta__overlay">
                            <p className="promo-cta__eyebrow">Pedidos especiales</p>
                            <h3>{HOME_PROMO_COPY}</h3>
                            {promoWhatsappUrl ? (
                                <a
                                    className="button button--whatsapp promo-cta__button"
                                    href={promoWhatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Contactar por WhatsApp
                                </a>
                            ) : (
                                <div className="promo-cta__fallback" role="status" aria-live="polite">
                                    <span
                                        className="button button--ghost promo-cta__button promo-cta__button--disabled"
                                        aria-disabled="true"
                                    >
                                        WhatsApp no disponible
                                    </span>
                                    <p>Por ahora no podemos abrir WhatsApp desde este dispositivo.</p>
                                </div>
                            )}
                        </div>
                    </article>
                    {secondaryBannerAsset ? (
                        <article className="banner-slot__card">
                            <img
                                src={secondaryBannerAsset.publicUrl}
                                alt={secondaryBannerAsset.altText || 'Banner decorativo'}
                                loading="lazy"
                                decoding="async"
                                onError={imgErrorToPlaceholder}
                            />
                            {secondaryBannerAsset.title ? <p>{secondaryBannerAsset.title}</p> : null}
                        </article>
                    ) : null}
                </aside>
            </section>

            <div className="page__header">
                <h1>Catalogo</h1>
                <p className="muted">Explora las variantes disponibles y agrega tus favoritos al carrito.</p>
            </div>

            {message ? <Alert tone={messageTone}>{message}</Alert> : null}
            {error ? <Alert tone="error">{error}</Alert> : null}

            {status === 'loading' ? <p className="status">Cargando catalogo...</p> : null}
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
                            <a className="button button--ghost" href={buildDetailUrl(variant)} data-nav-prefetch>
                                Ver detalle
                            </a>
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
                        Pagina {page} de {totalPages}
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
        </section>
    );
}
