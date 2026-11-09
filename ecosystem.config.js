module.exports = {
  apps: [
    {
      name: "rama-dashboard",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "rama-bot-engine",
      script: "npm",
      args: "run bot:start",
      env: {
        NODE_ENV: "production",
        BOT_SERVICE_PORT: 4000,
      },
    },
  ],
};
