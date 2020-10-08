const {
  mysqlClient, contentfulManagement
} = require('../support/config');
const { pad, rightsFromAbbreviation } = require('../support/utils');
const { BlogPostingEntry, ImageWithAttributionEntry } = require('../models');

const help = () => {
  pad.log('Usage: npm run blog create [ID]');
};

// Thank you https://stackoverflow.com/a/1353711/6578424
const isValidDate = (d) => {
  return d instanceof Date && !isNaN(d);
};

const extractPrimaryImageOfPage = (post) => {
  if (!post.image_caption) return null;
  const caption = post.image_caption.trim();
  if (caption === '') return null;
  const captionParts = caption.split(',');
  let captionLastPart = captionParts[captionParts.length - 1].trim();
  if (captionLastPart.endsWith('.')) captionLastPart = captionLastPart.slice(0, -1);

  const captionLastPartLines = captionLastPart.split(/\n/);
  const captionLastPartFirstLine = captionLastPartLines[0].trim();

  const rights = rightsFromAbbreviation(captionLastPartFirstLine);
  console.log('rights', JSON.stringify(rights));
  // return license;
};

// TODO: handle Wordpress post statuses
const createOne = async(id) => {
  pad.log(`Creating entry for post: ${id}`);

  const result = await mysqlClient.connection.execute(`
    SELECT wp_posts.*, featured_image.post_title image_title, featured_image.post_excerpt image_caption, featured_image.guid image_url
    FROM wp_posts
    LEFT JOIN wp_postmeta ON wp_posts.id=wp_postmeta.post_id AND wp_postmeta.meta_key='_thumbnail_id'
    LEFT JOIN wp_posts featured_image ON wp_postmeta.meta_value=featured_image.ID
    WHERE wp_posts.post_type='post' AND wp_posts.ID=?
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

  // const primaryImageOfPage = extractPrimaryImageOfPage(post);
  // console.log('primaryImageOfPage', primaryImageOfPage);
  extractPrimaryImageOfPage(post);

  // await entry.createAndPublish();

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
