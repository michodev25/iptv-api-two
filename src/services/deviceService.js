const db = require('../config/db');

const checkDeviceAccess = async (user, ip, userAgent) => {
    try {
        const devices = await db('devices').where({ user_id: user.id });

        const existingDevice = devices.find(d => d.user_agent === userAgent);

        if (existingDevice) {
            // Device exists. Check IP constraint.
            if (user.strict_ip_mode && existingDevice.ip_address !== ip) {
                return { allowed: false, reason: 'IP mismatch in strict mode' };
            }
            
            // Update last_seen
            // Use date object for compatibility
            await db('devices')
                .where({ id: existingDevice.id })
                .update({ last_seen: new Date().toISOString() }); // Knex handles date to string usually but explicit is safe for mixed db types

            return { allowed: true };
        } else {
            // New Device
            if (devices.length >= user.max_devices) {
                return { allowed: false, reason: 'Max devices reached' };
            }

            // Register new device
            await db('devices').insert({
                user_id: user.id,
                ip_address: ip,
                user_agent: userAgent,
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString()
            });

            return { allowed: true };
        }
    } catch (err) {
        throw err;
    }
};

const logAccess = async (userId, token, ip, ua, status, reason) => {
    try {
        await db('access_logs').insert({
            user_id: userId,
            token_used: token,
            ip_address: ip,
            user_agent: ua,
            status: status,
            reason: reason,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Logging error:', err);
    }
};

const resetDevices = async (username) => {
    // We need user id first
    const user = await db('users').where({ username }).first();
    if (!user) {
        throw new Error('User not found');
    }
    
    const count = await db('devices').where({ user_id: user.id }).del();
    return { deleted: count };
};

module.exports = { checkDeviceAccess, logAccess, resetDevices };
