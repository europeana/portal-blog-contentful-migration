const fs = require('fs');
const path = require('path');

const { contentfulPreviewClient } = require('../support/config');
const { pad } = require('../support/utils');

const cacheFilePath = path.resolve(__dirname, '../../tmp/assetIds.json');

let assetIds;

const help = () => {
  pad.log('Usage: npm run blog assets <list|cache>');
};

// Fetch all asset IDs via the preview API, for later use by `assetExists`
const loadAssetIds = async() => {
  pad.log('Loading asset IDs...');

  assetIds = await loadAssetIdsFromCache();
  if (assetIds) {
    pad.log(`  ... loaded from cache file ${cacheFilePath}`);
  } else {
    assetIds = await loadAssetIdsFromContentful();
    pad.log('  ... loaded from Contentful');
  }

  return assetIds;
};

const cacheAssetIds = async() => {
  const assetIds = await loadAssetIdsFromContentful();
  fs.writeFileSync(cacheFilePath, JSON.stringify(assetIds));
  pad.log(`Asset ID cache written to ${cacheFilePath}`);
};

const loadAssetIdsFromCache = () => {
  if (!fs.existsSync(cacheFilePath)) return null;
  const cacheFileContents = fs.readFileSync(cacheFilePath, { encoding: 'utf8' });
  return JSON.parse(cacheFileContents);
};

const loadAssetIdsFromContentful = async() => {
  let ids = [];

  let skip = 0;
  let keepGoing = true;
  while (keepGoing) {
    const assets = await contentfulPreviewClient.getAssets({
      limit: 100,
      skip
    });

    if (assets.items.length === 0) {
      keepGoing = false;
    } else {
      ids = ids.concat(assets.items.map((item) => item.sys.id));
      skip = skip + 100;
    }
  }

  return ids;
};

const assetExists = async(assetId) => {
  if (!assetIds) await loadAssetIds();

  return assetIds.includes(assetId);
};

const cli = async(args) => {
  switch (args[0]) {
    case 'cache':
      cacheAssetIds();
      break;
    case 'list':
      await loadAssetIds();
      pad.log(JSON.stringify(assetIds));
      break;
    default:
      help();
  }
};

module.exports = {
  cli,
  help,
  assetExists,
  cacheAssetIds,
  loadAssetIds
};
