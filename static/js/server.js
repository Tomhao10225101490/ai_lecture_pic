const https = require('https');
const fs = require('fs');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();

// 提供静态文件服务
app.use(express.static(__dirname));

// SSL证书配置
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

// 创建HTTPS服务器
const server = https.createServer(options, app);

// 创建WebSocket代理服务器
const wss = new WebSocket.Server({ server });

// WebSocket代理
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const targetUrl = data.url;
            const xfWebSocket = new WebSocket(targetUrl);

            xfWebSocket.on('open', () => {
                console.log('Connected to Xunfei WebSocket');
                if (data.data) {
                    xfWebSocket.send(JSON.stringify(data.data));
                }
            });

            xfWebSocket.on('message', (xfMessage) => {
                ws.send(xfMessage);
            });

            xfWebSocket.on('error', (error) => {
                console.error('Xunfei WebSocket error:', error);
                ws.send(JSON.stringify({ error: 'WebSocket connection failed' }));
            });

            xfWebSocket.on('close', () => {
                console.log('Xunfei WebSocket closed');
            });
        } catch (error) {
            console.error('Error handling message:', error);
            ws.send(JSON.stringify({ error: 'Internal server error' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(443, () => {
    console.log('HTTPS服务器运行在 https://localhost');
}); 