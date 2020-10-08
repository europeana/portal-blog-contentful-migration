const Entry = require('./Entry');
const { LangMap } = require('../support/utils');

class ImageWithAttributionEntry extends Entry {
  static get contentTypeId() {
    return 'imageWithAttribution';
  }

  normaliseUrl(langMap) {
    return this.constructor.typecastOneOrMany(langMap, (value) => {
      if (typeof value !== 'string') return value;

      const itemIdMatch = value.match(/europeana\.eu\/portal\/([a-z][a-z]\/)?record(\/[0-9]+\/[^/.#$]+)/);
      if (itemIdMatch) return `http://data.europeana.eu/item${itemIdMatch[2]}`;

      if (value.startsWith('www.')) return `https://${value}`;

      return (value.startsWith('http://') || value.startsWith('https://')) ? value : null;
    });
  }

  get fields() {
    if (this.name.isEmpty()) this.name = new LangMap('Blog post image');
    return {
      name: this.shortTextField(this.name),
      image: this.image ? this.linkField(this.image, 'Asset') : null,
      creator: this.shortTextField(this.creator),
      provider: this.shortTextField(this.provider),
      license: this.licenseField(this.license),
      url: this.shortTextField(this.normaliseUrl(this.trimField(this.url)))
    };
  }
}

module.exports = ImageWithAttributionEntry;
