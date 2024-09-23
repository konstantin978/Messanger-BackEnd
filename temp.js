const ws = require('ws');
const url = require('node:url');

const server = new ws.Server({
    port: 4000
});

server.on('connection', (client, req) => {
    console.log(req.url);
    const result = url.parse(req.url, true).query;
    console.log(result);
    client.send('Welcome, your auth key is: ' + result.authKey);
});