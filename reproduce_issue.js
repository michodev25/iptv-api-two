const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/admin/users',
  method: 'GET',
  headers: {
    'x-admin-key': 'admin123',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('BODY:', data);
    if (res.statusCode === 200) {
        console.log("SUCCESS: Admin key accepted.");
    } else {
        console.log("FAILURE: Admin key rejected or other error.");
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
