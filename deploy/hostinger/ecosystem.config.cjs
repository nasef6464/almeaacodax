module.exports = {
  apps: [
    {
      name: 'almeaa-codax-api',
      cwd: './server',
      script: 'dist/server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.BACKEND_PORT || process.env.PORT || 4000,
      },
      error_file: '/var/log/almeaa-codax/api-error.log',
      out_file: '/var/log/almeaa-codax/api-out.log',
      time: true,
      max_memory_restart: '600M',
      restart_delay: 3000,
    },
  ],
};
