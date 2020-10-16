const Entry = require('./Entry');
const { hashedSysId } = require('../support/utils');

class PersonEntry extends Entry {
  static get contentTypeId() {
    return 'person';
  }

  static sysIdFromUsername(username) {
    return hashedSysId(`${username}@blog.europeana.eu`);
  }

  constructor(sys = {}) {
    super(sys);
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
