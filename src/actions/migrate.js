const {
  mysqlClient, contentfulManagement
} = require('./config');
const { migrateAttachments } = require('./attachments');
const { cacheAssetMap } = require('./assets');
const createAllBlogPostings = require('./create').createAll;
const createAllAuthors = require('./authors').createAll;

const migrate = async() => {
  cacheAssetMap();
  // TODO: this will create many attachments we won't use e.g. if they have no
  //       attribution. Consider refactoring to only create needed assets
  //       during individual post creation.
  //       Or pre-validate in `migrateAttachments` that they have an attribution.
  migrateAttachments();
  cacheAssetMap();
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
