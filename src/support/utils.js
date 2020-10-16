const crypto = require('crypto');

const { defaultLocale } = require('./config');

const pad = {
  depth: 0,
  increase() {
    this.depth = this.depth + 1;
  },
  decrease() {
    this.depth = this.depth - 1;
  },
  log(msg) {
    const prefix = '  '.repeat(this.depth);
    console.log(`${prefix}${msg}`);
  }
};

const hashedSysId = (guid) => {
  return guid ? crypto.createHash('md5').update(guid).digest('hex') : null;
};

class LangMap {
  constructor(value, locale = defaultLocale) {
    if (value) this[locale] = value;
  }

  isEmpty() {
    const keys = Object.keys(this);
    if (keys.length === 0) return true;
    if (keys.length === 1 && (keys[0] === defaultLocale) && !this[keys[0]]) return true;
    return false;
  }
}

const rightsFromAbbreviation = (abbr) => {
  let rights;

  switch (abbr.toUpperCase()) {
    case 'CC0':
      rights = 'http://creativecommons.org/publicdomain/zero/1.0/';
      break;
    case 'CC BY':
      rights = 'http://creativecommons.org/licenses/by/4.0/';
      break;
    case 'CC BY-NC':
    case 'CC BY-NC)':
      rights = 'http://creativecommons.org/licenses/by-nc/4.0/';
      break;
    case 'CC BY-NC-ND':
      rights = 'http://creativecommons.org/licenses/by-nc-nd/4.0/';
      break;
    case 'CC BY-NC-SA':
      rights = 'http://creativecommons.org/licenses/by-nc-sa/4.0/';
      break;
    case 'CC BY-ND':
      rights = 'http://creativecommons.org/licenses/by-nd/4.0/';
      break;
    case 'CC BY-SA':
      rights = 'http://creativecommons.org/licenses/by-sa/4.0/';
      break;
    case 'COPYRIGHT NOT EVALUATED':
      rights = 'http://rightsstatements.org/vocab/CNE/1.0/';
      break;
    case 'IN COPYRIGHT':
      rights = 'http://rightsstatements.org/vocab/InC/1.0/';
      break;
    case 'NO COPYRIGHT - OTHER KNOWN LEGAL RESTRICTIONS':
    case 'NO COPYRIGHT – OTHER KNOWN LEGAL RESTRICTIONS':
      rights = 'http://rightsstatements.org/vocab/NoC-OKLR/1.0/';
      break;
    case 'PUBLIC DOMAIN':
    case 'PUBLIC DOMAIN MARKED':
      rights = 'http://creativecommons.org/publicdomain/mark/1.0/';
      break;
    default:
      rights = null;
      break;
  }

  return rights;
};

module.exports = {
  LangMap,
  pad,
  hashedSysId,
  rightsFromAbbreviation
};
