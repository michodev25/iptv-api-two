const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const userService = require('../services/userService');
const deviceService = require('../services/deviceService');
const { streamAuth } = require('../middleware/auth');
const db = require('../config/db');

// --- Admin Middleware (Simple API Key) ---
const adminAuth = (req, res, next) => {
    const apiKey = req.headers['x-admin-key'];
    if (apiKey === (process.env.ADMIN_KEY)) { // Fallback for demo
        next();
    } else {
        res.status(403).send('Admin Access Denied');
    }
};

// --- Stream Route ---
router.get('/playlist.m3u', streamAuth, (req, res) => {
    const m3uPath = path.resolve(__dirname, '../../data/exported.m3u');
    
    // In production, we might want to read valid channels from DB or parse the M3U.
    // Requirement 1: Serve M3U file.
    if (!fs.existsSync(m3uPath)) {
        return res.status(404).send('Playlist not found');
    }

    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');
    
    const stream = fs.createReadStream(m3uPath);
    stream.pipe(res);
});

// --- Admin API Routes ---

// Create User
router.post('/admin/users', adminAuth, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).send('Username required');
        
        const user = await userService.createUser(username);
        const fullUrl = `${req.protocol}://${req.get('host')}/playlist.m3u?token=${user.token}`;
        
        res.json({ ...user, playlistUrl: fullUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Renew User
router.post('/admin/users/:username/renew', adminAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const user = await userService.renewUser(username);
        // Reset devices on renew? Requirement 7 says: "Generates NEW token... old token invalid".
        // Requirement 13: "Admin must be able to reset devices".
        // It doesn't explicitly say renew resets devices, but usually it does. 
        // We will leave devices alone unless explicitly reset or user requests it, 
        // BUT the old token logic in access logs might confuse things if we don't track devices by user_id properly (which we do).
        // Since token changes, url changes. Old devices using old URL will fail auth. 
        // New URL on same devices -> New User Agent/IP check -> Matched by UA?
        // Our device check uses User-Agent matching against *User's* devices list.
        // If the User-Agent is the same, it maps to the existing device slot. So devices persist across renew unless explicitly reset. This is robust.
        
        const fullUrl = `${req.protocol}://${req.get('host')}/playlist.m3u?token=${user.token}`;
        res.json({ ...user, playlistUrl: fullUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Devices
router.post('/admin/users/:username/reset-devices', adminAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const result = await deviceService.resetDevices(username);
        res.json({ message: 'Devices reset successfully', count: result.deleted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List All Users
router.get('/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        const usersWithUrl = users.map(user => ({
            ...user,
            playlistUrl: `${req.protocol}://${req.get('host')}/playlist.m3u?token=${user.token}`
        }));
        res.json(usersWithUrl);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User Status
router.put('/admin/users/:username/status', adminAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const { is_active } = req.body;
        
        if (typeof is_active !== 'boolean') {
            return res.status(400).send('is_active (boolean) required');
        }

        const result = await userService.updateUserStatus(username, is_active);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Regenerate User Token
router.post('/admin/users/:username/regenerate', adminAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const user = await userService.regenerateUserToken(username);
        const fullUrl = `${req.protocol}://${req.get('host')}/playlist.m3u?token=${user.token}`;
        
        res.json({ ...user, playlistUrl: fullUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// View Logs (Simple dump)
router.get('/admin/logs', adminAuth, async (req, res) => {
    try {
        const logs = await db('access_logs').orderBy('timestamp', 'desc').limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User
router.delete('/admin/users/:username', adminAuth, async (req, res) => {
    try {
        await userService.deleteUser(req.params.username);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User (Settings)
router.put('/admin/users/:username', adminAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const updates = req.body; // e.g., { max_devices: 5, strict_ip_mode: 0 }
        
        const result = await userService.updateUser(username, updates);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
