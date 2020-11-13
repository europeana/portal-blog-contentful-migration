const Entry = require('./Entry');

class EmbedEntry extends Entry {
  static get contentTypeId() {
    return 'embed';
  }

  get fields() {
    return {
      // FIXME: default to something more informative of context. url from embed?
      name: this.shortTextField(this.name || 'Blog post embed'),
      embed: this.longTextField(this.embed)
    };
  }
}

module.exports = EmbedEntry;
