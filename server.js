const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const config = require('./src/config');
const apiRoutes = require('./src/routes/api');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.set('wss', wss);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

server.listen(config.port, () => {
  console.log(`Facebook Ads Lead Extractor running at http://localhost:${config.port}`);
  console.log(`WebSocket server ready`);
});
