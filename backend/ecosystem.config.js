/**
 * PM2 Ecosystem Configuration
 * Horizontal Scaling with PM2 Cluster Mode
 * 
 * PM2 will automatically:
 * - Start multiple Node.js instances
 * - Load balance between them
 * - Restart crashed instances
 * - Zero-downtime reload
 */

export default {
  apps: [
    {
      name: 'sme-bank-api',
      script: './dist/server.js',
      
      // ✅ Cluster mode - Run multiple instances
      instances: 4,  // จำนวน instances (แนะนำ: จำนวน CPU cores)
      exec_mode: 'cluster',  // Cluster mode (load balancing)
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Auto restart
      autorestart: true,
      watch: false,  // Don't watch files in production
      max_memory_restart: '1G',  // Restart if memory > 1GB
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Performance
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
