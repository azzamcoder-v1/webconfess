# 🚀 Panduan Lengkap Deploy Confess Anonymous Bot ke VPS

## 📋 Persyaratan

### VPS Requirements
- **RAM**: Minimum 1GB (Recommended 2GB)
- **CPU**: 1 Core minimum
- **Storage**: 20GB minimum
- **OS**: Ubuntu 20.04/22.04 LTS
- **Bandwidth**: Unlimited atau minimal 1TB/bulan

### Domain & DNS
- Domain yang sudah dibeli (contoh: confess-anonymous.com)
- Akses ke DNS management (Cloudflare, Namecheap, dll)

### Tools yang Dibutuhkan
- SSH client (PuTTY untuk Windows, Terminal untuk Mac/Linux)
- FTP/SFTP client (FileZilla, WinSCP)
- Text editor (VS Code, Notepad++)

## 🔧 Langkah 1: Setup VPS Awal

### 1.1 Koneksi ke VPS
```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Update System
```bash
apt update && apt upgrade -y
```

### 1.3 Buat User Non-Root (Opsional tapi Recommended)
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 1.4 Setup SSH Key (Recommended)
```bash
mkdir ~/.ssh
chmod 700 ~/.ssh
# Copy public key ke ~/.ssh/authorized_keys
```

## 🌐 Langkah 2: Setup Domain & DNS

### 2.1 Point Domain ke VPS
Di DNS provider Anda, buat record:
```
Type: A
Name: @
Value: YOUR_VPS_IP
TTL: 300

Type: A  
Name: www
Value: YOUR_VPS_IP
TTL: 300
```

### 2.2 Verifikasi DNS
```bash
nslookup your-domain.com
ping your-domain.com
```

## 📁 Langkah 3: Upload Project ke VPS

### 3.1 Metode 1: Git Clone (Recommended)
```bash
# Di VPS
cd /var/www
git clone https://github.com/username/confess-anonymous-bot.git
cd confess-anonymous-bot
```

### 3.2 Metode 2: Upload Manual
```bash
# Buat direktori
mkdir -p /var/www/confess-anonymous-bot

