// TODO: in future, move this to its own Node package
// TODO: permit cleaning of a single entry by identifier

const { contentfulManagement, contentfulPreviewClient } = require('../support/config');
const { pad } = require('../support/utils');

const contentfulContentTypeLinkFields = {};

const help = () => {
  pad.log('Usage: npm run blog clean [CONTENT_TYPE]');
};

const deleteEntry = async(id) => {
  let entry;
  try {
    entry = await contentfulManagement.environment.getEntry(id);
  } catch (e) {
    entry = undefined;
  }

  if (!entry) {
    pad.log('WARNING: no entry; skipping');
    return;
  }

  if (entry.sys.publishedVersion) {
    pad.log('- unpublishing');
    try {
      entry = await entry.unpublish();
    } catch (e) {
      pad.log('WARNING: failed to unpublish entry');
    }
  }

  pad.log('- deleting');
  try {
    entry.delete();
  } catch (e) {
    pad.log('ERROR: failed to delete entry');
    throw e;
  }
};

// Returns true where an entry is linked to exactly once, otherwise false.
async function mayDeleteLinkedEntry(entry) {
  if (!entry || !entry.sys.revision) {
    return false;
  } else if (process.env['CLEAN_SKIP_ENTRY_DELETION_LINK_CHECK'] === '1') {
    return true;
  }

  const linksToEntry = await contentfulPreviewClient.getEntries({
    'links_to_entry': entry.sys.id
  })
    .then((response) => {
      return response.items.length;
    })
    .catch((e) => {
      pad.log(`Failed to get links to entry; skipping: ${entry.sys.id}; ${e.message}`);
      return false;
    });
  return linksToEntry === 1;
}

const getEntriesPage = async(contentTypeId) => {
  const entries = await contentfulPreviewClient.getEntries({
    'content_type': contentTypeId,
    include: 10,
    limit: 10 // responses may be very large, so limit the number retrieved at once
  })
    .then((response) => {
      return response.items;
    })
    .catch((e) => {
      pad.log(`ERROR: Failed to get page of entries: "${contentTypeId}"; ${e.message}`);
      throw e;
    });
  return entries || [];
};

const clean = async(contentTypeId) => {
  let entries;

  while ((entries = await getEntriesPage(contentTypeId)).length > 0) {
    for (const entry of entries) {
      await cleanEntry(entry);
    }
  }
};

const cleanEntry = async(entry) => {
  pad.log(`${entry.sys.contentType.sys.id}: ${entry.sys.id}`);

  // Clean any linked entries first
  pad.increase();
  const linkFields = await linkFieldIds(entry.sys.contentType.sys.id);
  for (const linkField of linkFields) {
    for (const linkedEntry of [].concat(entry.fields[linkField])) {
      const deletable = await mayDeleteLinkedEntry(linkedEntry);
      if (deletable) {
        await cleanEntry(linkedEntry);
      }
    }
  }
  pad.decrease();

  // Delete entry itself
  await deleteEntry(entry.sys.id);
};

const isEntryLinkField = (field) => {
  return field.type === 'Link' && field.linkType === 'Entry';
};

const linkFieldIds = async(contentTypeId) => {
  if (!contentfulContentTypeLinkFields[contentTypeId]) {
    contentfulContentTypeLinkFields[contentTypeId] = [];

    const contentType = await contentfulPreviewClient.getContentType(contentTypeId);

    for (const field of contentType.fields) {
      if (isEntryLinkField(field.type) || (field.type === 'Array' && isEntryLinkField(field.items))) {
        contentfulContentTypeLinkFields[contentTypeId].push(field.id);
      }
    }
  }

  return contentfulContentTypeLinkFields[contentTypeId];
};

const cli = async(args) => {
  await contentfulManagement.connect();

  let contentTypeId = 'blogPosting';
  if (args[0]) {
    contentTypeId = args[0];
  }

  await clean(contentTypeId);
};

module.exports = {
  clean,
  cli,
  help
};
