require('dotenv').config();

const app = require('./app');
const { port } = require('./config');
const { sequelize } = require('./models');
const { startOrderExpiryJob } = require('./services/orderExpiry.service');
const { bootstrapAdmins } = require('./services/adminBootstrap.service');

sequelize.authenticate()
    .then(() => {
        bootstrapAdmins()
            .then((summary) => {
                if (summary.total) {
                    console.log(
                        `Admin bootstrap: ${summary.promoted} promovidos, ` +
                        `${summary.created} creados, ${summary.skipped} omitidos.`
                    );
                }
            })
            .catch((error) => {
                console.error('Error en admin bootstrap:', error.message || error);
            });
        app.listen(port, () => {
            console.log(`Servidor escuchando en puerto ${port}`);
        });
        startOrderExpiryJob();
    })
    .catch((error) => {
        console.error('Error al conectar con la base de datos:', error.message || error);
        process.exit(1);
    });
