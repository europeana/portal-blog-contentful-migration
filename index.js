const actions = require('./src/actions');

const act = async(action, args) => {
  if (!actions.includes(action)) throw new Error(`Unknown action: ${action}`);

  return require(`./src/actions/${action}`).cli(args);
};

const action = process.argv[2];
try {
  act(action, process.argv.slice(3));
} catch (e) {
  console.log(`ERROR: ${e.message}`);
  process.exit(1);
}
