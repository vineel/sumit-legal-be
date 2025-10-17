const path = require('path');
const dotenv = require('dotenv');

const projectRoot = __dirname;
const envPath = path.join(projectRoot, '.env');
const envConfig = dotenv.config({ path: envPath }).parsed || {};

const env = {
  ...envConfig,
  NODE_ENV: envConfig.NODE_ENV || 'production',
  PORT: envConfig.PORT || 5001,
};

module.exports = {
  apps: [
    {
      name: 'sumit-legal-be',
      cwd: projectRoot,
      script: 'server.js',
      interpreter: 'node',
      env,
    },
  ],
};
