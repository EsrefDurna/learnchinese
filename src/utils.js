const chalk = require('chalk');
function emptyline(cnt = 3, msg = '') {
  for (let i = 0; i < cnt; i += 1) {
    console.log(msg);
  }
}
function success(message) {
  console.log(
    chalk.black.bgGreen.bold(message),
  );
}
function incorrect(message) {
  console.log(
    chalk.white.bgRed.bold(message),
  );
}
module.exports = {
  emptyline,
  success,
  incorrect,
};
