const actions = require('./');
const { pad } = require('../support/utils');

const help = () => {
  pad.log('Usage: npm run blog help [action]');
};

const cli = (args) => {
  if (args[0]) {
    require(`./${args[0]}`).help();
  } else {
    for (const action of actions) {
      pad.log(action);
      pad.increase();
      require(`./${action}`).help();
      pad.decrease();
    }
  }
};

module.exports = {
  cli,
  help
};
