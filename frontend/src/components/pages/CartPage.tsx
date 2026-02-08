import React, { useEffect, useMemo, useState } from 'react';
import {
    clearCart as clearCartApi,
    deleteCartItem as deleteCartItemApi,
    getCart as getCartApi,
    updateCartItem as updateCartItemApi,
} from '../../lib/api/cart';
import { ApiError } from '../../lib/api/client';
import { validateDiscount as validateDiscountApi } from '../../lib/api/discounts';
import { createOrder as createOrderApi } from '../../lib/api/orders';
import { createStripeSession } from '../../lib/api/payments';
import { formatPrice } from '../../lib/format';
import {
    clearGuestCart,
    readGuestCart,
    writeGuestCart,
    type GuestCartItem,
} from '../../lib/cart/guestCart';
import { consumeFlash } from '../../lib/session/flash';
import { buildWhatsappOrderMessage, buildWhatsappUrl } from '../../lib/whatsapp';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

type CartLineItem = {
    sku: string;
    productName: string;
    variantName: string | null;
    price: number | null;
    quantity: number;
};

type PendingOrder = {
    id: number;
    total: number | null;
    shippingCost: number | null;
};

function mapGuestToCart(items: GuestCartItem[]): CartLineItem[] {
    return items.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        variantName: item.variantName,
        price: Number(item.price) || 0,
        quantity: item.quantity,
    }));
}

