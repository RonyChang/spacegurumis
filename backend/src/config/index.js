const parsedPort = process.env.PORT ? Number(process.env.PORT) : NaN;
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;
const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = {
    port,
    nodeEnv,
};
