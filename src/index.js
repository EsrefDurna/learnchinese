#!/usr/bin/env node
require('dotenv').config();
const program = require('commander');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const { MostCommon } = require('../data/mostcommon');
const { readJSONFile, writeJSONToFile } = require('./filesystem');
const {
  emptyline,
  success,
  incorrect,
} = require('./utils');
const arr = [];
function dataFilePath() {
  return '../data/data.json';
}
function margin() {
  return '     ';
}
function loadQuestions() {
  let data;
  const datafile = dataFilePath();
  if (fs.existsSync(datafile)) {
    data = readJSONFile(datafile);
  } else {
    data = MostCommon;
  }
  for (const key in data) {
    MostCommon[key].chinese = key;
    arr.push(MostCommon[key]);
    if (arr[arr.length - 1].rate === undefined) {
      arr[arr.length - 1].rate = arr.length - 1;
    }
  }
}
function saveProgress() {
  const data = {};
  for (let i = 0; i < arr.length; i += 1) {
    data[arr[i].chinese] = arr[i];
  }
  writeJSONToFile(dataFilePath(), data, []);
}
function showWelcome() {
  console.log(
    chalk.green(
      figlet.textSync('Ni Hao', {
        // font: 'Ghost',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      }),
    ),
  );
}
async function askQuestions(quiz) {
  const questions = [];
  const choices = [];
  for (let i = 0; i < quiz.options.keys.length; i += 1) {
    const key = quiz.options.keys[i];
    const opt = quiz.options.opt[key];
    if (!opt.hide) {
      choices.push({
        name: `${choices.length + 1})${margin()}${opt.eng}`,
        value: key,
      });
    }
  }
  questions.push({
    type: 'list',
    name: 'choice',
    message: `${margin()}${quiz.question.ask.chinese}`,
    choices,
  });
  const result = await inquirer.prompt(questions);
  return result;
}
function rand(max, notInclude = []) {
  if (max <= notInclude.length) {
    throw new Error('max random is too small');
  }
  let rnd = -1;
  let cnt = 0;
  while (rnd === -1 || notInclude.includes(rnd)) {
    rnd = Math.floor(Math.random() * max);
    cnt += 1;
    if (cnt > 100) {
      throw new Error('could not find random');
    }
  }
  return rnd;
}
function sortRate(sortField = 'rate') {
  arr.sort((a, b) => a[sortField] - b[sortField]);
}
function nextquestion() {
  sortRate('rate');
  const options = { keys: [], opt: {} };
  const question = { ask: {}, key: -1 };
  const optioncount = Number.parseInt(process.env.optioncount || 5, 10);
  for (let i = 0; i < optioncount; i += 1) {
    const rnd = rand(20, options.keys);
    const opt = arr[rnd];
    options.keys.push(rnd);
    options.opt[rnd] = opt;
    options.opt[rnd].hide = false;
  }
  const answer = rand(options.keys.length);
  question.ask = options.opt[options.keys[answer]];
  question.key = options.keys[answer];
  return { question, options };
}
function setupObject(index) {
  if (arr[index].rate === undefined) {
    arr[index].rate = 0;
  }
  if (arr[index].learnrate === undefined) {
    arr[index].learnrate = 0;
  }
}
async function game(counter = 10000, callback = null) {
  let quiz = nextquestion();
  let answer = {};
  while (true) {
    answer = await askQuestions(quiz);
    // answer = { choice: 1 };
    answer.choice = parseInt(answer.choice, 10);
    if (answer.choice === quiz.question.key) {
      const ans = arr[answer.choice];
      success(`${margin()}${ans.chinese}  , ${ans.pinyin}`);
      success(`${margin()}${ans.eng}`);
      setupObject(quiz.question.key);
      arr[quiz.question.key].rate += 1;
      emptyline();
      quiz = nextquestion();
      counter -= 1;
      if (counter < 0) {
        if (callback) {
          callback(5, game);
        }
        return;
      }
    } else {
      incorrect(`${margin()}incorrect`);
      emptyline();
      setupObject(answer.choice);
      setupObject(quiz.question.key);
      arr[quiz.question.key].rate -= 1;
      arr[answer.choice].rate -= 1;
      arr[quiz.question.key].learnrate = 0;
      arr[answer.choice].learnrate = 0;
      quiz.options.opt[answer.choice].hide = true;
    }
  }
}
function learnTime() {
  if (program.time) {
    return parseInt(program.time * 1000, 10);
  }
  return process.env.time || 5000;
}
async function startLearning(counter = 10000, callback = null, lastIndex = 0) {
  counter -= 1;
  if (counter < 0) {
    if (callback) {
      callback(5, startLearning);
    }
    return;
  }
  emptyline(2);
  const rnd = rand(20, [lastIndex]);
  const learn = arr[rnd];
  sortRate('learnrate');
  setupObject(rnd);
  arr[rnd].learnrate += 3;
  console.log(`${margin()}${learn.chinese}`);
  setTimeout(() => {
    console.log(`${margin()}${learn.chinese} , ${learn.pinyin}`);
    console.log(`${margin()}${learn.eng}`);
  }, learnTime() / 2);
  setTimeout(() => startLearning(counter, callback), learnTime(), rnd);
}
async function run() {
  program
    .version('0.1.0')
    .option('-q, --quiz [quiz]', 'Start Quiz', false)
    .option('-l, --learn [learn]', 'Learn', false)
    .option('-m, --mixed [mixed]', 'mixed mode teaches you 10 words then quiz', false)
    .option('-t, --time [time]', 'Change Learning Card Repeat interval in Second', 5)
    .option('-c, --character [character]', 'Set how many characters want default 300', 300)
    .option('-r, --reset [reset]', 'Delete user progress data', false)
    .parse(process.argv);
  if (program.reset) {
    fs.unlinkSync('./data/data.json');
    success('data file has been deleted');
    process.exit();
  }
  showWelcome();
  setInterval(saveProgress, process.env.saveTime || 60000);
  loadQuestions();
  if (program.quiz) {
    game();
  } else if (program.learn) {
    startLearning();
  } else {
    game(5, startLearning);
  }
}
run();
