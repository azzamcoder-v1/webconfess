const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Server } = require('socket.io');
const http = require('http');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Rate limiting
const rateLimiter = new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 5, // 5 requests
    duration: 60, // per 60 seconds
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "confess-bot"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

let isClientReady = false;
let qrCodeData = null;

// WhatsApp Events
client.on('qr', async (qr) => {
    console.log('QR Code received:', qr);
    try {
        qrCodeData = await qrcode.toDataURL(qr);
        console.log('QR Code data URL generated');
        io.emit('qr', qrCodeData);
    } catch (err) {
        console.error('Error generating QR code:', err);
    }
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isClientReady = true;
    qrCodeData = null;
    io.emit('ready', { status: 'connected' });
});

client.on('authenticated', () => {
    console.log('WhatsApp Client authenticated');
    io.emit('authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    io.emit('auth_failure', msg);
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client disconnected:', reason);
    isClientReady = false;
    io.emit('disconnected', reason);
});

// Initialize WhatsApp Client
client.initialize();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        status: isClientReady ? 'ready' : 'connecting',
        qrCode: qrCodeData
    });
});

// Message queue for confess messages
const confessQueue = [];
let isProcessingQueue = false;

// Function to process queue
async function processQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (confessQueue.length > 0) {
        const { phoneNumber, message, senderName, res } = confessQueue.shift();

        try {
            const formattedMessage = formatConfessMessage(message, senderName || 'Anonim');
            const chatId = phoneNumber + '@c.us';

            await client.sendMessage(chatId, formattedMessage);
            console.log(`Confess sent to ${phoneNumber}`);

            if (res) {
                res.json({
                    success: true,
                    message: 'Pesan confess berhasil dikirim!'
                });
            }
        } catch (error) {
            console.error('Error sending confess:', error);
            if (res) {
                res.status(500).json({
                    success: false,
                    error: 'Gagal mengirim pesan. Silakan coba lagi.'
                });
            }
        }
    }

    isProcessingQueue = false;
}

// Send confession endpoint
app.post('/api/send-confess', async (req, res) => {
    try {
        // Rate limiting
        await rateLimiter.consume(req.ip);

        const { phoneNumber, message, senderName } = req.body;

        // Validation
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'Nomor WhatsApp dan pesan harus diisi'
            });
        }

        // Validate phone number format
        const phoneRegex = /^62[0-9]{9,13}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Format nomor WhatsApp tidak valid'
            });
        }

        // Check if client is ready
        if (!isClientReady) {
            return res.status(503).json({
                success: false,
                error: 'Bot WhatsApp belum siap. Silakan coba lagi.'
            });
        }

        // Enqueue message
        confessQueue.push({ phoneNumber, message, senderName, res });
        processQueue();

    } catch (error) {
        console.error('Error processing confess request:', error);

        if (error.remainingPoints !== undefined) {
            return res.status(429).json({
                success: false,
                error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Gagal memproses permintaan. Silakan coba lagi.'
        });
    }
});

// Get chat info
app.post('/api/check-number', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!isClientReady) {
            return res.status(503).json({
                success: false,
                error: 'Bot WhatsApp belum siap'
            });
        }

        const chatId = phoneNumber + '@c.us';
        const isRegistered = await client.isRegisteredUser(chatId);

        res.json({
            success: true,
            isRegistered,
            message: isRegistered ? 'Nomor terdaftar di WhatsApp' : 'Nomor tidak terdaftar di WhatsApp'
        });

    } catch (error) {
        console.error('Error checking number:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal memeriksa nomor'
        });
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Client connected to admin panel');
    
    // Send current status
    socket.emit('status', {
        isReady: isClientReady,
        qrCode: qrCodeData
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected from admin panel');
    });
});

// Helper function to format confession message
function formatConfessMessage(message, sender) {
    const timestamp = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
    });

    let formattedMessage = `💌 *CONFESS ANONYMOUS* 💌\n\n`;
    formattedMessage += `📝 *Pesan:*\n${message}\n\n`;
    formattedMessage += `👤 *Dari:* ${sender}\n`;
    formattedMessage += `🕐 *Waktu:* ${timestamp} WIB\n\n`;
    formattedMessage += `_Pesan ini dikirim otomatis oleh Confess Anonymous Bot_\n`;
    formattedMessage += `_🔒 Identitas pengirim terlindungi_\n`;
    formattedMessage += `_🤖 Powered by WhatsApp Bot_`;

    return formattedMessage;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await client.destroy();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Admin panel: http://localhost:${PORT}/admin`);
});
