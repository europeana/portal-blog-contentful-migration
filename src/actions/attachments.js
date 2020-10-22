require('dotenv').config();

const axios = require('axios');

const { mysqlClient, contentfulManagement } = require('../support/config');
const { assetExists, cacheAssetMap } = require('./assets');
const { LangMap, pad, hashedSysId } = require('../support/utils');

const help = () => {
  pad.log('Usage: npm run blog attachments');
};

// Clean up URLs in guid field
//
// 1. Remove port :81 from origin
// 2. Switch scheme to https://
const accessibleGuid = (guid) => {
  return guid
    .replace('blog.europeana.eu:81', 'blog.europeana.eu')
    .replace('http://blog.europeana.eu/', 'https://blog.europeana.eu/');
};

const migrateAttachment = async(post) => {
  const guid = accessibleGuid(post.guid);
  const assetId = await hashedSysId(guid);

  const exists = await assetExists(assetId);
  if (exists) {
    pad.log(`[EXISTS] <${guid}> ${assetId}`);
    return;
  }

  await createAndPublish(assetId, guid, post.post_title, post.post_mime_type);
};

const createAndPublish = async(id, url, title, contentType) => {
  // Assets may not be published without a title. Fallback to file name.
  const fileName = url.split('/').pop();
  title = title || fileName;

  const assetData = {
    fields: {
      title: new LangMap(title),
      file: new LangMap({
        contentType,
        fileName,
        upload: url
      })
    }
  };

  try {
    const asset = await contentfulManagement.environment.createAssetWithId(id, assetData);

    const processedAsset = await asset.processForAllLocales();
    if (process.env['SKIP_ASSET_PUBLISH_AWAIT'] === '1') {
      processedAsset.publish();
    } else {
      await processedAsset.publish();
    }

    pad.log(`[NEW] <${url}> ${asset.sys.id}`);
  } catch (e) {
    pad.log(`[ERROR] <${url}> ${e}`);
  }
};

const migrateAttachments = async() => {
  // TODO: Post 26343 has an inverted version of image 26383, with a hash suffix:
  //         http://blog.europeana.eu/wp-content/uploads/2020/01/2021609_objecten_82671-e1579705091936.jpeg
  //       This approach fails to supply such.
  const result = await mysqlClient.connection.execute(`
    SELECT * FROM wp_posts WHERE post_type='attachment'
  `);
  for (const post of result[0]) {
    await migrateAttachment(post);
  }
};

/**
 * Scrape all post bodies for links to uploads, check if they have already been
 * migrated, if not, handle them.
 */
const migrateMediaReferencedInContent = async() => {
  const result = await mysqlClient.connection.execute(`
    SELECT ID, post_content FROM wp_posts WHERE post_type='post' ORDER BY post_date ASC
  `);

  for (const post of result[0]) {
    const pattern = /"(https?:\/\/blog\.europeana\.eu(:81)?\/wp-content\/uploads\/[^"]*)"/g;
    const matches = post.post_content.matchAll(pattern);
    for (const match of matches) {
      const url = match[1];
      const guid = accessibleGuid(url);
      const assetId = hashedSysId(guid);
      if (await assetExists(assetId)) {
        pad.log(`[EXISTS] <${guid}> ${assetId}`);
      } else {
        try {
          const contentType = await getContentType(guid);
          await createAndPublish(assetId, guid, null, contentType);
        } catch (e) {
          pad.log(`[ERROR] <${guid}> ${e.message}`);
        }
      }
    }
  }
};

const getContentType = async(url) => {
  const response = await axios.head(url);
  return response.headers['content-type'];
};

const cli = async() => {
  await contentfulManagement.connect();
  await mysqlClient.connect();

  await migrateAttachments();
  await cacheAssetMap();
  await migrateMediaReferencedInContent();

  await mysqlClient.connection.end();
};

module.exports = {
  accessibleGuid,
  migrateAttachments,
  cli,
  help
};
