const express = require('express');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Environment details endpoint
app.get('/api/environment', (req, res) => {
    const envDetails = {
        hostname: os.hostname(),
        platform: os.platform(),
        architecture: os.arch(),
        cpus: os.cpus().length,
        totalMemory: `${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`,
        freeMemory: `${(os.freemem() / (1024 ** 3)).toFixed(2)} GB`,
        uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        podName: process.env.POD_NAME || 'unknown',
        podNamespace: process.env.POD_NAMESPACE || 'unknown',
        podIP: process.env.POD_IP || 'unknown',
    };
    
    res.json(envDetails);
});

app.listen(PORT, () => {
    console.log(`Backend API server running on port ${PORT}`);
});
