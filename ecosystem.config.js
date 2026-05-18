/**
 * PM2 Ecosystem Config — used by the AWS deploy workflow to manage processes.
 *
 * Update the `cwd` paths and port numbers to match your EC2 setup.
 * Run `pm2 start ecosystem.config.js` on your server to initialize.
 */
module.exports = {
  apps: [
    {
      name: "app",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./apps/app",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "dashboard",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./apps/dashboard",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
    {
      name: "api",
      script: "dist/index.js",
      cwd: "./apps/api",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
    {
      name: "worker",
      script: "dist/index.js",
      cwd: "./apps/worker",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
