const { mysqlClient, contentfulManagement } = require('../support/config');
const { pad, hashedSysId } = require('../support/utils');
const { PersonEntry } = require('../models');

const help = () => {
  pad.log('Usage: npm run blog authors [ID]');
};

const createOne = async(id) => {
  pad.log(`Creating entry for user: ${id}`);

  const result = await mysqlClient.connection.execute(`
    SELECT display_name, user_url, CONCAT(user_nicename, '@blog.europeana.eu') user_id
    FROM wp_users WHERE ID=?
  `, [id]);

  const user = result[0][0];
  const sysId = await hashedSysId(user.user_id);
  const entry = new PersonEntry({ id: sysId });

  entry.name = user.display_name;
  entry.url = user.user_url;

  await entry.createAndPublish();

  return entry;
};

const createAll = async() => {
  const result = await mysqlClient.connection.execute(`
    SELECT DISTINCT post_author FROM wp_posts WHERE post_type='post' ORDER BY post_author ASC
  `);
  const count = result[0].length;
  let i = 0;
  for (const row of result[0]) {
    i = i + 1;
    pad.log(`Author ${i}/${count}`);
    pad.increase();
    await createOne(row.post_author);
    pad.decrease();
  }
};

const cli = async(args) => {
  await contentfulManagement.connect();
  await mysqlClient.connect();

  if (args[0]) {
    await createOne(args[0]);
  } else {
    await createAll();
  }

  await mysqlClient.connection.end();
};

module.exports = {
  createOne,
  createAll,
  cli,
  help
};
