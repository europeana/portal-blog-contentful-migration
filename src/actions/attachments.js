require('dotenv').config();

const { mysqlClient, contentfulManagement } = require('../support/config');
const { assetExists } = require('./assets');
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

const assetIdForAttachmentPost = async(attachmentPostId) => {
  const sql = `
    select guid from wp_posts where post_type='attachment' AND ID=?
  `;

  let guid;

  const result = await mysqlClient.connection.execute(sql, [attachmentPostId]);
  if (result[0][0]) guid = accessibleGuid(result[0][0]['image_file_guid']);

  return await hashedSysId(guid);
};

const migrateAttachment = async(post) => {
  const guid = accessibleGuid(post.guid);
  const assetId = await hashedSysId(guid);

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
    if (process.env['SKIP_ASSET_PUBLISH_AWAIT'] === '1') {
      processedAsset.publish();
    } else {
      await processedAsset.publish();
    }

    pad.log(`[NEW] <${guid}> ${asset.sys.id}`);
  } catch (e) {
    pad.log(`[ERROR] <${guid}> ${e}`);
  }
};

const migrateAttachments = async() => {
  const result = await mysqlClient.connection.execute(`
    SELECT * FROM wp_posts WHERE post_type='attachment'
  `);
  for (const post of result[0]) {
    await migrateAttachment(post);
  }
};

const cli = async() => {
  await contentfulManagement.connect();
  await mysqlClient.connect();

  await migrateAttachments();

  await mysqlClient.connection.end();
};

module.exports = {
  accessibleGuid,
  assetIdForAttachmentPost,
  migrateAttachments,
  cli,
  help
};