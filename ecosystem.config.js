module.exports = {
  apps: [
    {
      name: 'gagaebu',
      script: 'src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DB_PATH: './data/gagaebu.db',
      },
    },
  ],
};
