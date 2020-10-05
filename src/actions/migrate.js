const {
  mysqlClient, contentfulManagement
} = require('./config');
const { migrateAttachments } = require('./attachments');
const { cacheAssetIds } = require('./assets');
const { createAll } = require('./create');

const migrate = async() => {
  cacheAssetIds();
  migrateAttachments();
  cacheAssetIds();
  createAll();
};

const cli = async() => {
  await contentfulManagement.connect();
  await mysqlClient.connect();
  await migrate();
  await mysqlClient.connection.end();
};

module.exports = {
  migrate,
  cli
};
