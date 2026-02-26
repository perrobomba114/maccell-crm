const https = require('https');

const data = JSON.stringify({
    messages: [
        { role: 'user', content: 'Samsung A10 no da backlight' }
    ]
});

const req = https.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cerebro/chat',
    method: 'POST',
    rejectUnauthorized: false,
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