# Upload files menggunakan SCP/SFTP
scp -r ./project-files/* root@YOUR_VPS_IP:/var/www/confess-anonymous-bot/
```

## ⚙️ Langkah 4: Konfigurasi Files

### 4.1 Edit Domain di File Konfigurasi

**Edit nginx.conf:**
```bash
nano nginx.conf
# Ganti 'your-domain.com' dengan domain Anda
```

**Edit .env.production:**
```bash
nano .env.production
# Ganti CORS_ORIGIN dengan domain Anda
```

**Edit ecosystem.config.js:**
```bash
nano ecosystem.config.js
# Ganti YOUR_VPS_IP dan YOUR_GITHUB_REPO_URL
```

**Edit deploy.sh:**
```bash
nano deploy.sh
# Ganti DOMAIN="your-domain.com" dengan domain Anda
```

### 4.2 Set Permission untuk Deploy Script
```bash
chmod +x deploy.sh
```

## 🚀 Langkah 5: Jalankan Deployment

### 5.1 Jalankan Script Deployment
```bash
sudo ./deploy.sh
```

Script ini akan otomatis:
- Install Node.js, PM2, Nginx
- Install dependencies
- Setup SSL certificate
- Configure firewall
- Start aplikasi

### 5.2 Jika Ada Error, Jalankan Manual

**Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Install PM2:**
```bash
sudo npm install -g pm2
```

**Install Nginx:**
```bash
sudo apt install -y nginx
```

**Install Dependencies:**
```bash
cd /var/www/confess-anonymous-bot
npm install --production
```

**Setup Nginx:**
```bash
sudo cp nginx.conf /etc/nginx/sites-available/confess-anonymous-bot
sudo ln -s /etc/nginx/sites-available/confess-anonymous-bot /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

**Start Application:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🔒 Langkah 6: Setup SSL Certificate

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Generate SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 6.3 Setup Auto Renewal
```bash
sudo crontab -e
# Tambahkan line ini:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📱 Langkah 7: Setup WhatsApp Bot

### 7.1 Akses Admin Panel
Buka browser dan kunjungi:
```
https://your-domain.com/admin
```

### 7.2 Scan QR Code
1. QR code akan muncul di halaman admin
2. Buka WhatsApp di ponsel Anda
3. Pilih "WhatsApp Web" atau "Linked Devices"
4. Scan QR code yang muncul
5. Tunggu hingga status berubah menjadi "Connected"

### 7.3 Test Bot
1. Kunjungi: `https://your-domain.com`
2. Masukkan nomor WhatsApp Anda (format: 628xxx)
3. Tulis pesan test
4. Klik "Kirim ke WhatsApp"
5. Cek WhatsApp Anda untuk memastikan pesan diterima

## 🔧 Langkah 8: Monitoring & Maintenance

### 8.1 Commands Berguna
```bash
# Cek status aplikasi
pm2 status

# Lihat logs aplikasi
pm2 logs confess-anonymous-bot

# Restart aplikasi
pm2 restart confess-anonymous-bot

# Cek status Nginx
sudo systemctl status nginx

# Lihat logs Nginx
sudo tail -f /var/log/nginx/confess-anonymous-error.log

# Cek penggunaan resource
htop
df -h
free -h
```

### 8.2 Update Aplikasi
```bash
cd /var/www/confess-anonymous-bot
git pull origin main
npm install --production
pm2 restart confess-anonymous-bot
```

### 8.3 Backup Data
```bash
# Backup WhatsApp session
tar -czf whatsapp-session-backup.tar.gz whatsapp-session/

# Backup logs
tar -czf logs-backup.tar.gz logs/
```

## 🛡️ Langkah 9: Security Hardening

### 9.1 Setup Firewall
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### 9.2 Disable Root Login (Recommended)
```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

### 9.3 Setup Fail2Ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 9.4 Regular Updates
```bash
# Setup automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 🚨 Troubleshooting

### Problem: WhatsApp Bot Tidak Connect
**Solusi:**
```bash
# Restart aplikasi
pm2 restart confess-anonymous-bot

# Clear WhatsApp session
rm -rf whatsapp-session/
pm2 restart confess-anonymous-bot

# Cek logs untuk error
pm2 logs confess-anonymous-bot
```

### Problem: Website Tidak Bisa Diakses
**Solusi:**
```bash
# Cek status Nginx
sudo systemctl status nginx

# Test konfigurasi Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Cek firewall
sudo ufw status
```

### Problem: SSL Certificate Error
**Solusi:**
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### Problem: High Memory Usage
**Solusi:**
```bash
# Restart aplikasi
pm2 restart confess-anonymous-bot

# Increase memory limit
pm2 delete confess-anonymous-bot
pm2 start ecosystem.config.js --env production
```

## 📞 Support & Maintenance

### Log Files Locations
- **Application Logs**: `/var/www/confess-anonymous-bot/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **PM2 Logs**: `~/.pm2/logs/`

### Performance Monitoring
```bash
# Monitor real-time performance
pm2 monit

# Check system resources
htop
iotop
nethogs
```

### Backup Strategy
1. **Daily**: WhatsApp session data
2. **Weekly**: Complete application backup
3. **Monthly**: System backup

---

## 🎉 Selamat!

Bot WhatsApp Anonymous Confession Anda sekarang sudah berjalan di VPS!

**URL Akses:**
- Website: `https://your-domain.com`
- Admin Panel: `https://your-domain.com/admin`

**Tips Tambahan:**
1. Monitor logs secara berkala
2. Update aplikasi secara rutin
3. Backup data penting
4. Monitor penggunaan resource VPS
5. Setup monitoring alerts (optional)

Jika ada pertanyaan atau masalah, silakan cek troubleshooting guide di atas atau hubungi support.
