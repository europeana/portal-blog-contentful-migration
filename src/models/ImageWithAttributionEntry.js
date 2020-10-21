const Entry = require('./Entry');
const { rightsFromAbbreviation, hashedSysId } = require('../support/utils');
const { accessibleGuid } = require('../actions/attachments');
const { assetExists } = require('../actions/assets');

class ImageWithAttributionEntry extends Entry {
  static get contentTypeId() {
    return 'imageWithAttribution';
  }

  /**
   * This uses the caption of an image in the Wordpress blog to attempt to
   * extract the required metadata for an imageWithAttribution entry, and if
   * present create and return such an entry.
   *
   * The caption is first split by commas. The last of those substrings is
   * inspected to see if it contains a recognisable rights statement abbreviation
   * like "CC BY-SA", and if so, that is converted to the relevant URL. If not,
   * null is returned because that field is required.
   *
   * The first substring of the caption is then used for the image title.
   * If there are a total of four substrings, the second and third will be used
   * for the creator and provider respectively.
   *
   * If the last substring had multiple lines and the last of those is a URL,
   * it is used for the url field.
   */
  static async fromCaption(caption, url, link) {
    if (!caption) return null;
    // TODO: handle in some other way images on other hosts, e.g. in post 24935,
    //       with one on googleusercontent.com
    if (!url.includes('://blog.europeana.eu/')) return null;

    caption = caption.trim();
    if (caption === '') return null;

    const assetId = hashedSysId(accessibleGuid(url));
    if (!await assetExists(assetId)) return null;

    const captionParts = caption.split(',');
    let captionLastPart = captionParts[captionParts.length - 1].trim();
    if (captionLastPart.endsWith('.')) captionLastPart = captionLastPart.slice(0, -1);

    const captionLastPartLines = captionLastPart.split(/\n/);
    const captionLastPartFirstLine = captionLastPartLines[0].trim();

    const rights = rightsFromAbbreviation(captionLastPartFirstLine);
    if (!rights) return null;

    const imageWithAttributionEntry = new ImageWithAttributionEntry;
    imageWithAttributionEntry.license = rights;
    imageWithAttributionEntry.name = captionParts[0].trim();
    if (captionParts.length === 4) {
      imageWithAttributionEntry.creator = captionParts[1].trim();
      imageWithAttributionEntry.provider = captionParts[2].trim();
    }
    if (link) {
      imageWithAttributionEntry.url = link;
    } else if (captionLastPartLines.length > 1) {
      const captionLastPartLastLine = captionLastPartLines[captionLastPartLines.length - 1].trim();
      if (/^https?:\/\//.test(captionLastPartLastLine)) {
        imageWithAttributionEntry.url = captionLastPartLastLine;
      }
    }

    imageWithAttributionEntry.image = assetId;

    return imageWithAttributionEntry;
  }

  normaliseUrl(langMap) {
    return this.constructor.typecastOneOrMany(langMap, (value) => {
      if (typeof value !== 'string') return value;

      const itemIdMatch = value.match(/europeana\.eu(\/portal)?\/([a-z][a-z]\/)?(record|item)(\/[0-9]+\/[^/.#$]+)/);
      if (itemIdMatch) return `http://data.europeana.eu/item${itemIdMatch[4]}`;

      if (value.startsWith('www.')) return `https://${value}`;

      return (value.startsWith('http://') || value.startsWith('https://')) ? value : null;
    });
  }

  get fields() {
    return {
      name: this.shortTextField(this.name),
      image: this.image ? this.linkField(this.image, 'Asset') : null,
      creator: this.shortTextField(this.creator),
      provider: this.shortTextField(this.provider),
      license: this.shortTextField(this.license),
      url: this.shortTextField(this.normaliseUrl(this.trimField(this.url)))
    };
  }
}

module.exports = ImageWithAttributionEntry;
