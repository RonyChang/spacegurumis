const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { trustProxy } = require('./config');
const { parseCsv } = require('./utils/env');
const { normalizeOrigin } = require('./utils/origin');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const catalogRoutes = require('./routes/catalog.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const discountRoutes = require('./routes/discount.routes');
const paymentRoutes = require('./routes/payment.routes');
const stripeWebhookRoutes = require('./routes/stripeWebhook.routes');
const adminRoutes = require('./routes/admin.routes');
const siteAssetsRoutes = require('./routes/siteAssets.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const cookieParser = require('./middlewares/cookieParser');
const securityHeaders = require('./middlewares/securityHeaders');

const app = express();

app.disable('x-powered-by');  // Desactiva el heacder X-Powered-By: Express
if (trustProxy) {
    app.set('trust proxy', 1);
}

function buildCorsAllowedOrigins() {
    const envOrigins = parseCsv(process.env.CORS_ALLOWED_ORIGINS)
        .map(normalizeOrigin)
        .filter(Boolean);

    // If explicitly set, use env var as source of truth.
    if (envOrigins.length) {
        return new Set(envOrigins);
    }

    // Backwards compatible fallback (current hardcoded behavior).
    return new Set([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:4321',
        'http://127.0.0.1:4321',
        'https://spacegurumis.lat',
        'https://www.spacegurumis.lat',
    ].map(normalizeOrigin).filter(Boolean));
}

const allowedOrigins = buildCorsAllowedOrigins();

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            const isAllowed = allowedOrigins.has(normalizeOrigin(origin));
            return callback(null, isAllowed);
        },
        credentials: true,
    })
);

app.use(securityHeaders);
app.use(cookieParser);

app.use(
    '/api/v1/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhookRoutes
);
app.use(express.json());
app.use(morgan('dev'));

app.use(healthRoutes);
app.use(authRoutes);
app.use(profileRoutes);
app.use(catalogRoutes);
app.use(cartRoutes);
app.use(orderRoutes);
app.use(discountRoutes);
app.use(paymentRoutes);
app.use(siteAssetsRoutes);
app.use(adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
