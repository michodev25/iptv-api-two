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
                if (res.statusCode >= 200 && res.statusCode < 300) {
                     try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
};

const run = async () => {
    const testUser = `test_admin_${Date.now()}`;
    try {
        console.log(`Testing with user: ${testUser}`);

        // 1. Create
        await makeRequest('1. Create User', 'POST', '/admin/users', { username: testUser });
        
        // 2. Edit (Update max_devices)
        const updated = await makeRequest('2. Update User', 'PUT', `/admin/users/${testUser}`, { max_devices: 5, strict_ip_mode: 0 });
        if (updated.max_devices !== 5) throw new Error('Update max_devices failed');
        // strict_ip_mode comes back as 0 (false) or 1 (true) from DB usually integer
        if (updated.strict_ip_mode != 0) throw new Error('Update strict_ip_mode failed');

        // 3. Verify Edit (Get List)
        const users = await makeRequest('3. List Users', 'GET', '/admin/users');
        const myUser = users.find(u => u.username === testUser);
        if (myUser.max_devices !== 5) throw new Error('List verification failed for max_devices');

        // 4. Delete
        await makeRequest('4. Delete User', 'DELETE', `/admin/users/${testUser}`);

        // 5. Verify Delete
        const usersAfter = await makeRequest('5. List Users After Delete', 'GET', '/admin/users');
        if (usersAfter.find(u => u.username === testUser)) throw new Error('User still exists after delete');

        console.log('\nSUCCESS: All new admin features verified!');
        process.exit(0);

    } catch (err) {
        console.error('\nFAILED:', err.message);
        process.exit(1);
    }
};

run();
