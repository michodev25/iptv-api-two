const db = require('../config/db');
const { generateToken } = require('../utils/token');

const createUser = (username) => {
    return new Promise((resolve, reject) => {
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

        const sql = `INSERT INTO users (username, token, expires_at) VALUES (?, ?, ?)`;
        db.run(sql, [username, token, expiresAt.toISOString()], function(err) {
            if (err) {
                return reject(err);
            }
            resolve({ id: this.lastID, username, token, expires_at: expiresAt });
        });
    });
};

const renewUser = (username) => {
    return new Promise((resolve, reject) => {
        const newToken = generateToken();
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + 30);

        const sql = `UPDATE users SET token = ?, expires_at = ?, is_active = 1 WHERE username = ?`;
        db.run(sql, [newToken, newExpiration.toISOString(), username], function(err) {
            if (err) {
                return reject(err);
            }
            if (this.changes === 0) {
                return reject(new Error('User not found'));
            }
            resolve({ username, token: newToken, expires_at: newExpiration });
        });
    });
};

const getUserByToken = (token) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users WHERE token = ?`;
        db.get(sql, [token], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row);
        });
    });
};

const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users ORDER BY created_at DESC`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
};

const updateUserStatus = (username, isActive) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE users SET is_active = ? WHERE username = ?`;
        db.run(sql, [isActive ? 1 : 0, username], function(err) {
            if (err) {
                return reject(err);
            }
            if (this.changes === 0) {
                return reject(new Error('User not found'));
            }
            resolve({ username, is_active: isActive });
        });
    });
};

const regenerateUserToken = (username) => {
    return new Promise((resolve, reject) => {
        const newToken = generateToken();
        const sql = `UPDATE users SET token = ? WHERE username = ?`;
        db.run(sql, [newToken, username], function(err) {
            if (err) {
                return reject(err);
            }
            if (this.changes === 0) {
                return reject(new Error('User not found'));
            }
            resolve({ username, token: newToken });
        });
    });
};

const deleteUser = (username) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM users WHERE username = ?`;
        db.run(sql, [username], function(err) {
            if (err) {
                return reject(err);
            }
            if (this.changes === 0) {
                return reject(new Error('User not found'));
            }
            resolve({ username, deleted: true });
        });
    });
};

const updateUser = (username, updates) => {
    return new Promise((resolve, reject) => {
        const allowedFields = ['max_devices', 'strict_ip_mode', 'expires_at'];
        const fieldsToUpdate = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                fieldsToUpdate.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        if (fieldsToUpdate.length === 0) {
            return resolve({ message: 'No valid fields to update' });
        }

        values.push(username);
        const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE username = ?`;

        db.run(sql, values, function(err) {
            if (err) {
                return reject(err);
            }
            if (this.changes === 0) {
                return reject(new Error('User not found'));
            }
            resolve({ username, ...updates });
        });
    });
};

module.exports = { createUser, renewUser, getUserByToken, getAllUsers, updateUserStatus, regenerateUserToken, deleteUser, updateUser };
