const https = require('https');
require('dotenv').config();

const options = {
  hostname: 'api.groq.com',
  path: '/openai/v1/models',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).data.map(m => m.id)));
});
req.on('error', e => console.error(e));
req.end();
