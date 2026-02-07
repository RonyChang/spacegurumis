import React, { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../lib/api/client';
import { formatDate, formatPrice } from '../../lib/format';
import { getAuthToken } from '../../lib/session/authToken';
import { clearSession } from '../../lib/session/session';
import { getOrderDetail, listOrders, type OrderDetail, type OrderSummary } from '../../lib/api/orders';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import { buildWhatsappOrderMessage, buildWhatsappUrl } from '../../lib/whatsapp';

const ORDERS_PAGE_SIZE = 20;

export default function OrdersPage() {
    const token = useMemo(() => getAuthToken(), []);

    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState('');

    const [detail, setDetail] = useState<OrderDetail | null>(null);
    const [detailStatus, setDetailStatus] = useState<'idle' | 'loading'>('idle');
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        if (!token) {
            window.location.assign('/login');
            return;
        }

        setStatus('loading');
        setError('');
        listOrders(token, 1, ORDERS_PAGE_SIZE)
            .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
            .catch((err) => {
                if (err instanceof ApiError && err.status === 401) {
                    clearSession();
                    window.location.assign('/login');
                    return;
                }

                setError(err instanceof Error ? err.message : 'No se pudieron cargar tus pedidos.');
            })
            .finally(() => setStatus('idle'));
    }, [token]);

    async function handleLoadDetail(orderId: number) {
        if (!token) {
            window.location.assign('/login');
            return;
        }

        setDetailStatus('loading');
        setDetailError('');
        setDetail(null);
        try {
            const res = await getOrderDetail(token, orderId);
            setDetail(res.data || null);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                clearSession();
                window.location.assign('/login');
                return;
            }

            setDetailError(err instanceof Error ? err.message : 'No se pudo cargar el pedido.');
        } finally {
            setDetailStatus('idle');
        }
    }

    const whatsappOrderUrl = useMemo(() => {
        if (!detail || !detail.id) {
            return '';
        }

        return buildWhatsappUrl(
            buildWhatsappOrderMessage({
                orderId: detail.id,
                total: detail.total,
            })
        );
    }, [detail]);

    return (
        <section className="surface page orders">
            <div className="page__header">
                <h1>Mis pedidos</h1>
                <p className="muted">Consulta el estado y detalle de tus órdenes.</p>
            </div>

            {status === 'loading' ? <p className="status">Cargando pedidos...</p> : null}
            {error ? <Alert tone="error">{error}</Alert> : null}
            {status === 'idle' && !error && !orders.length ? (
                <p className="status">No tienes pedidos registrados.</p>
            ) : null}

            {orders.length ? (
                <div className="grid grid--cards orders__list">
                    {orders.map((order) => (
                        <article className="card" key={order.id}>
                            <h3 className="card__title">Pedido #{order.id}</h3>
                            <p className="card__meta">Estado: {order.orderStatus}</p>
                            <p className="card__meta">Pago: {order.paymentStatus}</p>
                            <p className="card__meta">Total: {formatPrice(order.total)}</p>
                            <p className="card__meta">Fecha: {formatDate(order.createdAt)}</p>

                            <div className="card__actions">
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => handleLoadDetail(order.id)}
                                >
                                    Ver detalle
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : null}

            <section className="detail">
                <h2>Detalle de pedido</h2>

                {detailStatus === 'loading' ? (
                    <p className="status">Cargando detalle del pedido...</p>
                ) : null}
                {detailError ? <Alert tone="error">{detailError}</Alert> : null}

                {detail ? (
                    <div className="detail__content">
                        <h3 className="detail__title">Pedido #{detail.id}</h3>
                        <div className="detail__grid">
                            <p>Estado: {detail.orderStatus}</p>
                            <p>Pago: {detail.paymentStatus}</p>
                            <p>Fecha: {formatDate(detail.createdAt)}</p>
                            <p>Subtotal: {formatPrice(detail.subtotal)}</p>
                            <p>Envío: {formatPrice(detail.shippingCost)}</p>
                            {detail.discountAmount ? (
                                <p>Descuento: -{formatPrice(detail.discountAmount)}</p>
                            ) : null}
                            <p>Total: {formatPrice(detail.total)}</p>
                        </div>

                        <div className="detail__items">
                            <p className="muted">Productos:</p>
                            {detail.items && detail.items.length ? (
                                <ul className="list">
                                    {detail.items.map((item, index) => (
                                        <li key={`${item.sku}-${index}`}>
                                            {item.productName}
                                            {item.variantName ? ` - ${item.variantName}` : ''} x{item.quantity}{' '}
                                            ({formatPrice(item.price)})
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="status">Sin items.</p>
                            )}
                        </div>

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
                ) : (
                    <p className="status">Selecciona un pedido para ver el detalle.</p>
                )}
            </section>
        </section>
    );
}
