const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');  // Desactiva el heacder X-Powered-By: Express

const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://spacegurumis.lat',
    'https://www.spacegurumis.lat',
]);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            const isAllowed = allowedOrigins.has(origin);
            return callback(null, isAllowed);
        },
    })
);
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
app.use(adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
