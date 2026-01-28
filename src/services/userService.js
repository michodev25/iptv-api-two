const db = require('../config/db');
const { generateToken } = require('../utils/token');

const createUser = async (username) => {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

    try {
        // Knex insert returns generic array of IDs [id] for sqlite, or we request returning for PG
        // To be safe for both, we insert and use the known data, or inspect result
        const result = await db('users').insert({
            username, 
            token, 
            expires_at: expiresAt.toISOString()
        }, ['id']); 
        
        // Result is usually [ { id: 1 } ] (PG/SQLite with returning support) or [ 1 ] (SQLite legacy)
        // Accessing result[0]
        const id = result[0]?.id || result[0];

        return { id, username, token, expires_at: expiresAt };
    } catch (err) {
        throw err;
    }
};

const renewUser = async (username) => {
    const newToken = generateToken();
    const newExpiration = new Date();
    newExpiration.setDate(newExpiration.getDate() + 30);

    const count = await db('users')
        .where({ username })
        .update({
            token: newToken,
            expires_at: newExpiration.toISOString(),
            is_active: true // SQLite/PG boolean
        });

    if (!count) {
        throw new Error('User not found');
    }

    return { username, token: newToken, expires_at: newExpiration };
};

const getUserByToken = async (token) => {
    const user = await db('users').where({ token }).first();
    return user;
};

const getAllUsers = async () => {
    const users = await db('users').orderBy('created_at', 'desc');
    return users; // Knex returns array of objects
};

const updateUserStatus = async (username, isActive) => {
    const count = await db('users')
        .where({ username })
        .update({ is_active: isActive });

    if (!count) {
        throw new Error('User not found');
    }
    return { username, is_active: isActive };
};

const regenerateUserToken = async (username) => {
    const newToken = generateToken();
    const count = await db('users')
        .where({ username })
        .update({ token: newToken });

    if (!count) {
        throw new Error('User not found');
    }
    return { username, token: newToken };
};

const deleteUser = async (username) => {
    const count = await db('users')
        .where({ username })
        .del();

    if (!count) {
        throw new Error('User not found');
    }
    return { username, deleted: true };
};

const updateUser = async (username, updates) => {
    const allowedFields = ['max_devices', 'strict_ip_mode', 'expires_at'];
    const fieldsToUpdate = {};

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            fieldsToUpdate[key] = updates[key];
        }
    });

    if (Object.keys(fieldsToUpdate).length === 0) {
        return { message: 'No valid fields to update' };
    }

    // Convert booleans if necessary (Knex handles it mostly, but let's be safe if inputs are strings)
    // Actually Knex handles JS booleans to 1/0 for SQLite
    
    const count = await db('users')
        .where({ username })
        .update(fieldsToUpdate);

    if (!count) {
        throw new Error('User not found');
    }
    return { username, ...updates };
};

module.exports = { 
    createUser, 
    renewUser, 
    getUserByToken, 
    getAllUsers, 
    updateUserStatus, 
    regenerateUserToken, 
    deleteUser, 
    updateUser 
};
