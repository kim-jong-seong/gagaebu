module.exports = {
  apps: [
    {
      name: 'gagaebu',
      script: 'src/app.js',
      interpreter: '/home/ec2-user/.nvm/versions/node/v20.19.0/bin/node',
      cwd: '/home/ec2-user/gagaebu',
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
