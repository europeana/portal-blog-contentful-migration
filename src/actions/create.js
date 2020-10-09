const {
  mysqlClient, contentfulManagement
} = require('../support/config');
const { pad } = require('../support/utils');
const { BlogPostingEntry, RichTextEntry } = require('../models');
const { loadBody } = require('./body');

const help = () => {
  pad.log('Usage: npm run blog create [ID]');
};

// Thank you https://stackoverflow.com/a/1353711/6578424
const isValidDate = (d) => {
  return d instanceof Date && !isNaN(d);
};

const createHasParts = async(post) => {
  const bodyParts = await loadBody(post);
  const hasPartSysIds = [];
  for (const part of bodyParts) {
    if (part.type === 'html') {
      const richTextEntry = new RichTextEntry;
      richTextEntry.text = part.content;
      await richTextEntry.createAndPublish();
      hasPartSysIds.push(richTextEntry.sys.id);
    }
  }
  return hasPartSysIds;
};

// TODO: handle Wordpress post statuses
const createOne = async(id) => {
  pad.log(`Creating entry for post: ${id}`);

  const result = await mysqlClient.connection.execute(`
    SELECT * FROM wp_posts WHERE post_type='post' AND ID=?
  `, [id]);

  const post = result[0][0];
  const entry = new BlogPostingEntry;

  entry.name = post.post_title;
  // some unpublished posts have no URL slug in post_name
  entry.identifier = post.post_name || `${post.ID}`;
  entry.description = post.post_excerpt;
  // GMT dates are very occasionally blank/invalid
  const datePublished = isValidDate(post.post_date_gmt) ? post.post_date_gmt : post.post_date;
  entry.datePublished = datePublished;

  entry.hasPart = await createHasParts(post);

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
    await createOne(row.ID);
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
