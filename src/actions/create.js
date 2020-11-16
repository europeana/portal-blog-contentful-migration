const cheerio = require('cheerio');

const {
  mysqlClient, contentfulManagement
} = require('../support/config');
const { pad } = require('../support/utils');
const {
  BlogPostingEntry, EmbedEntry, ImageWithAttributionEntry, PersonEntry, RichTextEntry
} = require('../models');
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
    } else if (part.type === 'image') {
      const imageWithAttribution = await ImageWithAttributionEntry.fromCaption(part.text, part.url, part.link);

      // TODO: do something with images not having an attribution? convert to HTML?
      if (imageWithAttribution) {
        await imageWithAttribution.createAndPublish();
        hasPartSysIds.push(imageWithAttribution.sys.id);
      } else {
        pad.increase();
        pad.log(`[ERROR] Failed to create imageWithAttribution for ${part.url}`);
        pad.decrease();
      }
    } else if (part.type === 'embed') {
      const embedEntry = new EmbedEntry;
      embedEntry.name = `Embed for ${post.post_title}`;
      embedEntry.embed = part.content;
      await embedEntry.createAndPublish();
      hasPartSysIds.push(embedEntry.sys.id);
    } else {
      pad.increase();
      pad.log(`[ERROR] unknown part type ${part.type}`);
      pad.decrease();
    }
  }

  return hasPartSysIds;
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

/**
 * First attempts to use an inline attribution prefixed with "Feature(d) image" in
 * the post body. Failing that, attempts to use the image caption metadata.
 */
const createPrimaryImageOfPage = async(post) => {
  let primaryImageOfPage;

  const cheerioDoc = cheerio.load(post.post_content, {
    xml: {
      withDomLvl1: false // prevent injection of body, head, html elements
    }
  });
  let inlineAttribution = cheerioDoc(':contains(\'Feature image\')');
  if (inlineAttribution.length === 0) {
    inlineAttribution = cheerioDoc(':contains(\'Featured image\')');
  }
  if (inlineAttribution.length > 0) {
    const caption = inlineAttribution.text().replace(/Featured? image: ?/g, '');
    const link = cheerioDoc('a', inlineAttribution).attr('href');
    primaryImageOfPage = await ImageWithAttributionEntry.fromCaption(caption, post.image_url, link);
  }

  if (!primaryImageOfPage) {
    primaryImageOfPage = await ImageWithAttributionEntry.fromCaption(post.image_caption, post.image_url);
  }

  if (primaryImageOfPage) {
    await primaryImageOfPage.createAndPublish();
    if (inlineAttribution) {
      inlineAttribution.remove();
      post['post_content'] = cheerioDoc.html();
    }
    return primaryImageOfPage.sys.id;
  }
};

const createOne = async(id) => {
  const result = await mysqlClient.connection.execute(`
    SELECT wp_posts.*,
           wp_users.user_nicename author_username,
           featured_image.post_excerpt image_caption, featured_image.guid image_url
    FROM wp_posts
    LEFT JOIN wp_users ON wp_posts.post_author=wp_users.ID
    LEFT JOIN wp_postmeta ON wp_posts.id=wp_postmeta.post_id AND wp_postmeta.meta_key='_thumbnail_id'
    LEFT JOIN wp_posts featured_image ON wp_postmeta.meta_value=featured_image.ID
    WHERE wp_posts.post_type='post' AND wp_posts.ID=?
  `, [id]);

  const post = result[0][0];

  const entry = new BlogPostingEntry;

  // some unpublished posts have no URL slug in post_name
  const identifier = post.post_name || `${post.ID}`;
  pad.log(`Creating entry for post: "${identifier}" [ID=${id}]`);

  entry.name = post.post_title;
  entry.identifier = identifier;
  entry.description = post.post_excerpt;
  // GMT dates are very occasionally blank/invalid
  const datePublished = isValidDate(post.post_date_gmt) ? post.post_date_gmt : post.post_date;
  entry.datePublished = datePublished;

  const postTagsAndCategories = await tagsAndCategories(id);
  entry.keywords = postTagsAndCategories.tags;
  entry.genre = postTagsAndCategories.categories;

  entry.primaryImageOfPage = await createPrimaryImageOfPage(post);

  entry.hasPart = await createHasParts(post.ID);

  if (post.author_username) entry.author = [PersonEntry.sysIdFromUsername(post.author_username)];

  await post.post_status === 'publish' ? entry.createAndPublish() : entry.create();

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
