const { Sequelize } = require('sequelize');

const rawConnectionString = process.env.DATABASE_URL || '';
const connectionString = rawConnectionString.trim() === '' ? null : rawConnectionString.trim();

const parsedPort = process.env.PGPORT ? Number(process.env.PGPORT) : NaN;
const port = Number.isNaN(parsedPort) ? undefined : parsedPort;

const baseConfig = {
    dialect: 'postgres',
    logging: false,
    define: {
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
};

const sequelize = connectionString
    ? new Sequelize(connectionString, baseConfig)
    : new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
        ...baseConfig,
        host: process.env.PGHOST,
        port,
    });

module.exports = sequelize;
