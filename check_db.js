require('dotenv').config();
const config = require('./src/config/db');

// Add a test query to verify connection
config.raw('SELECT 1')
    .then(() => {
        console.log('Database connected successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    });
