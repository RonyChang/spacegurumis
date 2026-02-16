const { Sequelize } = require('sequelize');
const { databaseUrl } = require('./index');

// DATABASE_URL se valida previamente en el contrato de entorno.
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

const sequelize = new Sequelize(databaseUrl, baseConfig);

module.exports = sequelize;
