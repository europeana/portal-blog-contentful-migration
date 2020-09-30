const {
  mysqlClient, contentfulManagement
} = require('../support/config');
const { pad } = require('../support/utils');
const { BlogPostingEntry } = require('../models');

const help = () => {
  pad.log('Usage: npm run blog create [ID]');
};

const create = async(id) => {
  pad.log(`Creating entry for post: ${id}`);

  const result = await mysqlClient.connection.execute(`
    SELECT * FROM wp_posts WHERE post_type='post' AND ID=?
  `, [id]);

  const post = result[0][0];
  const entry = new BlogPostingEntry;

  // TODO: handle Wordpress post statuses
  entry.name = post.post_title;
  entry.identifier = post.post_name || `${post.ID}`; // some unpublished posts have no URL slug in post_name
  entry.description = post.post_excerpt;
  entry.datePublished = post.post_date_gmt;

  await entry.createAndPublish();

  return entry;
};

const createAll = async() => {
  const result = await mysqlClient.connection.execute(`
    SELECT ID FROM wp_posts WHERE post_type='post' ORDER BY post_date ASC
  `);
  const count = result[0].length;
  let i = 0;
  for (const row of result[0]) {
    i = i + 1;
    pad.log(`Blog post ${i}/${count}`);
    pad.increase();
    await create(row.ID);
    pad.decrease();
  }
};

const cli = async(args) => {
  await contentfulManagement.connect();
  await mysqlClient.connect();

  if (args[0]) {
    await create(args[0]);
  } else {
    await createAll();
  }

  await mysqlClient.connection.end();
};

module.exports = {
  create,
  createAll,
  cli,
  help
};
