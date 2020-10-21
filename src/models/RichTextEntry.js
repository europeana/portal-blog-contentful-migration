const cheerio = require('cheerio');

const Entry = require('./Entry');

class RichTextEntry extends Entry {
  static get contentTypeId() {
    return 'richText';
  }

  headlineFromText() {
    const h1Match = (typeof this.text === 'string') ? this.text.match(/<h1.*?>(.*?)<\/h1.*?>/i) : null;
    if (h1Match) return h1Match[1];
    return cheerio.load(this.text).text();
  }

  get fields() {
    return {
      headline: this.textField(this.headline ? this.headline : this.headlineFromText(), { max: 150 }),
      text: this.longTextField(this.markdownTextField(this.text))
    };
  }
}

module.exports = RichTextEntry;