export default function CartPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [syncWarning, setSyncWarning] = useState('');

    const [items, setItems] = useState<CartLineItem[]>([]);

    const [discountCode, setDiscountCode] = useState('');
    const [discountStatus, setDiscountStatus] = useState<'idle' | 'loading'>('idle');
    const [discountMessage, setDiscountMessage] = useState('');
    const [discountAmount, setDiscountAmount] = useState<number | null>(null);
    const [discountedSubtotal, setDiscountedSubtotal] = useState<number | null>(null);

    const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'loading'>('idle');
    const [paymentError, setPaymentError] = useState('');

    const cartSubtotal = useMemo(() => {
        const subtotal = items.reduce(
            (total, item) => total + (Number(item.price) || 0) * item.quantity,
            0
        );
        return Number(subtotal.toFixed(2));
    }, [items]);

    useEffect(() => {
        const warning = consumeFlash('cartSyncError');
        if (warning) {
            setSyncWarning(warning);
        }
    }, []);

    useEffect(() => {
        if (!items.length) {
            setDiscountAmount(null);
            setDiscountedSubtotal(null);
            setDiscountMessage('');
            setDiscountStatus('idle');
        }
    }, [items]);

    useEffect(() => {
        async function load() {
            setStatus('loading');
            setError('');
            setMessage('');

            try {
                const res = await getCartApi();
                const nextItems = Array.isArray(res.data?.items) ? res.data.items : [];
                setIsLoggedIn(true);
                setItems(nextItems);
            } catch (err) {
                if (err instanceof ApiError && err.status === 401) {
                    setIsLoggedIn(false);
                    const guest = readGuestCart();
                    setItems(mapGuestToCart(guest));
                    return;
                }
                setError(err instanceof Error ? err.message : 'No se pudo cargar el carrito.');
            } finally {
                setStatus('idle');
            }
        }

        load();
    }, []);

    async function handleUpdateQuantity(sku: string, quantity: number) {
        if (!sku) {
            return;
        }

        const qty = Math.floor(Number(quantity));
        if (!Number.isFinite(qty) || qty <= 0) {
            return;
        }

        setError('');
        setMessage('');

        if (!isLoggedIn) {
            const current = readGuestCart();
            const updated = current.map((item) =>
                item.sku === sku ? { ...item, quantity: qty } : item
            );
            setItems(mapGuestToCart(writeGuestCart(updated)));
            return;
        }

        try {
            const res = await updateCartItemApi(sku, qty);
            setItems(Array.isArray(res.data?.items) ? res.data.items : []);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setIsLoggedIn(false);
                const guest = readGuestCart();
                setItems(mapGuestToCart(guest));
                return;
            }
            setError(err instanceof Error ? err.message : 'No se pudo actualizar el carrito.');
        }
    }

    async function handleRemoveItem(sku: string) {
        if (!sku) {
            return;
        }

        setError('');
        setMessage('');

        if (!isLoggedIn) {
            const updated = writeGuestCart(readGuestCart().filter((item) => item.sku !== sku));
            setItems(mapGuestToCart(updated));
            return;
        }

        try {
            const res = await deleteCartItemApi(sku);
            setItems(Array.isArray(res.data?.items) ? res.data.items : []);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setIsLoggedIn(false);
                const guest = readGuestCart();
                setItems(mapGuestToCart(guest));
                return;
            }
            setError(err instanceof Error ? err.message : 'No se pudo eliminar el item.');
        }
    }

    async function handleClearCart() {
        setError('');
        setMessage('');

        if (!isLoggedIn) {
            clearGuestCart();
            setItems([]);
            setMessage('Carrito vacío.');
            return;
        }

        try {
            await clearCartApi();
            setItems([]);
            setMessage('Carrito vacío.');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setIsLoggedIn(false);
                const guest = readGuestCart();
                setItems(mapGuestToCart(guest));
                return;
            }
            setError(err instanceof Error ? err.message : 'No se pudo vaciar el carrito.');
        }
    }

    async function handleValidateDiscount() {
        const code = discountCode.trim();
        if (!code) {
            setDiscountMessage('Ingresa un código.');
            return;
        }

        if (!items.length) {
            setDiscountMessage('Tu carrito está vacío.');
            return;
        }

        setDiscountStatus('loading');
        setDiscountMessage('');
        try {
            const res = await validateDiscountApi(code, cartSubtotal);
            const data = res.data || null;
            setDiscountAmount(
                data && Number.isFinite(Number(data.discountAmount)) ? Number(data.discountAmount) : null
            );
            setDiscountedSubtotal(
                data && Number.isFinite(Number(data.finalSubtotal)) ? Number(data.finalSubtotal) : null
            );
            setDiscountMessage('Código aplicado.');
        } catch (err) {
            setDiscountAmount(null);
            setDiscountedSubtotal(null);
            setDiscountMessage(err instanceof Error ? err.message : 'No se pudo validar el código.');
        } finally {
            setDiscountStatus('idle');
        }
    }

    async function handleCreateOrder() {
        if (!isLoggedIn) {
            window.location.assign('/login');
            return;
        }

        if (!items.length) {
            setError('Tu carrito está vacío.');
            return;
        }

        setError('');
        setMessage('');
        setPendingOrder(null);
        setPaymentError('');
        setStatus('loading');
        try {
            const res = await createOrderApi(discountCode.trim() || null);
            const orderId = res.data?.id ?? null;
            const total = res.data && Number(res.data.total);
            const shippingCost = res.data && Number(res.data.shippingCost);

            setItems([]);
            setDiscountCode('');
            setDiscountAmount(null);
            setDiscountedSubtotal(null);
            setDiscountMessage('');

            if (orderId) {
                setPendingOrder({
                    id: orderId,
                    total: Number.isFinite(total) ? total : null,
                    shippingCost: Number.isFinite(shippingCost) ? shippingCost : null,
                });
                setMessage(`Orden creada #${orderId}. Ahora puedes pagar con Stripe.`);
            } else {
                setMessage('Orden creada. Ahora puedes pagar con Stripe.');
            }
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                window.location.assign('/login');
                return;
            }
            setError(err instanceof Error ? err.message : 'No se pudo crear la orden.');
        } finally {
            setStatus('idle');
        }
    }

    async function handleStripeCheckout() {
        if (!isLoggedIn) {
            window.location.assign('/login');
            return;
        }

        if (!pendingOrder || !pendingOrder.id) {
            setPaymentError('No hay una orden pendiente para pagar.');
            return;
        }

        setPaymentStatus('loading');
        setPaymentError('');
        try {
            const res = await createStripeSession(pendingOrder.id);
            const checkoutUrl = res.data?.checkoutUrl || '';
            if (!checkoutUrl) {
                throw new Error('No se pudo iniciar el pago con Stripe.');
            }

            window.location.assign(checkoutUrl);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                window.location.assign('/login');
                return;
            }

            setPaymentError(err instanceof Error ? err.message : 'No se pudo iniciar el pago con Stripe.');
            setPaymentStatus('idle');
        }
    }

    const whatsappOrderUrl = useMemo(() => {
        if (!pendingOrder || !pendingOrder.id) {
            return '';
        }

        return buildWhatsappUrl(
            buildWhatsappOrderMessage({
                orderId: pendingOrder.id,
                total: pendingOrder.total,
            })
        );
    }, [pendingOrder]);

    return (
        <section className="surface page cart">
            <div className="page__header">
                <h1>Carrito</h1>
                <p className="muted">Revisa tus productos antes de crear la orden.</p>
            </div>

            {syncWarning ? <Alert tone="info">{syncWarning}</Alert> : null}
            {status === 'loading' ? <p className="status">Cargando carrito...</p> : null}
            {error ? <Alert tone="error">{error}</Alert> : null}
            {message ? <Alert tone="success">{message}</Alert> : null}

            {!isLoggedIn ? (
                <div className="cart__notice">
                    <p className="status">Carrito local. Inicia sesión para sincronizarlo.</p>
                    <a className="button button--primary" href="/login">
                        Iniciar sesión
                    </a>
                </div>
            ) : null}

            {!items.length ? <p className="status">Tu carrito está vacío.</p> : null}

            <div className="cart__content">
                {items.map((item) => (
                    <div className="cart__row" key={item.sku}>
                        <div className="cart__info">
                            <h3 className="cart__title">
                                {item.variantName
                                    ? `${item.productName} - ${item.variantName}`
                                    : item.productName}
                            </h3>
                            <p className="muted">SKU: {item.sku}</p>
                            <p className="muted">{formatPrice(item.price)}</p>
                        </div>

                        <div className="cart__actions">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={item.quantity <= 1}
                                onClick={() => handleUpdateQuantity(item.sku, item.quantity - 1)}
                            >
                                -
                            </Button>
                            <span className="cart__qty">{item.quantity}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleUpdateQuantity(item.sku, item.quantity + 1)}
                            >
                                +
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => handleRemoveItem(item.sku)}
                            >
                                Eliminar
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {items.length ? (
                <div className="cart__summary">
                    <div className="cart__discount">
                        <TextField
                            label="Cupón"
                            type="text"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleValidateDiscount}
                            disabled={discountStatus === 'loading'}
                        >
                            {discountStatus === 'loading' ? 'Validando...' : 'Validar código'}
                        </Button>

                        {discountMessage ? <p className="status">{discountMessage}</p> : null}
                        {discountAmount !== null ? (
                            <p className="status">Descuento: -{formatPrice(discountAmount)}</p>
                        ) : null}
                        {discountedSubtotal !== null ? (
                            <p className="status">
                                Subtotal con descuento: {formatPrice(discountedSubtotal)}
                            </p>
                        ) : null}
                    </div>

                    <div className="cart__summary-actions">
                        <p className="cart__total">Subtotal: {formatPrice(cartSubtotal)}</p>
                        {isLoggedIn ? (
                            <Button type="button" variant="primary" onClick={handleCreateOrder}>
                                Crear orden
                            </Button>
                        ) : null}
                        <Button type="button" variant="danger" onClick={handleClearCart}>
                            Vaciar carrito
                        </Button>
                    </div>
                </div>
            ) : null}

            {pendingOrder && pendingOrder.id ? (
                <section className="surface page cart cart--pending">
                    <div className="page__header">
                        <h2>Pago pendiente</h2>
                        <p className="muted">Orden #{pendingOrder.id} lista para pagar.</p>
                    </div>

                    {pendingOrder.total !== null ? (
                        <p className="cart__total">Total: {formatPrice(pendingOrder.total)}</p>
                    ) : null}

                    <div className="cart__summary-actions">
                        <Button
                            type="button"
                            variant="dark"
                            onClick={handleStripeCheckout}
                            disabled={paymentStatus === 'loading'}
                        >
                            {paymentStatus === 'loading' ? 'Redirigiendo...' : 'Pagar con Stripe'}
                        </Button>
                        {whatsappOrderUrl ? (
                            <a
                                className="button button--whatsapp"
                                href={whatsappOrderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Consultar por WhatsApp
                            </a>
                        ) : null}
                    </div>

                    {paymentError ? <Alert tone="error">{paymentError}</Alert> : null}
                </section>
            ) : null}
        </section>
    );
}
