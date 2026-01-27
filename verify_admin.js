const http = require('http');

const options = (method, path, body = null) => {
    return {
        hostname: 'localhost',
        port: 3001,
        path: path,
        method: method,
        headers: {
            'x-admin-key': 'admin123',
            'Content-Type': 'application/json',
            'Content-Length': body ? Buffer.byteLength(body) : 0
        }
    };
};

const makeRequest = (name, method, path, bodyData = null) => {
    return new Promise((resolve, reject) => {
        const body = bodyData ? JSON.stringify(bodyData) : null;
        const req = http.request(options(method, path, body), (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`\n--- ${name} ---`);
                console.log(`Status: ${res.statusCode}`);
                console.log('Response:', data);
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request ${name}: ${e.message}`);
            reject(e);
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
};

const run = async () => {
    try {
        const testUser = `test_node_${Date.now()}`;
        // 1. Create a user to test with
        const user = await makeRequest('Create User', 'POST', '/admin/users', { username: testUser });
        
        // 2. List users
        const users = await makeRequest('List Users', 'GET', '/admin/users');
        if (Array.isArray(users)) {
            console.log(`Found ${users.length} users.`);
            const myUser = users.find(u => u.username === testUser);
            if (myUser && myUser.playlistUrl) {
                console.log('playlistUrl found for user:', myUser.playlistUrl);
            } else {
                console.error('FAILED: playlistUrl missing in list');
            }
        }

        // 3. Disable user
        await makeRequest('Disable User', 'PUT', `/admin/users/${testUser}/status`, { is_active: false });

        // 4. Regenerate Token
        await makeRequest('Regenerate Token', 'POST', `/admin/users/${testUser}/regenerate`);

        // 5. Enable user
        await makeRequest('Enable User', 'PUT', `/admin/users/${testUser}/status`, { is_active: true });

    } catch (err) {
        console.error('Verification failed:', err);
    }
};

run();
