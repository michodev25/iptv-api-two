require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const mainRoutes = require('./src/routes/main');

const app = express();
const PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
})); // Security Headers (CSP disabled for inline scripts)
app.use(morgan('combined')); // Logging
app.use(express.json()); // Body parser
app.set('trust proxy', 1); // For Reverse Proxy (Nginx) support

// Routes
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', mainRoutes);

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// HTTPS Configuration Example (Req 20 & 21)
// To enable, place 'server.key' and 'server.cert' in a 'certs' folder
const startServer = () => {
    // HTTP Server (Main or Redirection)
    const httpServer = http.createServer(app);
    httpServer.listen(PORT, () => {
        console.log(`HTTP Server running on port ${PORT}`);
    });

    // HTTPS Server
    // Uncomment the lines below to enable HTTPS when you have certificates
    /*
    const certPath = path.join(__dirname, 'certs');
    if (fs.existsSync(path.join(certPath, 'server.key')) && fs.existsSync(path.join(certPath, 'server.cert'))) {
        const httpsOptions = {
            key: fs.readFileSync(path.join(certPath, 'server.key')),
            cert: fs.readFileSync(path.join(certPath, 'server.cert'))
        };
        const httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(HTTPS_PORT, () => {
            console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
        });
    } else {
        console.log('HTTPS certificates not found. Skipping HTTPS server.');
    }
    */
};

startServer();
 console.log("PASSWORD:", process.env.DB_PASSWORD);
    console.log("USER:", process.env.DB_USER);
    console.log("HOST:", process.env.DB_HOST);
    console.log("PORT:", process.env.DB_PORT);
    console.log("NAME:", process.env.DB_NAME);
module.exports = app; // For testing
