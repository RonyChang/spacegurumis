(function () {
    const { useEffect, useState } = React;
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    const createElement = React.createElement;

    const apiBase = window.API_BASE_URL || 'http://localhost:3000';
    const whatsappNumber = window.WHATSAPP_NUMBER || '';
    const whatsappTemplate = window.WHATSAPP_TEMPLATE || '';
    const whatsappOrderTemplate = window.WHATSAPP_ORDER_TEMPLATE || '';
    const initialAuthToken = window.localStorage.getItem('authToken') || '';
    const GUEST_CART_KEY = 'guestCart';
    const CATALOG_PAGE_SIZE = 9;

    function buildApiUrl(path) {
        return `${apiBase}${path}`;
    }

    function buildWhatsappUrl(message) {
        if (!whatsappNumber) {
            return '';
        }

        const normalized = whatsappNumber.replace(/\D/g, '');
        if (!normalized) {
            return '';
        }

        const text = message ? encodeURIComponent(message) : '';
        return text
            ? `https://wa.me/${normalized}?text=${text}`
            : `https://wa.me/${normalized}`;
    }

    function buildWhatsappMessage({ variant, order }) {
        const template = order
            ? (whatsappOrderTemplate
                ? whatsappOrderTemplate
                : 'Hola, quiero consultar por mi pedido #{orderId}. Total: {total}.')
            : (whatsappTemplate
                ? whatsappTemplate
                : 'Hola, quiero consultar por {productName}. SKU: {sku}.');

        const safeSku = variant && variant.sku ? variant.sku : '';
        const safeName = getVariantTitle(variant);
        const orderId = order && order.id ? String(order.id) : '';
        const totalText = order && Number.isFinite(order.total)
            ? formatPrice(order.total)
            : '';

        return template
            .replace('{productName}', safeName)
            .replace('{sku}', safeSku)
            .replace('{orderId}', orderId)
            .replace('{total}', totalText);
    }

    function formatPrice(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            return 'S/ -';
        }

        return `S/ ${Number(value).toFixed(2)}`;
    }

    function formatDate(value) {
        if (!value) {
            return '-';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return date.toLocaleDateString('es-PE');
    }

    function getVariantTitle(variant) {
        const baseName = variant && variant.product ? variant.product.name : 'Producto';
        if (variant && variant.variantName) {
            return `${baseName} - ${variant.variantName}`;
        }

        return baseName;
    }

    function buildEmptyProfileForm() {
        return {
            firstName: '',
            lastName: '',
            receiverName: '',
            phone: '',
            addressLine1: '',
            addressLine2: '',
            country: '',
            city: '',
            district: '',
            postalCode: '',
            reference: '',
        };
    }

    function buildProfileForm(profile) {
        if (!profile) {
            return buildEmptyProfileForm();
        }

        const user = profile.user || {};
        const address = profile.address || {};

        return {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            receiverName: address.receiverName || '',
            phone: address.phone || '',
            addressLine1: address.addressLine1 || '',
            addressLine2: address.addressLine2 || '',
            country: address.country || '',
            city: address.city || '',
            district: address.district || '',
            postalCode: address.postalCode || '',
            reference: address.reference || '',
        };
    }

    function getErrorMessage(payload, fallback) {
        if (payload && Array.isArray(payload.errors) && payload.errors.length) {
            return payload.errors[0].message || fallback;
        }

        if (payload && payload.message) {
            return payload.message;
        }

        return fallback;
    }

    function normalizeGuestCart(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items
            .map((item) => ({
                sku: typeof item.sku === 'string' ? item.sku.trim() : '',
                productName: typeof item.productName === 'string' && item.productName.trim()
                    ? item.productName.trim()
                    : 'Producto',
                variantName: typeof item.variantName === 'string' && item.variantName.trim()
                    ? item.variantName.trim()
                    : null,
                price: Number(item.price) || 0,
                quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0
                    ? Math.floor(Number(item.quantity))
                    : 0,
            }))
            .filter((item) => item.sku && item.quantity > 0);
    }

    function readGuestCart() {
        const raw = window.localStorage.getItem(GUEST_CART_KEY);
        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            return normalizeGuestCart(parsed);
        } catch (error) {
            return [];
        }
    }

    function writeGuestCart(items) {
        const normalized = normalizeGuestCart(items);
        window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function clearGuestCart() {
        window.localStorage.removeItem(GUEST_CART_KEY);
    }

    function buildGuestItem(variant) {
        if (!variant || !variant.sku) {
            return null;
        }

        return {
            sku: variant.sku,
            productName: variant.product && variant.product.name
                ? variant.product.name
                : 'Producto',
            variantName: variant.variantName || null,
            price: Number(variant.price) || 0,
            quantity: 1,
        };
    }

    function resolveView(pathname) {
        if (!pathname || pathname === '/') {
            return 'home';
        }

        if (pathname === '/login') {
            return 'login';
        }

        if (pathname === '/register') {
            return 'register';
        }

        if (pathname === '/verify') {
            return 'verify';
        }

        if (pathname === '/admin-2fa') {
            return 'admin-2fa';
        }

        if (pathname === '/profile') {
            return 'profile';
        }

        if (pathname === '/cart') {
            return 'cart';
        }

        if (pathname === '/orders') {
            return 'orders';
        }

        return 'home';
    }

    function App() {
        const [variants, setVariants] = useState([]);
        const [status, setStatus] = useState('idle');
        const [error, setError] = useState('');
        const [selected, setSelected] = useState(null);
        const [detailStatus, setDetailStatus] = useState('idle');
        const [detailError, setDetailError] = useState('');
        const [catalogPage, setCatalogPage] = useState(1);
        const [catalogTotalPages, setCatalogTotalPages] = useState(1);

        const [authToken, setAuthToken] = useState(initialAuthToken);
        const [loginForm, setLoginForm] = useState({ email: '', password: '' });
        const [loginStatus, setLoginStatus] = useState('idle');
        const [loginError, setLoginError] = useState('');

        const [registerForm, setRegisterForm] = useState({
            email: '',
            password: '',
        });
        const [registerStatus, setRegisterStatus] = useState('idle');
        const [registerError, setRegisterError] = useState('');
        const [verifyForm, setVerifyForm] = useState({ email: '', code: '' });
        const [verifyStatus, setVerifyStatus] = useState('idle');
        const [verifyError, setVerifyError] = useState('');
        const [verifyMessage, setVerifyMessage] = useState('');
        const [resendStatus, setResendStatus] = useState('idle');
        const [resendMessage, setResendMessage] = useState('');
        const [adminTwoFactorForm, setAdminTwoFactorForm] = useState({ email: '', code: '' });
        const [adminTwoFactorStatus, setAdminTwoFactorStatus] = useState('idle');
        const [adminTwoFactorError, setAdminTwoFactorError] = useState('');
        const [adminTwoFactorMessage, setAdminTwoFactorMessage] = useState('');

        const [profileForm, setProfileForm] = useState(buildEmptyProfileForm());
        const [profileStatus, setProfileStatus] = useState('idle');
        const [profileError, setProfileError] = useState('');
        const [profileMessage, setProfileMessage] = useState('');

        const [cartItems, setCartItems] = useState(
            () => (initialAuthToken ? [] : readGuestCart())
        );
        const [cartStatus, setCartStatus] = useState('idle');
        const [cartError, setCartError] = useState('');
        const [cartSyncError, setCartSyncError] = useState('');
        const [cartMessage, setCartMessage] = useState('');
        const [pendingOrder, setPendingOrder] = useState(null);
        const [paymentStatus, setPaymentStatus] = useState('idle');
        const [paymentError, setPaymentError] = useState('');
        const [discountCode, setDiscountCode] = useState('');
        const [discountStatus, setDiscountStatus] = useState('idle');
        const [discountMessage, setDiscountMessage] = useState('');
        const [discountAmount, setDiscountAmount] = useState(null);
        const [discountedSubtotal, setDiscountedSubtotal] = useState(null);
        const [orders, setOrders] = useState([]);
        const [ordersMeta, setOrdersMeta] = useState(null);
        const [ordersStatus, setOrdersStatus] = useState('idle');
        const [ordersError, setOrdersError] = useState('');
        const [orderDetail, setOrderDetail] = useState(null);
        const [orderDetailStatus, setOrderDetailStatus] = useState('idle');
        const [orderDetailError, setOrderDetailError] = useState('');
        const [view, setView] = useState(resolveView(window.location.pathname));

        const isLoggedIn = Boolean(authToken);

        useEffect(() => {
            loadVariants();
        }, []);

        useEffect(() => {
            const handlePopState = () => {
                setView(resolveView(window.location.pathname));
            };

            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }, []);

        useEffect(() => {
            if (!window.location.hash) {
                return;
            }

            const hashValue = window.location.hash.startsWith('#')
                ? window.location.hash.slice(1)
                : window.location.hash;
            const params = new URLSearchParams(hashValue);
            const token = params.get('token');
            const errorParam = params.get('error');

            if (token) {
                window.history.replaceState({}, '', window.location.pathname);
                saveSession({ token });
                return;
            }

            if (errorParam) {
                setLoginError(errorParam);
                setRegisterError(errorParam);
                window.history.replaceState({}, '', window.location.pathname);
            }
        }, []);

        useEffect(() => {
            if (authToken) {
                loadProfile();
            } else {
                setProfileForm(buildEmptyProfileForm());
                setCartItems(readGuestCart());
                setCartSyncError('');
            }
        }, [authToken]);

        useEffect(() => {
            if (view !== 'cart') {
                return;
            }

            if (!authToken) {
                setCartItems(readGuestCart());
                setCartError('');
                setCartMessage('');
                setCartStatus('idle');
                return;
            }

            loadCart();
        }, [view, authToken]);

        useEffect(() => {
            if (view !== 'orders') {
                return;
            }

            if (!authToken) {
                setOrders([]);
                setOrdersMeta(null);
                setOrdersStatus('idle');
                setOrdersError('');
                setOrderDetail(null);
                setOrderDetailStatus('idle');
                setOrderDetailError('');
                return;
            }

            loadOrders();
        }, [view, authToken]);

        useEffect(() => {
            if (!cartItems.length) {
                setDiscountAmount(null);
                setDiscountedSubtotal(null);
                setDiscountMessage('');
                setDiscountStatus('idle');
            }
        }, [cartItems]);

        function navigate(path) {
            if (!path) {
                return;
            }

            if (window.location.pathname !== path) {
                window.history.pushState({}, '', path);
            }

            setView(resolveView(path));
        }

        function handleNavClick(event, path) {
            event.preventDefault();
            navigate(path);
        }

        function handleGoogleLogin() {
            const url = buildApiUrl('/api/v1/auth/google');
            window.location.assign(url);
        }

        async function saveSession(data) {
            if (!data || !data.token) {
                return;
            }

            window.localStorage.setItem('authToken', data.token);
            setAuthToken(data.token);
            const syncOk = await syncGuestCart(data.token);
            await loadCart(data.token);
            if (!syncOk) {
                setCartSyncError('No se pudo sincronizar el carrito local.');
            } else {
                setCartSyncError('');
            }
            navigate('/profile');
        }

        function clearSession() {
            window.localStorage.removeItem('authToken');
            clearGuestCart();
            setAuthToken('');
            setProfileForm(buildEmptyProfileForm());
            setAdminTwoFactorForm({ email: '', code: '' });
            setAdminTwoFactorError('');
            setAdminTwoFactorMessage('');
            setAdminTwoFactorStatus('idle');
            setCartItems([]);
            setCartError('');
            setCartSyncError('');
            setCartMessage('');
            setPendingOrder(null);
            setPaymentError('');
            setPaymentStatus('idle');
            setOrders([]);
            setOrdersMeta(null);
            setOrdersStatus('idle');
            setOrdersError('');
            setOrderDetail(null);
            setOrderDetailStatus('idle');
            setOrderDetailError('');
            navigate('/');
        }

        async function loadVariants(page = 1) {
            setStatus('loading');
            setError('');
            try {
                const response = await fetch(
                    buildApiUrl(`/api/v1/catalog/variants?page=${page}&pageSize=${CATALOG_PAGE_SIZE}`)
                );
                if (!response.ok) {
                    throw new Error('No se pudo cargar el catálogo de productos.');
                }

                const payload = await response.json();
                const meta = payload && payload.meta ? payload.meta : {};
                const totalPages = Number.isFinite(Number(meta.totalPages))
                    ? Number(meta.totalPages)
                    : (Number.isFinite(Number(meta.total)) && Number(meta.total) > 0
                        ? Math.ceil(Number(meta.total) / CATALOG_PAGE_SIZE)
                        : 1);
                setVariants(Array.isArray(payload.data) ? payload.data : []);
                setCatalogPage(Number.isFinite(Number(meta.page)) ? Number(meta.page) : page);
                setCatalogTotalPages(totalPages || 1);
            } catch (err) {
                setError(err.message || 'Error al cargar el catálogo.');
            } finally {
                setStatus('idle');
            }
        }

        function handleCatalogPrev() {
            if (catalogPage <= 1 || status === 'loading') {
                return;
            }
            loadVariants(catalogPage - 1);
        }

        function handleCatalogNext() {
            if (catalogPage >= catalogTotalPages || status === 'loading') {
                return;
            }
            loadVariants(catalogPage + 1);
        }

        async function loadVariantDetail(sku) {
            setDetailStatus('loading');
            setDetailError('');
            try {
                const response = await fetch(buildApiUrl(`/api/v1/catalog/variants/${sku}`));
                if (!response.ok) {
                    throw new Error('No se pudo cargar el producto.');
                }

                const payload = await response.json();
                setSelected(payload.data || null);
            } catch (err) {
                setDetailError(err.message || 'Error al cargar el producto.');
            } finally {
                setDetailStatus('idle');
            }
        }

        async function handleLogin(event) {
            event.preventDefault();
            setLoginStatus('loading');
            setLoginError('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/auth/login'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: loginForm.email,
                        password: loginForm.password,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const message = getErrorMessage(payload, 'No se pudo iniciar sesión.');
                    if (response.status === 403) {
                        setVerifyForm({ email: loginForm.email, code: '' });
                        setVerifyMessage(message);
                        setVerifyError('');
                        navigate('/verify');
                        return;
                    }

                    throw new Error(message);
                }

                if (payload && payload.data && payload.data.twoFactorRequired) {
                    setAdminTwoFactorForm({
                        email: payload.data.email || loginForm.email,
                        code: '',
                    });
                    setAdminTwoFactorMessage('Ingresa el código enviado a tu correo.');
                    setAdminTwoFactorError('');
                    navigate('/admin-2fa');
                    return;
                }

                await saveSession(payload.data);
                setLoginForm({ email: '', password: '' });
            } catch (err) {
                setLoginError(err.message || 'No se pudo iniciar sesión.');
            } finally {
                setLoginStatus('idle');
            }
        }

        async function handleRegister(event) {
            event.preventDefault();
            setRegisterStatus('loading');
            setRegisterError('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/auth/register'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: registerForm.email,
                        password: registerForm.password,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(payload, 'No se pudo registrar el usuario.')
                    );
                }

                setVerifyForm({ email: registerForm.email, code: '' });
                setVerifyMessage('Revisa tu correo y coloca el código de verificación.');
                setVerifyError('');
                navigate('/verify');
                setRegisterForm({ email: '', password: '' });
            } catch (err) {
                setRegisterError(err.message || 'No se pudo registrar el usuario.');
            } finally {
                setRegisterStatus('idle');
            }
        }

        async function handleVerifyEmail(event) {
            event.preventDefault();
            setVerifyStatus('loading');
            setVerifyError('');
            setVerifyMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/auth/verify-email'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: verifyForm.email,
                        code: verifyForm.code,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(payload, 'No se pudo verificar el email.')
                    );
                }

                await saveSession(payload.data);
                setVerifyForm({ email: '', code: '' });
            } catch (err) {
                setVerifyError(err.message || 'No se pudo verificar el email.');
            } finally {
                setVerifyStatus('idle');
            }
        }

        async function handleResendVerification() {
            if (!verifyForm.email) {
                setResendMessage('Ingresa tu email primero.');
                return;
            }

            setResendStatus('loading');
            setResendMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/auth/resend-verification'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: verifyForm.email }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(payload, 'No se pudo reenviar el código.')
                    );
                }

                setResendMessage('Código reenviado. Revisa tu correo.');
            } catch (err) {
                setResendMessage(err.message || 'No se pudo reenviar el código.');
            } finally {
                setResendStatus('idle');
            }
        }

        async function handleAdminTwoFactor(event) {
            event.preventDefault();
            setAdminTwoFactorStatus('loading');
            setAdminTwoFactorError('');
            setAdminTwoFactorMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/auth/admin/verify-2fa'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: adminTwoFactorForm.email,
                        code: adminTwoFactorForm.code,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(payload, 'No se pudo validar el código.')
                    );
                }

                await saveSession(payload.data);
                setAdminTwoFactorForm({ email: '', code: '' });
            } catch (err) {
                setAdminTwoFactorError(err.message || 'No se pudo validar el código.');
            } finally {
                setAdminTwoFactorStatus('idle');
            }
        }

        async function loadProfile() {
            if (!authToken) {
                return;
            }

            setProfileStatus('loading');
            setProfileError('');
            setProfileMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/profile'), {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesión expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo cargar el perfil.'));
                }

                setProfileForm(buildProfileForm(payload.data));
            } catch (err) {
                setProfileError(err.message || 'Error al cargar el perfil.');
            } finally {
                setProfileStatus('idle');
            }
        }

        function buildProfilePayload() {
            const payload = {};
            const firstName = profileForm.firstName.trim();
            const lastName = profileForm.lastName.trim();

            if (firstName) {
                payload.firstName = firstName;
            }

            if (lastName) {
                payload.lastName = lastName;
            }

            const address = {
                receiverName: profileForm.receiverName.trim(),
                phone: profileForm.phone.trim(),
                addressLine1: profileForm.addressLine1.trim(),
                addressLine2: profileForm.addressLine2.trim(),
                country: profileForm.country.trim(),
                city: profileForm.city.trim(),
                district: profileForm.district.trim(),
                postalCode: profileForm.postalCode.trim(),
                reference: profileForm.reference.trim(),
            };

            const hasAddressData = Object.values(address).some((value) => value);
            if (hasAddressData) {
                payload.address = address;
            }

            return payload;
        }

        async function handleProfileSave(event) {
            event.preventDefault();
            if (!authToken) {
                return;
            }

            const payload = buildProfilePayload();
            if (!payload.firstName && !payload.lastName && !payload.address) {
                setProfileError('No hay cambios para guardar.');
                return;
            }

            setProfileStatus('loading');
            setProfileError('');
            setProfileMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/profile'), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify(payload),
                });

                const body = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(getErrorMessage(body, 'No se pudo guardar el perfil.'));
                }

                setProfileForm(buildProfileForm(body.data));
                setProfileMessage('Perfil actualizado correctamente.');
            } catch (err) {
                setProfileError(err.message || 'Error al guardar el perfil.');
            } finally {
                setProfileStatus('idle');
            }
        }

        async function syncGuestCart(token) {
            if (!token) {
                return true;
            }

            const items = readGuestCart();
            if (!items.length) {
                return true;
            }

            const failedItems = [];
            for (const item of items) {
                try {
                    const response = await fetch(buildApiUrl('/api/v1/cart/items'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            sku: item.sku,
                            quantity: item.quantity,
                        }),
                    });

                    if (!response.ok) {
                        failedItems.push(item);
                    }
                } catch (error) {
                    failedItems.push(item);
                }
            }

            if (failedItems.length) {
                writeGuestCart(failedItems);
                return false;
            }

            clearGuestCart();
            return true;
        }

        async function loadCart(tokenOverride) {
            const token = tokenOverride || authToken;
            if (!token) {
                setCartItems(readGuestCart());
                setCartStatus('idle');
                setCartError('');
                setCartMessage('');
                return;
            }

            setCartStatus('loading');
            setCartError('');
            setCartMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/cart'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesion expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo cargar el carrito.'));
                }

                setCartItems(Array.isArray(payload.data && payload.data.items) ? payload.data.items : []);
            } catch (err) {
                setCartError(err.message || 'Error al cargar el carrito.');
            } finally {
                setCartStatus('idle');
            }
        }

        async function loadOrders() {
            if (!authToken) {
                return;
            }

            setOrdersStatus('loading');
            setOrdersError('');
            setOrderDetail(null);
            setOrderDetailError('');
            setOrderDetailStatus('idle');
            try {
                const response = await fetch(
                    buildApiUrl('/api/v1/orders?page=1&pageSize=20'),
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                        },
                    }
                );

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesión expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudieron cargar tus pedidos.'));
                }

                setOrders(Array.isArray(payload.data) ? payload.data : []);
                setOrdersMeta(payload.meta || null);
            } catch (err) {
                setOrdersError(err.message || 'No se pudieron cargar tus pedidos.');
            } finally {
                setOrdersStatus('idle');
            }
        }

        async function loadOrderDetail(orderId) {
            if (!authToken || !orderId) {
                return;
            }

            setOrderDetailStatus('loading');
            setOrderDetailError('');
            try {
                const response = await fetch(buildApiUrl(`/api/v1/orders/${orderId}`), {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesión expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo cargar el pedido.'));
                }

                setOrderDetail(payload.data || null);
            } catch (err) {
                setOrderDetailError(err.message || 'No se pudo cargar el pedido.');
            } finally {
                setOrderDetailStatus('idle');
            }
        }

        async function handleAddToCart(variant) {
            const sku = variant && variant.sku ? variant.sku : '';
            if (!sku) {
                return;
            }

            if (!authToken) {
                const guestItem = buildGuestItem(variant);
                if (!guestItem) {
                    return;
                }

                setCartError('');
                setCartMessage('');
                const current = readGuestCart();
                const existing = current.find((item) => item.sku === guestItem.sku);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    current.push(guestItem);
                }

                const updated = writeGuestCart(current);
                setCartItems(updated);
                setCartMessage('Producto agregado al carrito.');
                return;
            }

            setCartError('');
            setCartMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/cart/items'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        sku,
                        quantity: 1,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesion expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo agregar al carrito.'));
                }

                setCartItems(Array.isArray(payload.data && payload.data.items) ? payload.data.items : []);
                setCartMessage('Producto agregado al carrito.');
            } catch (err) {
                setCartError(err.message || 'No se pudo agregar al carrito.');
            }
        }

        async function handleUpdateCartQuantity(sku, quantity) {
            if (!sku) {
                return;
            }

            if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
                return;
            }

            setCartError('');
            setCartMessage('');
            if (!authToken) {
                const current = readGuestCart();
                const updated = current.map((item) =>
                    item.sku === sku
                        ? { ...item, quantity: Math.floor(Number(quantity)) }
                        : item
                );
                setCartItems(writeGuestCart(updated));
                return;
            }

            try {
                const response = await fetch(buildApiUrl(`/api/v1/cart/items/${sku}`), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        quantity: Number(quantity),
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesion expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo actualizar el carrito.'));
                }

                setCartItems(Array.isArray(payload.data && payload.data.items) ? payload.data.items : []);
            } catch (err) {
                setCartError(err.message || 'No se pudo actualizar el carrito.');
            }
        }

        async function handleRemoveCartItem(sku) {
            if (!sku) {
                return;
            }

            setCartError('');
            setCartMessage('');
            if (!authToken) {
                const updated = writeGuestCart(
                    readGuestCart().filter((item) => item.sku !== sku)
                );
                setCartItems(updated);
                return;
            }

            try {
                const response = await fetch(buildApiUrl(`/api/v1/cart/items/${sku}`), {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesion expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo eliminar el item.'));
                }

                setCartItems(Array.isArray(payload.data && payload.data.items) ? payload.data.items : []);
            } catch (err) {
                setCartError(err.message || 'No se pudo eliminar el item.');
            }
        }

        async function handleClearCart() {
            setCartError('');
            setCartMessage('');
            if (!authToken) {
                clearGuestCart();
                setCartItems([]);
                setCartMessage('Carrito vacío.');
                return;
            }

            try {
                const response = await fetch(buildApiUrl('/api/v1/cart'), {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesion expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo vaciar el carrito.'));
                }

                setCartItems([]);
                setCartMessage('Carrito vacío.');
            } catch (err) {
                setCartError(err.message || 'No se pudo vaciar el carrito.');
            }
        }

        async function handleValidateDiscount() {
            const code = discountCode.trim();
            if (!code) {
                setDiscountMessage('Ingresa un código.');
                return;
            }

            if (!cartItems.length) {
                setDiscountMessage('Tu carrito está vacío.');
                return;
            }

            const subtotal = cartItems.reduce(
                (total, item) => total + (Number(item.price) || 0) * item.quantity,
                0
            );

            setDiscountStatus('loading');
            setDiscountMessage('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/discounts/validate'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code,
                        subtotal,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(getErrorMessage(payload, 'No se pudo validar el código.'));
                }

                const data = payload.data || {};
                setDiscountAmount(
                    Number.isFinite(Number(data.discountAmount))
                        ? Number(data.discountAmount)
                        : null
                );
                setDiscountedSubtotal(
                    Number.isFinite(Number(data.finalSubtotal))
                        ? Number(data.finalSubtotal)
                        : null
                );
                setDiscountMessage('Código aplicado.');
            } catch (err) {
                setDiscountAmount(null);
                setDiscountedSubtotal(null);
                setDiscountMessage(err.message || 'No se pudo validar el código.');
            } finally {
                setDiscountStatus('idle');
            }
        }

        async function handleCreateOrder() {
            if (!authToken) {
                navigate('/login');
                return;
            }

            if (!cartItems.length) {
                setCartError('Tu carrito está vacío.');
                return;
            }

            setCartError('');
            setCartMessage('');
            setPendingOrder(null);
            setPaymentError('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/orders'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        discountCode: discountCode.trim() || null,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesión expirada.');
                    }

                    throw new Error(getErrorMessage(payload, 'No se pudo crear la orden.'));
                }

                const orderId = payload.data && payload.data.id ? payload.data.id : null;
                const total = payload.data && Number(payload.data.total);
                const shippingCost = payload.data && Number(payload.data.shippingCost);
                let message = orderId
                    ? `Orden creada #${orderId}.`
                    : 'Orden creada.';
                if (Number.isFinite(total)) {
                    const shippingLabel = Number.isFinite(shippingCost)
                        ? ` (envio ${formatPrice(shippingCost)})`
                        : '';
                    message = `${message} Total: ${formatPrice(total)}${shippingLabel}`;
                }

                setCartItems([]);
                setDiscountCode('');
                setDiscountAmount(null);
                setDiscountedSubtotal(null);
                setDiscountMessage('');
                setPendingOrder(
                    orderId
                        ? {
                            id: orderId,
                            total: Number.isFinite(total) ? total : null,
                            shippingCost: Number.isFinite(shippingCost) ? shippingCost : null,
                        }
                        : null
                );
                setCartMessage(`${message} Ahora puedes pagar con Stripe.`);
            } catch (err) {
                setCartError(err.message || 'No se pudo crear la orden.');
            }
        }

        async function handleStripeCheckout() {
            if (!authToken) {
                navigate('/login');
                return;
            }

            if (!pendingOrder || !pendingOrder.id) {
                setPaymentError('No hay una orden pendiente para pagar.');
                return;
            }

            setPaymentStatus('loading');
            setPaymentError('');
            try {
                const response = await fetch(buildApiUrl('/api/v1/payments/stripe/session'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        orderId: pendingOrder.id,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSession();
                        throw new Error('Sesión expirada.');
                    }

                    throw new Error(
                        getErrorMessage(payload, 'No se pudo iniciar el pago con Stripe.')
                    );
                }

                const checkoutUrl = payload.data && payload.data.checkoutUrl;
                if (!checkoutUrl) {
                    throw new Error('No se pudo iniciar el pago con Stripe.');
                }

                window.location.assign(checkoutUrl);
            } catch (err) {
                setPaymentError(err.message || 'No se pudo iniciar el pago con Stripe.');
                setPaymentStatus('idle');
            }
        }

        const cards = variants.map((variant) =>
            createElement(
                'article',
                { className: 'card', key: variant.sku },
                createElement('h3', { className: 'card__title' }, getVariantTitle(variant)),
                createElement('p', { className: 'card__meta' }, `SKU: ${variant.sku}`),
                createElement('p', { className: 'card__meta' }, formatPrice(variant.price)),
                createElement(
                    'p',
                    { className: 'card__meta' },
                    `Stock disponible: ${variant.stockAvailable}`
                ),
                createElement(
                    'button',
                    {
                        className: 'button button--ghost',
                        type: 'button',
                        onClick: () => loadVariantDetail(variant.sku),
                    },
                    'Ver detalle'
                ),
                createElement(
                    'button',
                    {
                        className: 'button button--primary',
                        type: 'button',
                        onClick: () => handleAddToCart(variant),
                    },
                    'Agregar al carrito'
                )
            )
        );

        const cartRows = cartItems.map((item) =>
            createElement(
                'div',
                { className: 'cart__row', key: item.sku },
                createElement(
                    'div',
                    { className: 'cart__info' },
                    createElement(
                        'h3',
                        { className: 'cart__title' },
                        item.variantName
                            ? `${item.productName} - ${item.variantName}`
                            : item.productName
                    ),
                    createElement('p', { className: 'cart__meta' }, `SKU: ${item.sku}`),
                    createElement('p', { className: 'cart__meta' }, formatPrice(item.price))
                ),
                createElement(
                    'div',
                    { className: 'cart__actions' },
                    createElement(
                        'button',
                        {
                            className: 'button button--ghost',
                            type: 'button',
                            disabled: item.quantity <= 1,
                            onClick: () =>
                                handleUpdateCartQuantity(item.sku, item.quantity - 1),
                        },
                        '-'
                    ),
                    createElement('span', { className: 'cart__qty' }, item.quantity),
                    createElement(
                        'button',
                        {
                            className: 'button button--ghost',
                            type: 'button',
                            onClick: () =>
                                handleUpdateCartQuantity(item.sku, item.quantity + 1),
                        },
                        '+'
                    ),
                    createElement(
                        'button',
                        {
                            className: 'button button--danger',
                            type: 'button',
                            onClick: () => handleRemoveCartItem(item.sku),
                        },
                        'Eliminar'
                    )
                )
            )
        );

        const orderCards = orders.map((order) =>
            createElement(
                'article',
                { className: 'card', key: order.id },
                createElement('h3', { className: 'card__title' }, `Pedido #${order.id}`),
                createElement('p', { className: 'card__meta' }, `Estado: ${order.orderStatus}`),
                createElement('p', { className: 'card__meta' }, `Pago: ${order.paymentStatus}`),
                createElement(
                    'p',
                    { className: 'card__meta' },
                    `Total: ${formatPrice(order.total)}`
                ),
                createElement(
                    'p',
                    { className: 'card__meta' },
                    `Fecha: ${formatDate(order.createdAt)}`
                ),
                createElement(
                    'button',
                    {
                        className: 'button button--primary',
                        type: 'button',
                        onClick: () => loadOrderDetail(order.id),
                    },
                    'Ver detalle'
                )
            )
        );

        const orderDetailItems = orderDetail && Array.isArray(orderDetail.items)
            ? orderDetail.items.map((item, index) =>
                createElement(
                    'p',
                    { className: 'detail__item', key: `${item.sku}-${index}` },
                    `- ${item.productName || 'Producto'}${item.variantName ? ` - ${item.variantName}` : ''} x${item.quantity} (${formatPrice(item.price)})`
                )
            )
            : [];

        const isLoginView = view === 'login';
        const isRegisterView = view === 'register';
        const isVerifyView = view === 'verify';
        const isAdminTwoFactorView = view === 'admin-2fa';
        const isProfileView = view === 'profile';
        const isCartView = view === 'cart';
        const isOrdersView = view === 'orders';
        const isHomeView = view === 'home';
        const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
        const cartSubtotal = cartItems.reduce(
            (total, item) => total + (Number(item.price) || 0) * item.quantity,
            0
        );
        const cartNotice = !isLoggedIn
            ? createElement(
                'div',
                { className: 'auth__actions' },
                createElement(
                    'p',
                    { className: 'status' },
                    'Carrito local. Inicia sesión para sincronizarlo.'
                ),
                createElement(
                    'button',
                    {
                        className: 'button button--primary',
                        type: 'button',
                        onClick: () => navigate('/login'),
                    },
                    'Iniciar sesión'
                )
            )
            : null;

        return createElement(
            'main',
            { className: 'app' },
            createElement(
                'header',
                { className: 'header' },
                createElement(
                    'a',
                    {
                        className: 'header__title',
                        href: '/',
                        onClick: (event) => handleNavClick(event, '/'),
                    },
                    'Spacegurumis'
                ),
                createElement(
                    'nav',
                    { className: 'nav' },
                    createElement(
                        'button',
                        {
                            className: 'button button--ghost',
                            type: 'button',
                            onClick: () => navigate('/cart'),
                        },
                        cartCount ? `Carrito (${cartCount})` : 'Carrito'
                    ),
                    isLoggedIn
                        ? createElement(
                            'button',
                            {
                                className: 'button button--ghost',
                                type: 'button',
                                onClick: () => navigate('/orders'),
                            },
                            'Mis pedidos'
                        )
                        : null,
                    !isLoggedIn
                        ? createElement(
                            'button',
                            {
                                className: 'button button--ghost',
                                type: 'button',
                                onClick: () => navigate('/register'),
                            },
                            'Registrarse'
                        )
                        : null,
                    !isLoggedIn
                        ? createElement(
                            'button',
                            {
                                className: 'button button--primary',
                                type: 'button',
                                onClick: () => navigate('/login'),
                            },
                            'Iniciar sesión'
                        )
                        : null,
                    isLoggedIn
                        ? createElement(
                            'button',
                            {
                                className: 'button button--ghost',
                                type: 'button',
                                onClick: () => navigate('/profile'),
                            },
                            'Perfil'
                        )
                        : null,
                    isLoggedIn
                        ? createElement(
                            'button',
                            {
                                className: 'button button--danger',
                                type: 'button',
                                onClick: clearSession,
                            },
                            'Cerrar sesión'
                        )
                        : null
                )
            ),
            isHomeView
                ? createElement(
                    'p',
                    { className: 'lead' },
                    'Catálogo de productos disponibles.'
                )
                : null,
            isLoginView || isRegisterView
                ? createElement(
                    'section',
                    { className: 'auth auth--page' },
                    createElement(
                        'div',
                        { className: 'auth__header' },
                        createElement(
                            'h2',
                            { className: 'section-title' },
                            isLoginView ? 'Iniciar sesión' : 'Crear cuenta'
                        ),
                        createElement(
                            'p',
                            { className: 'section-note' },
                            isLoginView
                                ? 'Ingresa con tu email o usa Google.'
                                : 'Completa tu nombre luego desde el perfil.'
                        )
                    ),
                    createElement(
                        'div',
                        { className: 'auth__actions' },
                        createElement(
                            'button',
                            {
                                className: 'button button--dark',
                                type: 'button',
                                onClick: handleGoogleLogin,
                            },
                            'Continuar con Google'
                        )
                    ),
                    isRegisterView
                        ? createElement(
                            'form',
                            { className: 'form', onSubmit: handleRegister },
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Email'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'email',
                                    required: true,
                                    value: registerForm.email,
                                    onChange: (event) =>
                                        setRegisterForm((prev) => ({
                                            ...prev,
                                            email: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Contraseña'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'password',
                                    required: true,
                                    minLength: 6,
                                    value: registerForm.password,
                                    onChange: (event) =>
                                        setRegisterForm((prev) => ({
                                            ...prev,
                                            password: event.target.value,
                                        })),
                                })
                            ),
                            registerError
                                ? createElement(
                                    'p',
                                    { className: 'status status--error' },
                                    registerError
                                )
                                : null,
                            createElement(
                                'button',
                                {
                                    className: 'button button--primary',
                                    type: 'submit',
                                    disabled: registerStatus === 'loading',
                                },
                                registerStatus === 'loading'
                                    ? 'Registrando...'
                                    : 'Crear cuenta'
                            )
                        )
                        : createElement(
                            'form',
                            { className: 'form', onSubmit: handleLogin },
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Email'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'email',
                                    required: true,
                                    value: loginForm.email,
                                    onChange: (event) =>
                                        setLoginForm((prev) => ({
                                            ...prev,
                                            email: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Contraseña'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'password',
                                    required: true,
                                    minLength: 6,
                                    value: loginForm.password,
                                    onChange: (event) =>
                                        setLoginForm((prev) => ({
                                            ...prev,
                                            password: event.target.value,
                                        })),
                                })
                            ),
                            loginError
                                ? createElement(
                                    'p',
                                    { className: 'status status--error' },
                                    loginError
                                )
                                : null,
                            createElement(
                                'button',
                                {
                                    className: 'button button--primary',
                                    type: 'submit',
                                    disabled: loginStatus === 'loading',
                                },
                                loginStatus === 'loading'
                                    ? 'Ingresando...'
                                    : 'Ingresar'
                            )
                        ),
                    createElement(
                        'div',
                        { className: 'auth__switch' },
                        createElement(
                            'span',
                            null,
                            isLoginView ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'
                        ),
                        createElement(
                            'button',
                            {
                                className: 'button button--ghost',
                                type: 'button',
                                onClick: () =>
                                    navigate(isLoginView ? '/register' : '/login'),
                            },
                            isLoginView ? 'Registrarse' : 'Iniciar sesión'
                        )
                    )
                )
                : null,
            isVerifyView
                ? createElement(
                    'section',
                    { className: 'auth auth--page' },
                    createElement(
                        'div',
                        { className: 'auth__header' },
                        createElement(
                            'h2',
                            { className: 'section-title' },
                            'Verificar email'
                        ),
                        createElement(
                            'p',
                            { className: 'section-note' },
                            'Ingresa el código de 6 dígitos que enviamos a tu correo.'
                        )
                    ),
                    createElement(
                        'form',
                        { className: 'form', onSubmit: handleVerifyEmail },
                        createElement(
                            'label',
                            { className: 'field' },
                            createElement('span', { className: 'field__label' }, 'Email'),
                            createElement('input', {
                                className: 'field__input',
                                type: 'email',
                                required: true,
                                value: verifyForm.email,
                                onChange: (event) =>
                                    setVerifyForm((prev) => ({
                                        ...prev,
                                        email: event.target.value,
                                    })),
                            })
                        ),
                        createElement(
                            'label',
                            { className: 'field' },
                            createElement('span', { className: 'field__label' }, 'Código'),
                            createElement('input', {
                                className: 'field__input',
                                type: 'text',
                                required: true,
                                maxLength: 6,
                                value: verifyForm.code,
                                onChange: (event) =>
                                    setVerifyForm((prev) => ({
                                        ...prev,
                                        code: event.target.value,
                                    })),
                            })
                        ),
                        verifyError
                            ? createElement(
                                'p',
                                { className: 'status status--error' },
                                verifyError
                            )
                            : null,
                        verifyMessage
                            ? createElement(
                                'p',
                                { className: 'status' },
                                verifyMessage
                            )
                            : null,
                        resendMessage
                            ? createElement(
                                'p',
                                { className: 'status' },
                                resendMessage
                            )
                            : null,
                        createElement(
                            'button',
                            {
                                className: 'button button--primary',
                                type: 'submit',
                                disabled: verifyStatus === 'loading',
                            },
                            verifyStatus === 'loading'
                                ? 'Verificando...'
                                : 'Confirmar'
                        ),
                        createElement(
                            'button',
                            {
                                className: 'button button--ghost',
                                type: 'button',
                                onClick: handleResendVerification,
                                disabled: resendStatus === 'loading',
                            },
                            resendStatus === 'loading'
                                ? 'Reenviando...'
                                : 'Reenviar código'
                        )
                    ),
                    createElement(
                        'div',
                        { className: 'auth__switch' },
                        createElement(
                            'span',
                            null,
                            '¿Ya verificaste?'
                        ),
                        createElement(
                            'button',
                            {
                                className: 'button button--ghost',
                                type: 'button',
                                onClick: () => navigate('/login'),
                            },
                            'Iniciar sesión'
                        )
                    )
                )
                : null,
            isAdminTwoFactorView
                ? createElement(
                    'section',
                    { className: 'auth auth--page' },
                    createElement(
                        'div',
                        { className: 'auth__header' },
                        createElement(
                            'h2',
                            { className: 'section-title' },
                            'Verificación admin'
                        ),
                        createElement(
                            'p',
                            { className: 'section-note' },
                            'Ingresa el código 2FA enviado a tu correo.'
                        )
                    ),
                    createElement(
                        'form',
                        { className: 'form', onSubmit: handleAdminTwoFactor },
                        createElement(
                            'label',
                            { className: 'field' },
                            createElement('span', { className: 'field__label' }, 'Email'),
                            createElement('input', {
                                className: 'field__input',
                                type: 'email',
                                required: true,
                                value: adminTwoFactorForm.email,
                                onChange: (event) =>
                                    setAdminTwoFactorForm((prev) => ({
                                        ...prev,
                                        email: event.target.value,
                                    })),
                            })
                        ),
                        createElement(
                            'label',
                            { className: 'field' },
                            createElement('span', { className: 'field__label' }, 'Código'),
                            createElement('input', {
                                className: 'field__input',
                                type: 'text',
                                required: true,
                                maxLength: 6,
                                value: adminTwoFactorForm.code,
                                onChange: (event) =>
                                    setAdminTwoFactorForm((prev) => ({
                                        ...prev,
                                        code: event.target.value,
                                    })),
                            })
                        ),
                        adminTwoFactorError
                            ? createElement(
                                'p',
                                { className: 'status status--error' },
                                adminTwoFactorError
                            )
                            : null,
                        adminTwoFactorMessage
                            ? createElement(
                                'p',
                                { className: 'status' },
                                adminTwoFactorMessage
                            )
                            : null,
                        createElement(
                            'button',
                            {
                                className: 'button button--primary',
                                type: 'submit',
                                disabled: adminTwoFactorStatus === 'loading',
                            },
                            adminTwoFactorStatus === 'loading'
                                ? 'Validando...'
                                : 'Confirmar'
                        )
                    ),
                    createElement(
                        'div',
                        { className: 'auth__switch' },
                        createElement(
                            'span',
                            null,
                            '¿No recibiste el código?'
                        ),
                        createElement(
                            'button',
                            {
                                className: 'button button--ghost',
                                type: 'button',
                                onClick: () => navigate('/login'),
                            },
                            'Volver a login'
                        )
                    )
                )
                : null,
            isProfileView
                ? createElement(
                    'section',
                    { className: 'profile' },
                    createElement('h2', { className: 'section-title' }, 'Perfil'),
                    !isLoggedIn
                        ? createElement(
                            'div',
                            { className: 'auth__actions' },
                            createElement(
                                'p',
                                { className: 'status' },
                                'Inicia sesión para ver tu perfil.'
                            ),
                            createElement(
                                'button',
                                {
                                    className: 'button button--primary',
                                    type: 'button',
                                    onClick: () => navigate('/login'),
                                },
                                'Ir a login'
                            )
                        )
                        : createElement(
                            'form',
                            { className: 'form form--wide', onSubmit: handleProfileSave },
                        createElement(
                            'div',
                            { className: 'form__grid' },
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Nombre'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.firstName,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            firstName: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Apellido'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.lastName,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            lastName: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Receptor'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.receiverName,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            receiverName: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Teléfono'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.phone,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            phone: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Dirección'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.addressLine1,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            addressLine1: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Referencia'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.reference,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            reference: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Dirección 2'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.addressLine2,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            addressLine2: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Distrito'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.district,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            district: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'Ciudad'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.city,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            city: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement('span', { className: 'field__label' }, 'País'),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.country,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            country: event.target.value,
                                        })),
                                })
                            ),
                            createElement(
                                'label',
                                { className: 'field' },
                                createElement(
                                    'span',
                                    { className: 'field__label' },
                                    'Código postal'
                                ),
                                createElement('input', {
                                    className: 'field__input',
                                    type: 'text',
                                    value: profileForm.postalCode,
                                    onChange: (event) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            postalCode: event.target.value,
                                        })),
                                })
                            )
                        ),
                        profileError
                            ? createElement(
                                'p',
                                { className: 'status status--error' },
                                profileError
                            )
                            : null,
                        profileMessage
                            ? createElement(
                                'p',
                                { className: 'status status--success' },
                                profileMessage
                            )
                            : null,
                        createElement(
                            'button',
                            {
                                className: 'button button--primary',
                                type: 'submit',
                                disabled: profileStatus === 'loading',
                            },
                            profileStatus === 'loading'
                                ? 'Guardando...'
                                : 'Guardar perfil'
                        )
                    )
                )
                : null,
            isOrdersView
                ? createElement(
                    'section',
                    { className: 'orders' },
                    createElement('h2', { className: 'section-title' }, 'Mis pedidos'),
                    !isLoggedIn
                        ? createElement(
                            'div',
                            { className: 'auth__actions' },
                            createElement(
                                'p',
                                { className: 'status' },
                                'Inicia sesión para ver tus pedidos.'
                            ),
                            createElement(
                                'button',
                                {
                                    className: 'button button--primary',
                                    type: 'button',
                                    onClick: () => navigate('/login'),
                                },
                                'Ir a login'
                            )
                        )
                        : createElement(
                            'div',
                            { className: 'orders__content' },
                            ordersStatus === 'loading'
                                ? createElement(
                                    'p',
                                    { className: 'status' },
                                    'Cargando pedidos...'
                                )
                                : null,
                            ordersError
                                ? createElement(
                                    'p',
                                    { className: 'status status--error' },
                                    ordersError
                                )
                                : null,
                            ordersStatus === 'idle' && !orders.length
                                ? createElement(
                                    'p',
                                    { className: 'status' },
                                    'No tienes pedidos registrados.'
                                )
                                : null,
                            orders.length
                                ? createElement(
                                    'div',
                                    { className: 'orders__list' },
                                    orderCards
                                )
                                : null,
                            orderDetailStatus === 'loading'
                                ? createElement(
                                    'p',
                                    { className: 'status' },
                                    'Cargando detalle del pedido...'
                                )
                                : null,
                            orderDetailError
                                ? createElement(
                                    'p',
                                    { className: 'status status--error' },
                                    orderDetailError
                                )
                                : null,
                            orderDetail
                                ? createElement(
                                    'div',
                                    { className: 'detail' },
                                    createElement(
                                        'h3',
                                        { className: 'detail__title' },
                                        `Detalle de pedido #${orderDetail.id}`
                                    ),
                                    createElement(
                                        'div',
                                        { className: 'detail__content' },
                                        createElement(
                                            'p',
                                            null,
                                            `Estado: ${orderDetail.orderStatus}`
                                        ),
                                        createElement(
                                            'p',
                                            null,
                                            `Pago: ${orderDetail.paymentStatus}`
                                        ),
                                        createElement(
                                            'p',
                                            null,
                                            `Fecha: ${formatDate(orderDetail.createdAt)}`
                                        ),
                                        createElement(
                                            'p',
                                            null,
                                            `Subtotal: ${formatPrice(orderDetail.subtotal)}`
                                        ),
                                        createElement(
                                            'p',
                                            null,
                                            `Envío: ${formatPrice(orderDetail.shippingCost)}`
                                        ),
                                        orderDetail.discountAmount
                                            ? createElement(
                                                'p',
                                                null,
                                                `Descuento: -${formatPrice(orderDetail.discountAmount)}`
                                            )
                                            : null,
                                        createElement(
                                            'p',
                                            null,
                                            `Total: ${formatPrice(orderDetail.total)}`
                                        ),
                                        createElement('p', null, 'Productos:'),
                                        orderDetailItems.length
                                            ? orderDetailItems
                                            : createElement(
                                                'p',
                                                { className: 'status' },
                                                'Sin items.'
                                            )
                                    )
                                )
                                : null
                        )
                )
                : null,
            isCartView
                ? createElement(
                    'section',
                    { className: 'cart' },
                    createElement('h2', { className: 'section-title' }, 'Carrito'),
                    createElement(
                        'div',
                        { className: 'cart__content' },
                        cartNotice,
                        cartStatus === 'loading'
                            ? createElement(
                                'p',
                                { className: 'status' },
                                'Cargando carrito...'
                            )
                            : null,
                        cartSyncError
                            ? createElement(
                                'p',
                                { className: 'status status--error' },
                                cartSyncError
                            )
                            : null,
                        cartError
                            ? createElement(
                                'p',
                                { className: 'status status--error' },
                                cartError
                            )
                            : null,
                        cartMessage
                            ? createElement(
                                'p',
                                { className: 'status status--success' },
                                cartMessage
                            )
                            : null,
                        cartStatus === 'idle' && !cartItems.length
                            ? createElement(
                                'p',
                                { className: 'status' },
                                'Tu carrito está vacío.'
                            )
                            : null,
                        cartItems.length
                            ? createElement(
                                'div',
                                { className: 'cart__list' },
                                cartRows
                            )
                            : null,
                        cartItems.length
                            ? createElement(
                                'div',
                                { className: 'cart__summary' },
                                createElement(
                                    'div',
                                    { className: 'cart__discount' },
                                    createElement(
                                        'label',
                                        { className: 'field' },
                                        createElement(
                                            'span',
                                            { className: 'field__label' },
                                            'Código de descuento'
                                        ),
                                        createElement('input', {
                                            className: 'field__input',
                                            type: 'text',
                                            value: discountCode,
                                            onChange: (event) =>
                                                setDiscountCode(event.target.value),
                                        })
                                    ),
                                    createElement(
                                        'button',
                                        {
                                            className: 'button button--ghost',
                                            type: 'button',
                                            onClick: handleValidateDiscount,
                                            disabled: discountStatus === 'loading',
                                        },
                                        discountStatus === 'loading'
                                            ? 'Validando...'
                                            : 'Validar código'
                                    ),
                                    discountMessage
                                        ? createElement(
                                            'p',
                                            { className: 'status' },
                                            discountMessage
                                        )
                                        : null,
                                    Number.isFinite(discountAmount)
                                        ? createElement(
                                            'p',
                                            { className: 'status' },
                                            `Descuento: -${formatPrice(discountAmount)}`
                                        )
                                        : null,
                                    Number.isFinite(discountedSubtotal)
                                        ? createElement(
                                            'p',
                                            { className: 'status' },
                                            `Subtotal con descuento: ${formatPrice(discountedSubtotal)}`
                                        )
                                        : null
                                ),
                                isLoggedIn
                                    ? createElement(
                                        'button',
                                        {
                                            className: 'button button--primary',
                                            type: 'button',
                                            onClick: handleCreateOrder,
                                        },
                                        'Crear orden'
                                    )
                                    : null,
                                createElement(
                                    'div',
                                    { className: 'cart__summary-actions' },
                                    createElement(
                                        'p',
                                        { className: 'cart__total' },
                                        `Subtotal: ${formatPrice(cartSubtotal)}`
                                    ),
                                    isLoggedIn
                                        ? createElement(
                                            'button',
                                            {
                                                className: 'button button--primary',
                                                type: 'button',
                                                onClick: handleCreateOrder,
                                            },
                                            'Crear orden'
                                        )
                                        : null,
                                    createElement(
                                        'button',
                                        {
                                            className: 'button button--danger',
                                            type: 'button',
                                            onClick: handleClearCart,
                                        },
                                        'Vaciar carrito'
                                    )
                                )
                            )
                            : null
                    )
                )
                : null,
            isCartView && pendingOrder && pendingOrder.id
                ? createElement(
                    'section',
                    { className: 'cart' },
                    createElement('h2', { className: 'section-title' }, 'Pago pendiente'),
                    createElement(
                        'p',
                        { className: 'section-note' },
                        `Orden #${pendingOrder.id} lista para pagar.`
                    ),
                    Number.isFinite(pendingOrder.total)
                        ? createElement(
                            'p',
                            { className: 'cart__total' },
                            `Total: ${formatPrice(pendingOrder.total)}`
                        )
                        : null,
                    createElement(
                        'div',
                        { className: 'cart__summary-actions' },
                        createElement(
                            'button',
                            {
                                className: 'button button--dark',
                                type: 'button',
                                onClick: handleStripeCheckout,
                                disabled: paymentStatus === 'loading',
                            },
                            paymentStatus === 'loading'
                                ? 'Redirigiendo...'
                                : 'Pagar con Stripe'
                        ),
                        whatsappNumber
                            ? createElement(
                                'a',
                                {
                                    className: 'button button--whatsapp',
                                    href: buildWhatsappUrl(
                                        buildWhatsappMessage({ order: pendingOrder })
                                    ),
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                },
                                'Consultar por WhatsApp'
                            )
                            : null
                    ),
                    paymentError
                        ? createElement(
                            'p',
                            { className: 'status status--error' },
                            paymentError
                        )
                        : null
                )
                : null,
            isHomeView
                ? createElement(
                    'div',
                    null,
                    error
                        ? createElement('p', { className: 'status status--error' }, error)
                        : null,
                    status === 'loading'
                        ? createElement('p', { className: 'status' }, 'Cargando catálogo...')
                        : null,
                    status === 'idle' && !variants.length
                        ? createElement(
                            'p',
                            { className: 'status' },
                            'No hay productos registrados.'
                        )
                        : null,
                    createElement('section', { className: 'catalog' }, cards),
                    catalogTotalPages > 1
                        ? createElement(
                            'div',
                            { className: 'pagination' },
                            createElement(
                                'button',
                                {
                                    className: 'button button--ghost',
                                    type: 'button',
                                    onClick: handleCatalogPrev,
                                    disabled: catalogPage <= 1 || status === 'loading',
                                },
                                'Anterior'
                            ),
                            createElement(
                                'span',
                                { className: 'pagination__info' },
                                `Página ${catalogPage} de ${catalogTotalPages}`
                            ),
                            createElement(
                                'button',
                                {
                                    className: 'button button--ghost',
                                    type: 'button',
                                    onClick: handleCatalogNext,
                                    disabled: catalogPage >= catalogTotalPages || status === 'loading',
                                },
                                'Siguiente'
                            )
                        )
                        : null,
                    createElement(
                        'section',
                        { className: 'detail' },
                        createElement('h2', null, 'Detalle de producto'),
                        detailError
                            ? createElement(
                                'p',
                                { className: 'status status--error' },
                                detailError
                            )
                            : null,
                        detailStatus === 'loading'
                            ? createElement(
                                'p',
                                { className: 'status' },
                                'Cargando detalle...'
                            )
                            : null,
                        detailStatus === 'idle' && selected
                            ? createElement(
                                'div',
                                { className: 'detail__content' },
                                createElement('h3', null, getVariantTitle(selected)),
                                createElement('p', null, `SKU: ${selected.sku}`),
                                createElement('p', null, formatPrice(selected.price)),
                                createElement(
                                    'p',
                                    null,
                                    `Stock disponible: ${selected.stockAvailable}`
                                ),
                                createElement(
                                    'p',
                                    null,
                                    selected.product && selected.product.description
                                        ? selected.product.description
                                        : 'Sin descripción'
                                ),
                                createElement(
                                    'button',
                                    {
                                        className: 'button button--primary',
                                        type: 'button',
                                        onClick: () => handleAddToCart(selected),
                                    },
                                    'Agregar al carrito'
                                ),
                                whatsappNumber
                                    ? createElement(
                                        'a',
                                        {
                                            className: 'button button--whatsapp',
                                            href: buildWhatsappUrl(
                                                buildWhatsappMessage({ variant: selected })
                                            ),
                                            target: '_blank',
                                            rel: 'noopener noreferrer',
                                        },
                                        'Consultar por WhatsApp'
                                    )
                                    : null
                            )
                            : createElement(
                                'p',
                                { className: 'status' },
                                'Selecciona un producto para ver el detalle.'
                            )
                    )
                )
                : null
        );
    }

    root.render(createElement(App));
})();
