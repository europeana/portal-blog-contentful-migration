const {
  pgClient // , contentfulManagementClient, defaultLocale
} = require('./config');

const migrate = async() => {
  await pgClient.connect();

  // TODO: migrate data
  // const contentfulConnection = await contentfulManagementClient.connect();

  await pgClient.end();
};

const cli = async() => {
  await migrate();
};

module.exports = {
  migrate,
  cli
};
