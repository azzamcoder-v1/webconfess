const socket = io();

const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const qrContainer = document.getElementById('qrContainer');
const qrCode = document.getElementById('qrCode');
const logsContainer = document.getElementById('logsContainer');
const testForm = document.getElementById('testForm');

const totalMessages = document.getElementById('totalMessages');
const todayMessages = document.getElementById('todayMessages');
const activeUsers = document.getElementById('activeUsers');
const uptime = document.getElementById('uptime');

let startTime = Date.now();
let messageCount = 0;
let todayCount = 0;

console.log('Connecting to socket.io server...');

socket.on('connect', () => {
    console.log('Socket connected');
    addLog('Terhubung ke server', 'success');
});

socket.on('qr', (qrData) => {
    console.log('QR code event received');
    if (statusIndicator) statusIndicator.className = 'status-indicator connecting';
    statusText.textContent = 'Scan QR Code untuk login';
    statusText.className = 'status-text connecting';
    if (qrData) {
        qrCode.src = qrData;
        qrContainer.style.display = 'block';
    } else {
        qrCode.src = '';
        qrContainer.style.display = 'none';
    }
    addLog('QR Code diterima, silakan scan', 'info');
});

socket.on('ready', () => {
    if (statusIndicator) statusIndicator.className = 'status-indicator connected';
    statusText.textContent = 'Bot WhatsApp Terhubung';
    statusText.className = 'status-text connected';
    qrContainer.style.display = 'none';
    addLog('Bot WhatsApp berhasil terhubung', 'success');
});

socket.on('authenticated', () => {
    addLog('Autentikasi berhasil', 'success');
});

socket.on('auth_failure', (msg) => {
    if (statusIndicator) statusIndicator.className = 'status-indicator';
    statusText.textContent = 'Autentikasi Gagal';
    statusText.className = 'status-text error';
    addLog(`Autentikasi gagal: ${msg}`, 'error');
});

socket.on('disconnected', (reason) => {
    if (statusIndicator) statusIndicator.className = 'status-indicator';
    statusText.textContent = 'Bot Terputus';
    statusText.className = 'status-text disconnected';
    addLog(`Bot terputus: ${reason}`, 'error');
});

function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function updateStats() {
    const now = Date.now();
    const uptimeHours = Math.floor((now - startTime) / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor(((now - startTime) % (1000 * 60 * 60)) / (1000 * 60));
    
    uptime.textContent = `${uptimeHours}h ${uptimeMinutes}m`;
    totalMessages.textContent = messageCount;
    todayMessages.textContent = todayCount;
    activeUsers.textContent = Math.floor(Math.random() * 10) + 1;
}

document.getElementById('refreshBtn').addEventListener('click', () => {
    location.reload();
});

document.getElementById('restartBtn').addEventListener('click', async () => {
    if (confirm('Yakin ingin restart bot? Bot akan offline sementara.')) {
        try {
            await fetch('/api/restart', { method: 'POST' });
            addLog('Bot direstart', 'info');
        } catch (error) {
            addLog('Gagal restart bot', 'error');
        }
    }
});

document.getElementById('clearLogsBtn').addEventListener('click', () => {
    logsContainer.innerHTML = '';
    addLog('Log dibersihkan', 'info');
});

document.getElementById('exportBtn').addEventListener('click', () => {
    const data = {
        totalMessages: messageCount,
        todayMessages: todayCount,
        uptime: uptime.textContent,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confess-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

if (testForm) {
    testForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById('testPhone').value;
        const message = document.getElementById('testMessage').value;
        const sendBtn = document.getElementById('sendTestBtn');
        
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loading"></div> Mengirim...';
        
        try {
            const response = await fetch('/api/send-confess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber: phone,
                    message: message,
                    senderName: 'Admin Test'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                addLog(`Test pesan berhasil dikirim ke ${phone}`, 'success');
                testForm.reset();
                messageCount++;
                todayCount++;
            } else {
                addLog(`Gagal kirim test: ${result.error}`, 'error');
            }
        } catch (error) {
            addLog(`Error: ${error.message}`, 'error');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Test';
        }
    });
}

setInterval(updateStats, 30000);
updateStats();

fetch('/api/status')
    .then(response => response.json())
    .then(data => {
        if (statusIndicator) {
            if (data.status === 'ready') {
                statusIndicator.className = 'status-indicator connected';
                statusText.textContent = 'Bot WhatsApp Terhubung';
                statusText.className = 'status-text connected';
                qrContainer.style.display = 'none';
            } else if (data.qrCode) {
                statusIndicator.className = 'status-indicator connecting';
                statusText.textContent = 'Scan QR Code untuk login';
                statusText.className = 'status-text connecting';
                qrCode.src = data.qrCode;
                qrContainer.style.display = 'block';
            } else {
                statusIndicator.className = '';
                statusText.textContent = 'Menghubungkan...';
                statusText.className = '';
                qrContainer.style.display = 'none';
            }
        }
    })
    .catch(error => {
        addLog('Gagal mengecek status bot', 'error');
    });
