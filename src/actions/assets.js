const fs = require('fs');
const path = require('path');

const { contentfulPreviewClient } = require('../support/config');
const { pad } = require('../support/utils');

const cacheFilePath = path.resolve(__dirname, '../../tmp/assetMap.json');

let assetMap;

const help = () => {
  pad.log('Usage: npm run blog assets <list|cache>');
};

// Fetch all asset map via the preview API, for later use by `assetExists`
const loadAssetMap = async() => {
  pad.log('Loading asset map...');

  assetMap = await loadAssetMapFromCache();
  if (assetMap) {
    pad.log(`  ... loaded from cache file ${cacheFilePath}`);
  } else {
    assetMap = await loadAssetMapFromContentful();
    pad.log('  ... loaded from Contentful');
  }

  return assetMap;
};

const cacheAssetMap = async() => {
  const assetMap = await loadAssetMapFromContentful();
  fs.writeFileSync(cacheFilePath, JSON.stringify(assetMap, null, 2));
  pad.log(`Asset ID cache written to ${cacheFilePath}`);
};

const loadAssetMapFromCache = () => {
  if (!fs.existsSync(cacheFilePath)) return null;
  const cacheFileContents = fs.readFileSync(cacheFilePath, { encoding: 'utf8' });
  return JSON.parse(cacheFileContents);
};

const loadAssetMapFromContentful = async() => {
  const assetMap = {};

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
      for (const item of assets.items) {
        if (item.fields.file) assetMap[item.sys.id] = item.fields.file.url;
      }
      skip = skip + 100;
    }
  }

  return assetMap;
};

const assetExists = async(assetId) => {
  if (!assetMap) await loadAssetMap();

  return Object.keys(assetMap).includes(assetId);
};

const assetUrl = async(assetId) => {
  if (!assetMap) await loadAssetMap();

  return assetMap[assetId];
};

const cli = async(args) => {
  switch (args[0]) {
    case 'cache':
      cacheAssetMap();
      break;
    case 'list':
      await loadAssetMap();
      pad.log(JSON.stringify(assetMap, null, 2));
      break;
    default:
      help();
  }
};

module.exports = {
  cli,
  help,
  assetExists,
  assetUrl,
  cacheAssetMap,
  loadAssetMap
};
