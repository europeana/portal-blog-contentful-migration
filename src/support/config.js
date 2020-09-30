require('dotenv').config();

const mysql = require('mysql2/promise');
const contentfulManagementPkg = require('contentful-management');
const contentful = require('contentful');
const TurndownService = require('turndown');

const mysqlClient = {
  async connect() {
    const connection = await mysql.createConnection(process.env['MYSQL_URL']);
    this.connection = connection;
    return connection;
  }
};

const contentfulManagement = {
  async connect() {
    const client = await contentfulManagementPkg.createClient({
      accessToken: process.env['CTF_CMA_ACCESS_TOKEN']
    });
    const space = await client.getSpace(process.env['CTF_SPACE_ID']);
    const environment = await space.getEnvironment(process.env['CTF_ENVIRONMENT_ID']);
    this.environment = environment;
    return environment;
  }
};

const contentfulPreviewClient = contentful.createClient({
  accessToken: process.env['CTF_CPA_ACCESS_TOKEN'],
  space: process.env['CTF_SPACE_ID'],
  environment: process.env['CTF_ENVIRONMENT_ID'],
  host: 'preview.contentful.com'
});

const turndownService = new TurndownService();
turndownService.keep(['cite']);

module.exports = {
  maxLengthShort: 255,
  maxLengthLong: 50000,
  defaultLocale: 'en-GB',
  mysqlClient,
  contentfulManagement,
  contentfulPreviewClient,
  turndownService
};
