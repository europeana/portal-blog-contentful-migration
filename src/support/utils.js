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

module.exports = {
  LangMap,
  pad
};
