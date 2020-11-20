const {
  mysqlClient, contentfulManagement
} = require('./config');
const createAllBlogPostings = require('./posts').createAll;
const createAllAuthors = require('./authors').createAll;

const migrate = async() => {
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
