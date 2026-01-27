const db = require('../config/db');

const checkDeviceAccess = (user, ip, userAgent) => {
    return new Promise((resolve, reject) => {
        // 1. Check if device already exists for user
        const findDeviceSql = `SELECT * FROM devices WHERE user_id = ? AND user_agent = ?`;
        
        // Note: Strict IP mode would check IP too, but requirements say "Combination of IP + User-Agent" defines a device in Req 11,
        // BUT Req 16 says "strict mode: fixed IP per device" vs "flexible: dynamic IP".
        // Req 14 says "Register IP of first access".
        // Let's implement logic: 
        // Iterate user's devices. Match User-Agent.
        // If User-Agent matches:
        //    If strict mode & IP diff -> Block? Or update IP? 
        //    Req 15: "If URL starts being used from unauthorized IPs -> Block".
        //    Req 16: Flexible allowed.
        
        // Simplified Logic complying with requirements:
        // A device is identified primarily by User-Agent for counting purposes (Req 11 implies UA+IP, but typically standard IPTV limitation is by active connections or unique devices. Req 11 says "Device is identified by IP + UA". This creates a catch-22 for dynamic IPs if we are strict. 
        // Let's assume: A "Device Slot" is consumed by a unique (User-Agent).
        // If we see a known User-Agent:
        //    Check IP. If strict mode and IP different -> BLOCK. 
        //    If flexible mode -> Allow and update recent IP?
        // If we see a NEW User-Agent:
        //    Check total device count. If < 3 -> Register new device (UA + IP).
        //    If >= 3 -> BLOCK.

        db.all(`SELECT * FROM devices WHERE user_id = ?`, [user.id], (err, devices) => {
            if (err) return reject(err);

            const existingDevice = devices.find(d => d.user_agent === userAgent);

            if (existingDevice) {
                // Device exists. Check IP constraint.
                if (user.strict_ip_mode && existingDevice.ip_address !== ip) {
                    // In strict mode, IP must match exactly what was first registered or last valid?
                    // Req 14: Register IP of *first* access.
                    // Req 15: Block if unauthorized IP.
                    // So Strict Mode = IP must match initial IP.
                    return resolve({ allowed: false, reason: 'IP mismatch in strict mode' });
                }
                
                // Update last_seen
                db.run(`UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [existingDevice.id]);
                return resolve({ allowed: true });
            } else {
                // New Device
                if (devices.length >= user.max_devices) {
                    return resolve({ allowed: false, reason: 'Max devices reached' });
                }

                // Register new device
                db.run(`INSERT INTO devices (user_id, ip_address, user_agent) VALUES (?, ?, ?)`, 
                    [user.id, ip, userAgent], (err) => {
                    if (err) return reject(err);
                    return resolve({ allowed: true });
                });
            }
        });
    });
};

const logAccess = (userId, token, ip, ua, status, reason) => {
    db.run(`INSERT INTO access_logs (user_id, token_used, ip_address, user_agent, status, reason) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, token, ip, ua, status, reason]);
};

const resetDevices = (username) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, user) => {
            if (err || !user) return reject(err || new Error('User not found'));
            
            db.run(`DELETE FROM devices WHERE user_id = ?`, [user.id], function(err) {
                if (err) return reject(err);
                resolve({ deleted: this.changes });
            });
        });
    });
};

module.exports = { checkDeviceAccess, logAccess, resetDevices };
