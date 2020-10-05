const {
  mysqlClient, contentfulManagement
} = require('./config');
const { migrateAttachments } = require('./attachments');
const { cacheAssetIds } = require('./assets');
const createAllBlogPostings = require('./create').createAll;
const createAllAuthors = require('./authors').createAll;

const migrate = async() => {
  cacheAssetIds();
  migrateAttachments();
  cacheAssetIds();
  createAllAuthors();
  createAllBlogPostings();
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
