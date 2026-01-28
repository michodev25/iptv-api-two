const path = require('path');
const fs = require('fs');

const isProduction = !!process.env.DATABASE_URL;

const config = {
    client: isProduction ? 'pg' : 'sqlite3',
    connection: isProduction ? process.env.DATABASE_URL : {
        filename: path.resolve(__dirname, '../../data/iptv.db')
    },
    useNullAsDefault: true,
    pool: {
        min: 2,
        max: 10
    }
};

if (isProduction && config.connection) {
    // For Heroku/Render Postgres - self-signed certs often needed
    config.connection = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
}

const knex = require('knex')(config);

// Ensure data directory exists for local sqlite
if (!isProduction) {
    const dbDir = path.dirname(config.connection.filename);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
}

async function initDb() {
    try {
        const hasUsers = await knex.schema.hasTable('users');
        if (!hasUsers) {
            await knex.schema.createTable('users', table => {
                table.increments('id').primary();
                table.string('username').unique().notNullable();
                table.string('token').unique().notNullable();
                table.dateTime('created_at').defaultTo(knex.fn.now());
                table.dateTime('expires_at').notNullable();
                table.boolean('is_active').defaultTo(true);
                table.integer('max_devices').defaultTo(3);
                table.boolean('strict_ip_mode').defaultTo(true);
            });
            console.log('Created users table');
        }

        const hasDevices = await knex.schema.hasTable('devices');
        if (!hasDevices) {
            await knex.schema.createTable('devices', table => {
                table.increments('id').primary();
                table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
                table.string('ip_address').notNullable();
                table.string('user_agent').notNullable();
                table.dateTime('first_seen').defaultTo(knex.fn.now());
                table.dateTime('last_seen').defaultTo(knex.fn.now());
                table.unique(['user_id', 'ip_address', 'user_agent']);
            });
            console.log('Created devices table');
        }

        const hasLogs = await knex.schema.hasTable('access_logs');
        if (!hasLogs) {
            await knex.schema.createTable('access_logs', table => {
                table.increments('id').primary();
                table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
                table.dateTime('timestamp').defaultTo(knex.fn.now());
                table.string('ip_address').notNullable();
                table.string('user_agent');
                table.string('token_used');
                table.string('status').notNullable();
                table.string('reason');
            });
            console.log('Created access_logs table');
        }

        console.log('Database tables initialized.');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
}

// Initialize tables on startup
initDb();

module.exports = knex;
