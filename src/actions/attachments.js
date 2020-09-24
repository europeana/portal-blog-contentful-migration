require('dotenv').config();

const crypto = require('crypto');

const { mysqlConnection, contentfulManagement } = require('../support/config');
const { assetExists } = require('./assets');
const { LangMap, pad } = require('../support/utils');

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

const assetIdForAttachmentPost = async(attachmentPostId) => {
  const sql = `
    select guid from wp_posts where post_type='attachment' AND ID=?
  `;

  let guid;

  mysqlConnection.query(sql, [attachmentPostId], (error, results) => {
    if (results[0]) guid = accessibleGuid(results[0]['image_file_guid']);
  });

  return await assetIdForGuid(guid);
};

const assetIdForGuid = (guid) => {
  return guid ? crypto.createHash('md5').update(guid).digest('hex') : null;
};

const migrateAttachment = async(post) => {
  const guid = accessibleGuid(post.guid);
  const assetId = await assetIdForGuid(guid);

  const exists = await assetExists(assetId);
  if (exists) {
    pad.log(`[EXISTS] <${guid}> ${assetId}`);
    return;
  }

  try {
    // Assets may not be published without a title. Fallback to file name.
    const fileName = guid.split('/').pop();
    const title = post.post_title || fileName;

    const assetData = {
      fields: {
        title: new LangMap(title),
        file: new LangMap({
          contentType: post.post_mime_type,
          fileName,
          upload: guid
        })
      }
    };
    const asset = await contentfulManagement.environment.createAssetWithId(assetId, assetData);

    const processedAsset = await asset.processForAllLocales();
    processedAsset.publish();

    pad.log(`[NEW] <${guid}> ${asset.sys.id}`);
  } catch (e) {
    pad.log(`[ERROR] <${guid}> ${e}`);
  }
};

const migrateAttachments = async() => {
  mysqlConnection.query(`
    SELECT * FROM wp_posts WHERE post_type='attachment'
  `, async(error, results) => {
    for (const post of results) {
      await migrateAttachment(post);
    }
  });
};

const cli = async() => {
  await contentfulManagement.connect();
  await mysqlConnection.connect();

  await migrateAttachments();

  await mysqlConnection.end();
};

module.exports = {
  accessibleGuid,
  assetIdForAttachmentPost,
  migrateAttachments,
  cli,
  help
};
