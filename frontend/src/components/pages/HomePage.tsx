import React, { useEffect, useMemo, useState } from 'react';
import { addCartItem as addCartItemApi } from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import { listCatalogVariants, type CatalogVariant } from '../../lib/api/catalog';
import { listSiteAssetsBySlot, type SiteAsset } from '../../lib/api/siteAssets';
import { formatPrice, formatVariantTitle } from '../../lib/format';
import { readGuestCart, writeGuestCart } from '../../lib/cart/guestCart';
import { buildWhatsappUrl } from '../../lib/whatsapp';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

const CATALOG_PAGE_SIZE = 12;
const HERO_SLOT = 'home-hero';
const HERO_FALLBACK_ASSETS: SiteAsset[] = [
    {
        id: 0,
        slot: HERO_SLOT,
        title: 'Haz tu pedido especial',
        altText: 'Banner de pedidos especiales de Spacegurumis',
        publicUrl: '/pedidos-especiales.jpeg',
        sortOrder: 0,
    },
];
const HOME_PROMO_COPY = 'Haz tu pedido aquí, contáctanos con tu pedido especial para cotizar :)';
const HOME_PROMO_WHATSAPP_MESSAGE = 'Hola, soy un humano curioso en busca de amigurumis especiales!';

export type HomeCatalogInitialState = {
    variants: CatalogVariant[];
    page: number;
    totalPages: number;
};

export type HomeSlotsInitialState = {
    hero: SiteAsset[];
    banner?: SiteAsset[];
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
            imageUrl: variant.imageUrl || '/placeholder-product.svg',
        });
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total).slice(0, 3);
}

export default function HomePage({ initialData = null }: HomePageProps) {
    const initialCatalog = initialData && initialData.catalog ? initialData.catalog : null;
    const initialSlots = initialData && initialData.slots ? initialData.slots : null;

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    const [variants, setVariants] = useState<CatalogVariant[]>(
        initialCatalog && Array.isArray(initialCatalog.variants) ? initialCatalog.variants : []
    );
    const [heroAssets, setHeroAssets] = useState<SiteAsset[]>(
        normalizeSiteAssets(initialSlots ? initialSlots.hero : undefined, HERO_FALLBACK_ASSETS)
    );

    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');

    async function loadVariants() {
        setStatus('loading');
        setError('');
        try {
            const res = await listCatalogVariants(1, CATALOG_PAGE_SIZE);
            setVariants(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar el catalogo.');
        } finally {
            setStatus('idle');
        }
    }

    async function loadDecorativeAssets() {
        try {
            const heroResult = await listSiteAssetsBySlot(HERO_SLOT);
            setHeroAssets(normalizeSiteAssets(heroResult.data, HERO_FALLBACK_ASSETS));
        } catch {
            setHeroAssets(HERO_FALLBACK_ASSETS);
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

    const heroAsset = heroAssets[0] || HERO_FALLBACK_ASSETS[0];
    const promoWhatsappUrl = buildWhatsappUrl(HOME_PROMO_WHATSAPP_MESSAGE);
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
                        Compañeros tejidos a mano desde el espacio para acompañarte todos los dias.
                    </p>
                    <div className="home-hero__actions">
                        <a className="button button--primary" href="/shop" data-nav-prefetch>Adoptar ahora</a>
                        <a className="button button--ghost" href="/shop" data-nav-prefetch>Pedidos especiales</a>
                    </div>
                </div>

                <article id="hero-pedido-especial" className="promo-cta home-hero__promo">
                    <img
                        src={heroAsset.publicUrl}
                        alt={heroAsset.altText || 'Banner de pedidos especiales de Spacegurumis'}
                        loading="eager"
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
                                <svg
                                    aria-hidden="true"
                                    focusable="false"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347M12.047 21.785h-.004a9.867 9.867 0 0 1-5.031-1.378l-.361-.214-3.741.982 1-3.648-.235-.374a9.864 9.864 0 0 1-1.51-5.26c.001-5.446 4.43-9.876 9.878-9.876a9.846 9.846 0 0 1 6.987 2.894 9.86 9.86 0 0 1 2.893 7c-.003 5.447-4.432 9.876-9.876 9.876m8.416-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.893A11.82 11.82 0 0 0 1.73 17.85L0 24l6.305-1.654a11.867 11.867 0 0 0 5.741 1.467h.005c6.556 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.477-8.432"
                                    />
                                </svg>
                                <span>Contactar por WhatsApp</span>
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
                                    src={variant.imageUrl || '/placeholder-product.svg'}
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
