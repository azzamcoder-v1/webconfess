#!/bin/bash

# Confess Anonymous Bot - VPS Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment of Confess Anonymous Bot..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="confess-anonymous-bot"
APP_DIR="/var/www/$APP_NAME"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
DOMAIN="your-domain.com"

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
apt install -y nginx

# Install Certbot for SSL
print_status "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Create application directory
print_status "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/whatsapp-session

# Set proper permissions
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# Copy application files (assuming current directory has the app)
print_status "Copying application files..."
cp -r ./* $APP_DIR/
cp .env.production $APP_DIR/.env

# Install dependencies
print_status "Installing Node.js dependencies..."
cd $APP_DIR
npm install --production

# Install additional system dependencies for Puppeteer
print_status "Installing Puppeteer dependencies..."
apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# Configure Nginx
print_status "Configuring Nginx..."
cp nginx.conf $NGINX_CONF

# Update domain in Nginx config
sed -i "s/your-domain.com/$DOMAIN/g" $NGINX_CONF

# Enable the site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Configure UFW Firewall
print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443

# Start and enable services
print_status "Starting services..."
systemctl enable nginx
systemctl restart nginx

# Start application with PM2
print_status "Starting application with PM2..."
cd $APP_DIR
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Setup SSL Certificate
print_status "Setting up SSL certificate..."
print_warning "Make sure your domain $DOMAIN points to this server's IP address"
read -p "Press Enter to continue with SSL setup, or Ctrl+C to skip..."

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup automatic SSL renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Setup log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/$APP_NAME << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload $APP_NAME
    endscript
}
EOF

# Create monitoring script
print_status "Creating monitoring script..."
cat > /usr/local/bin/monitor-$APP_NAME.sh << 'EOF'
#!/bin/bash
# Monitor WhatsApp Bot and restart if needed

APP_NAME="confess-anonymous-bot"
LOG_FILE="/var/log/monitor-$APP_NAME.log"

# Check if PM2 process is running
if ! pm2 list | grep -q "$APP_NAME.*online"; then
    echo "$(date): $APP_NAME is not running, restarting..." >> $LOG_FILE
    pm2 restart $APP_NAME
fi

# Check memory usage
MEMORY_USAGE=$(pm2 show $APP_NAME | grep "memory usage" | awk '{print $4}' | sed 's/M//')
if [ "$MEMORY_USAGE" -gt 800 ]; then
    echo "$(date): High memory usage ($MEMORY_USAGE MB), restarting..." >> $LOG_FILE
    pm2 restart $APP_NAME
fi
EOF

chmod +x /usr/local/bin/monitor-$APP_NAME.sh

# Add monitoring to crontab
echo "*/5 * * * * /usr/local/bin/monitor-$APP_NAME.sh" | crontab -

# Final status check
print_status "Checking application status..."
sleep 5
pm2 status

print_success "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Open your browser and go to: https://$DOMAIN"
echo "2. Go to admin panel: https://$DOMAIN/admin"
echo "3. Scan the QR code with your WhatsApp to connect the bot"
echo ""
echo "🔧 Useful Commands:"
echo "- Check app status: pm2 status"
echo "- View logs: pm2 logs $APP_NAME"
echo "- Restart app: pm2 restart $APP_NAME"
echo "- Check Nginx status: systemctl status nginx"
echo "- View Nginx logs: tail -f /var/log/nginx/confess-anonymous-error.log"
echo ""
echo "🔒 Security Notes:"
echo "- Change default passwords in .env file"
echo "- Consider adding basic auth to /admin endpoint"
echo "- Monitor logs regularly for suspicious activity"
echo ""
print_warning "Don't forget to update the domain name in nginx.conf and .env.production files!"
