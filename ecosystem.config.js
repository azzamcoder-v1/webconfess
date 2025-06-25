module.exports = {
  apps: [{
    name: 'confess-anonymous-bot',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // WhatsApp Web specific configurations
    node_args: '--max-old-space-size=1024',
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Restart policy for WhatsApp disconnections
    max_restarts: 10,
    min_uptime: '10s'
  }],

  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_VPS_IP',
      ref: 'origin/main',
      repo: 'YOUR_GITHUB_REPO_URL',
      path: '/var/www/confess-anonymous-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
