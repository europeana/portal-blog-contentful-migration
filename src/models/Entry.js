const {
  contentfulManagement, turndownService, maxLengthShort, maxLengthLong
} = require('../support/config');
const { pad, LangMap } = require('../support/utils');

class Entry {
  constructor(sys = {}) {
    this.sys = sys;
  }

  static typecastOneOrMany(value, handler) {
    const langMap = (value instanceof LangMap) ? value : new LangMap(value);
    const typecast = new LangMap;

    for (const locale in langMap) {
      if (Array.isArray(langMap[locale])) {
        typecast[locale] = langMap[locale].map((element) => handler(element, locale));
      } else {
        typecast[locale] = handler(langMap[locale], locale);
      }
    }

    return typecast;
  }

  async createAndPublish() {
    pad.log(`- creating \`${this.constructor.contentTypeId}\``);
    pad.increase();
    let entry;
    try {
      if (this.sys.id) {
        entry = await contentfulManagement.environment.createEntryWithId(this.constructor.contentTypeId, this.sys.id, { fields: this.fields });
      } else {
        entry = await contentfulManagement.environment.createEntry(this.constructor.contentTypeId, { fields: this.fields });
      }

      if (process.env['CREATE_SKIP_PUBLISH_AWAIT'] === '1') {
        entry.publish();
      } else {
        await entry.publish();
      }
    } catch (e) {
      pad.log(`- ERROR: ${e.message}`);
      process.exit(1);
    }
    pad.decrease();
    this.sys = entry.sys;
  }

  getField(fieldName) {
    return this.fields[fieldName];
  }

  dateField(raw) {
    return this.constructor.typecastOneOrMany(raw, (value) =>
      new Date(value)
    );
  }

  linkField(raw, type = 'Entry') {
    return this.constructor.typecastOneOrMany(raw, (value) => {
      return {
        sys: {
          type: 'Link',
          linkType: type,
          id: value
        }
      };
    });
  }

  textField(raw, options = {}) {
    return this.constructor.typecastOneOrMany(raw, (value) =>
      // TODO: append ellipsis if truncated
      (typeof value === 'string' && options.max) ? value.slice(0, options.max) : value
    );
  }

  shortTextField(raw, options = {}) {
    return this.textField(raw, { ...options, ...{ max: maxLengthShort } });
  }

  longTextField(raw, options = {}) {
    return this.textField(raw, { ...options, ...{ max: maxLengthLong } });
  }

  trimField(raw) {
    return this.constructor.typecastOneOrMany(raw, (value) =>
      typeof value === 'string' ? value.trim() : value
    );
  }

  markdownTextField(raw) {
    return this.constructor.typecastOneOrMany(raw, (value) => {
      return turndownService.turndown(value);
    });
  }

  get fields() {
    return {};
  }
}

module.exports = Entry;
