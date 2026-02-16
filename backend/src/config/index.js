const { parseBoolean } = require('../utils/env');
const { buildRuntimeConfig, buildIntegrationConfig } = require('./envContract');

// Validamos env critico una sola vez al cargar configuracion.
const runtimeConfig = buildRuntimeConfig(process.env);
// Centralizamos lectura de integraciones para evitar process.env disperso.
const integrations = buildIntegrationConfig(process.env);

const trustProxy = parseBoolean(process.env.TRUST_PROXY, false);

module.exports = {
    ...runtimeConfig,
    trustProxy,
    integrations,
};
