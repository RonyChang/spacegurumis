const orderService = require('./order.service');

function resolveHoldMinutes() {
    const raw = process.env.PAYMENT_HOLD_MINUTES;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }

    return 3;
}

function startOrderExpiryJob() {
    const intervalMs = 60 * 1000;
    let running = false;

    const run = async () => {
        if (running) {
            return;
        }

        running = true;
        try {
            const holdMinutes = resolveHoldMinutes();
            const cancelled = await orderService.cancelExpiredOrders(holdMinutes);
            if (cancelled > 0) {
                console.log(`Ordenes expiradas canceladas: ${cancelled}`);
            }
        } catch (error) {
            console.error('Error en job de expiracion de ordenes:', error.message || error);
        } finally {
            running = false;
        }
    };

    run();
    setInterval(run, intervalMs);
}

module.exports = {
    startOrderExpiryJob,
};
