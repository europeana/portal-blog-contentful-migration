const Entry = require('./Entry');

class BlogPostingEntry extends Entry {
  static get contentTypeId() {
    return 'blogPosting';
  }

  constructor() {
    super();
    this.hasPart = [];
  }

  get fields() {
    return {
      name: this.shortTextField(this.name),
      identifier: this.shortTextField(this.identifier),
      description: this.shortTextField(this.description),
      primaryImageOfPage: this.linkField(this.primaryImageOfPage),
      // hasPart: this.linkField(this.hasPart),
      datePublished: this.dateField(this.datePublished)
      // genre: this.shortTextField(this.genre),
      // keywords: this.shortTextField(this.keywords)
      // author: this.linkField(this.author)
    };
  }
}

module.exports = BlogPostingEntry;
