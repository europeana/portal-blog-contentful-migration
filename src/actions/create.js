const {
  mysqlClient, contentfulManagement
} = require('../support/config');
const { pad } = require('../support/utils');
const { BlogPostingEntry } = require('../models');

const help = () => {
  pad.log('Usage: npm run blog create [ID]');
};

// Thank you https://stackoverflow.com/a/1353711/6578424
const isValidDate = (d) => {
  return d instanceof Date && !isNaN(d);
};

const tagsAndCategories = async(id) => {
  const result = await mysqlClient.connection.execute(`
    SELECT wp_term_taxonomy.taxonomy, wp_terms.name
    FROM wp_term_relationships
    LEFT JOIN wp_term_taxonomy ON wp_term_relationships.term_taxonomy_id=wp_term_taxonomy.term_taxonomy_id
    LEFT JOIN wp_terms ON wp_term_taxonomy.term_id=wp_terms.term_id
    WHERE wp_term_relationships.object_id=?
  `, [id]);

  const response = {
    tags: [],
    categories: []
  };

  for (const row of result[0]) {
    if (row.taxonomy === 'post_tag') {
      response.tags.push(row.name);
    } else if (row.taxonomy === 'category') {
      response.categories.push(row.name);
    }
  }

  return response;
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

  const postTagsAndCategories = await tagsAndCategories(id);
  entry.keywords = postTagsAndCategories.tags;
  entry.genre = postTagsAndCategories.categories;

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
