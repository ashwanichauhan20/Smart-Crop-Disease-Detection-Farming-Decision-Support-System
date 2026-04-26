const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            fs.writeFileSync('react-error.log', body);
            res.writeHead(200);
            res.end('Logged error');
            console.log('Error logged to react-error.log');
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(4000, () => {
    console.log('Error logging server running on port 4000');
});
