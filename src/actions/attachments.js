require('dotenv').config();

const axios = require('axios');

const { mysqlClient, contentfulManagement, contentfulPreviewClient } = require('../support/config');
const { LangMap, pad, hashedSysId } = require('../support/utils');

const help = () => {
  pad.log('Usage: npm run blog attachments [GUID]');
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

const loadOrCreateAssetForAttachment = async(guid) => {
  pad.log(`- Attachment <${guid}>`);
  pad.increase();
  let asset;

  try {
    const url = accessibleGuid(guid);
    const assetId = await hashedSysId(url);

    asset = await loadAsset(assetId);
    if (asset) {
      pad.log(`[EXISTS] ${assetId}`);
    } else {
      await createAndPublish(assetId, url);
      asset = await loadAsset(assetId);
    }
  } catch (e) {
    pad.log(`[ERROR] ${e.message}`);
  }

  pad.decrease();
  return asset;
};

const attachmentPost = async(url) => {
  const pathname = new URL(url).pathname;

  const result = await mysqlClient.connection.execute(`
    SELECT *
    FROM wp_posts
    WHERE post_type='attachment'
    AND guid like CONCAT('%', ?)
    ORDER BY post_date ASC
  `, [pathname]);

  const post = result[0][0];
  return post;
};

const loadAsset = async(assetId) => {
  try {
    const asset = await contentfulPreviewClient.getAsset(assetId);
    return asset;
  } catch (e) {
    return null;
  }
};

const createAndPublish = async(id, url) => {
  const fileName = url.split('/').pop();

  let title;
  let contentType;

  const post = await attachmentPost(url);
  if (post) {
    title = post.post_title;
    contentType = post.post_mime_type;
  }

  // Assets may not be published without a title. Fallback to file name.
  title = title || fileName;
  contentType = contentType || await getContentType(url);

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

  let asset;
  try {
    asset = await contentfulManagement.environment.createAssetWithId(id, assetData);

    const processedAsset = await asset.processForAllLocales();
    await processedAsset.publish();

    pad.log(`[NEW] ${asset.sys.id}`);
  } catch (e) {
    pad.log(`[ERROR] ${e.message}`);
  }
  return asset;
};

const getContentType = async(url) => {
  const response = await axios.head(url);
  return response.headers['content-type'];
};

const cli = async(args) => {
  await contentfulManagement.connect();
  await mysqlClient.connect();

  if (args[0]) {
    loadOrCreateAssetForAttachment(args[0]);
  } else {
    help();
  }

  await mysqlClient.connection.end();
};

module.exports = {
  loadOrCreateAssetForAttachment,
  cli,
  help
};
