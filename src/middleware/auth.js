const { getUserByToken } = require('../services/userService');
const { checkDeviceAccess, logAccess } = require('../services/deviceService');

const streamAuth = async (req, res, next) => {
    const token = req.query.token;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    if (!token) {
        logAccess(null, 'NONE', ip, userAgent, 'BLOCKED', 'No token provided');
        return res.status(403).send('Access Denied');
    }

    try {
        const user = await getUserByToken(token);

        if (!user) {
            logAccess(null, token, ip, userAgent, 'BLOCKED', 'Invalid token');
            return res.status(403).send('Access Denied');
        }

        if (!user.is_active) {
            logAccess(user.id, token, ip, userAgent, 'BLOCKED', 'User inactive');
            return res.status(403).send('Access Denied');
        }

        const now = new Date();
        const expiresAt = new Date(user.expires_at);

        if (now > expiresAt) {
            logAccess(user.id, token, ip, userAgent, 'EXPIRED', 'Token expired');
            return res.status(403).send('Access Denied');
        }

        // Check Device
        const deviceCheck = await checkDeviceAccess(user, ip, userAgent);
        
        if (!deviceCheck.allowed) {
            logAccess(user.id, token, ip, userAgent, 'BLOCKED', deviceCheck.reason);
            // Req 24: Generic error messages
            return res.status(403).send('Access Denied');
        }

        // Log successful access
        logAccess(user.id, token, ip, userAgent, 'ALLOWED', 'Access granted');
        req.user = user;
        next();

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = { streamAuth };
