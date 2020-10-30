/**************************************
 *        constants definition        *
 **************************************/
require('dotenv').config();
const child_process                          = require('child_process');
const { app }                                = require('./expressConfig.js');
const { logConfig, logDecorator }            = require('./logConfig.js');
// let   { election, isProcessRunning, leader } = require('./election.js');
const election = require('./election.js');
logConfig(null);


/************************
 *     main function    *
 ************************/
(async () => {

  // EXIT if leader.js was badly invoked
  if(process.argv.length < 3) {
    process.stdout.write("usage: node leader.js ID [follower]\n");
    process.exit(1);
  }
  const priority = process.argv[2];

  // EXIT if leader.js was badly deployed, i.e.
  //   - deployed without a .env file
  if(!process.env.MAIL_ID || !process.env.MAIL_PWD) {
    console.log(`ERROR - .env variables MAIL_ID or MAIL_PWD are empty (did you create a .env file ?)    [at line ${__line}]`);
    console.log('Exiting');
    process.exit(1);
  }
  //   - deployed elsewhere than the nodes it was supposed to be running on
  let unameResult = child_process.execSync('uname -a').toString();
  let unameMatch = /tc405-112-(\d\d)/.exec(unameResult);
  if(!unameMatch || unameMatch.length < 1) {
    console.log(`ERROR - uname did not match as expected with 'tc405-112-xx'  [at line ${__line}]`);
    console.log('Exiting');
    process.exit(1);
  }
  //   - invoked with a priority that does not match hostname
  const hostname = unameMatch[0];
  logConfig(hostname);
  const host_id = Number(unameMatch[1]);
  if(host_id != priority) {
    console.log(`ERROR - prority=${priority} but expected ${host_id} (as hostname=${hostname})    [at line ${__line}]`);
    console.log('Exiting');
    process.exit(1);
  }


  // EXIT if leader.js is already running
  try {
    if (await election.isProcessRunning('node', 'leader.js')) {
      console.log('Exiting');
      process.exit(0);
    }
  } catch (err) {
    console.log(`ERROR - could not execute isProcessRunning()    [at line ${__line}]`);
    console.log(err)
  }

  // launch
  module.exports = app.listen(process.env.PORT, () => {
    console.log("Listening on port "+process.env.PORT);
    if(process.argv.length == 4 && process.argv[3] == "follower") {
      console.log(`state=FOLLOWER             prority=${priority}     hostname=${hostname}`)
    }
    else {
      console.log(`state=POTENTIAL_LEADER     prority=${priority}     hostname=${hostname}`)
      election.election(prority);
    }
  });
})();


/***********************
 *        debug        *
 ***********************/
// node --trace-warnings leader.js
// 'use strict';
// process.on('unhandledRejection', (error, p) => {
//   process.stdout.write('=== UNHANDLED REJECTION ===\n');
//   console.log(error.stack);
// });