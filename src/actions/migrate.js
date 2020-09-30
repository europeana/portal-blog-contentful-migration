const {
  mysqlConnection // , contentfulManagementClient, defaultLocale
} = require('./config');

const migrate = async() => {
  await mysqlConnection.connect();

  // TODO: migrate data
  // const contentfulConnection = await contentfulManagementClient.connect();

  // mysqlConnection.query();

  await mysqlConnection.end();
};

const cli = async() => {
  await migrate();
};

module.exports = {
  migrate,
  cli
};
