require('dotenv').config();

const mysql = require('mysql');
const contentfulManagement = require('contentful-management');

const mysqlConnection = mysql.createConnection(process.env['MYSQL_URL']);

const contentfulManagementClient = contentfulManagement.createClient({
  accessToken: process.env['CTF_CMA_ACCESS_TOKEN']
});

contentfulManagementClient.connect = async function() {
  const space = await this.getSpace(process.env['CTF_SPACE_ID']);
  const environment = await space.getEnvironment(process.env['CTF_ENVIRONMENT_ID']);
  return environment;
};

module.exports = {
  mysqlConnection,
  contentfulManagementClient,
  defaultLocale: 'en-GB'
};
