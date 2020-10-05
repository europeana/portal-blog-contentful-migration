const Entry = require('./Entry');

class PersonEntry extends Entry {
  static get contentTypeId() {
    return 'person';
  }

  constructor() {
    super();
  }

  get fields() {
    return {
      name: this.shortTextField(this.name),
      affiliation: this.shortTextField(this.affiliation),
      url: this.shortTextField(this.url)
    };
  }
}

module.exports = PersonEntry;
