/****************************************************
 *                                                  *
 *        leader.js : simple leader election        *
 *                                                  *
 ****************************************************/



/***********************
 *        debug        *
 ***********************/
// node --trace-warnings leader.js
// 'use strict';
// process.on('unhandledRejection', (error, p) => {
//   process.stdout.write('=== UNHANDLED REJECTION ===\n');
//   console.log(error.stack);
// });




/**************************************
 *        constants definition        *
 **************************************/
const axios              = require('axios');
const express            = require('express');
const dns                = require('dns');
const ps                 = require('ps-node');
const child_process      = require('child_process');
const nodemailer         = require('nodemailer');

require('dotenv').config();
const transport          = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PWD
  }
});

const PORT               = 5005;
let HOSTNAME             = null;
let PRIORITY             = null;
const GET_STATUS_TIMEOUT = 100;
const RESTART_DELAY_SEC  = 10; 
const MAIN_DELAY_SEC     = 60*5; 
let leader               = -1;
let restartCount         = 0;




/*******************************
 *        main function        *
 *******************************/
const main = logDecorator(main_);
async function main_() {

  let allNodes = await getNodesIp();

  mainloop: while(true) {

    let nodesUp = await getNodesStatus(allNodes);
    let iAmNextLeader = await isNextLeader(nodesUp);
    let otherNodesLeader = await getLeader(allNodes, nodesUp);

    if (await notEnoughNodes(nodesUp)) {
      restart(`ERROR - Not enough nodes    [at line ${__line}]`);
      await sleepSec(10);
      continue mainloop;
    }

    if (leader == -1) {
      leader = otherNodesLeader;
    } else if (leader != otherNodesLeader) {
      leader = -1;
    }

    if (leader == PRIORITY) {
      console.log(`I am leader (${leader})`);
      /*-----------------------------------------------------------------------*/
      /*--------------------       Critical section        --------------------*/
      if(await isProcessRunning('beat', 'leader.js'))
      /*-----------------------------------------------------------------------*/
      await sleepSec(MAIN_DELAY_SEC);
    }

    else if (await shouldTriggerElection(iAmNextLeader, nodesUp)) {
      console.log('STEP 3 for LEADER - trigger election');
      for(let node of allNodes) {
        let request = "";
        try {
          if(!nodesUp[allNodes.indexOf(node)]) continue;

          request = `POST ${node}/election/${PRIORITY}  => `;
          data = await axios.post(`${node}/election/${PRIORITY}`);
          if(data.status != 200) {
            console.log(`${request} false (status ${data.status})`);
            restart(`ERROR - election failed, status=${data.status} for node ${node}    [at line ${__line}]`);
            continue mainloop;
          }
          console.log(`${request} ok (status ${data.status})`);
        }
        catch (err) {
          console.log(`${request} ERROR`);
          console.log(err);
          restart(`ERROR - election failed for unknown reason    [at line ${__line}]`);
          continue mainloop;
        }
      }
      leader = PRIORITY;
      console.log('STEP 3 - leader elected !');
    }

    else if (leader == -1) {
      await sleepSec(5);
      restart('Limit case: after 5 sec, there is no leader');
      continue mainloop;
    }

    else {
      console.log(`Leader is ${leader}`);
      await sleepSec(MAIN_DELAY_SEC);

      if (allNodes[leader-2] == false) {
        restart('Expected leader is down');
        continue mainloop;
      }
    }
  }
}




/**********************************
 *        useful functions        *
 **********************************/

/** isNextLeader
 *
 */
const isNextLeader = logDecorator(isNextLeader_);
async function isNextLeader_(nodesUp) {
  console.log(`I am ${PRIORITY} so nodes above me are ${nodesUp.slice(PRIORITY-1)}`);
  return nodesUp.slice(PRIORITY-1).every(ele => !ele);
}

/** notEnoughNodes
 *
 */
const notEnoughNodes = logDecorator(notEnoughNodes_)
function notEnoughNodes_(nodesUp) {
  let countNodesUp = nodesUp.filter(ele => ele == true).length;
  if(countNodesUp < 3) {
    return true;
  }
  return false;
}

/** shouldTriggerElection
 *
 */
const shouldTriggerElection = logDecorator(shouldTriggerElection_);
function shouldTriggerElection_(iAmNextLeader, nodesUp) {
  let leaderIndex = (leader < PRIORITY)? leader-1: leader-2;
  console.log(`leader = ${leader} ; priority = ${PRIORITY} so leader index is ${leaderIndex}`);
  console.log(`iAmNextLeader = ${iAmNextLeader} ; nodesUp[leaderIndex] = ${nodesUp[leaderIndex]}`);
  return (iAmNextLeader && (leader == -1 || nodesUp[leaderIndex] == false));
}

/** getNodesStatus
 *
 */
const getNodesStatus = logDecorator(getNodesStatus_);
async function getNodesStatus_(allNodes) {
  nodesUp = [];
  let i = 0;
  for(let node of allNodes) {
    i++;
    try {
      data = await axios.get(`${node}/status`, {timeout: GET_STATUS_TIMEOUT});
      nodesUp.push(data.status == 200);
      console.log(`[${i}] for node ${node} => ${data.status == 200}`);
    }
    catch (err) {
      nodesUp.push(false)
      console.log(`[${i}] for node ${node} => false (err)`);
    }
  }
  if (nodesUp.length != 15) throw new Error(`nodesUp.length = ${nodesUp.length} but expected 15`);
  return nodesUp;
}

/** getLeader
 *
 */
const getLeader = logDecorator(getLeader_);
async function getLeader_(allNodes, nodesUp) {
  leaders = [];
  for(let node of allNodes) {
    try {
      if(!nodesUp[allNodes.indexOf(node)]) continue;
      data = await axios.get(`${node}/leader`);
      console.log('found leader = '+data.data);
      leaders.push(data.data);
    }
    catch (err) {
      console.log(`ERROR - ${err.name} (status ${data.status})    [at line ${__line}]`);
      console.log(err);
    }
  }

  if (leaders.length == 0) return -1;
  if (leaders.every(ele => ele == leaders[0])) return leaders[0];
  else return -1;
}

/** getNodesIp
 *
 */
const getNodesIp = logDecorator(getNodesIp_)
async function getNodesIp_() {
  nodes = [];
  for (let i = 1; i <= 16; i++) {
    try {
      if(i != PRIORITY) {
        let iTwoDigits = (i<10)? `0${i}`: `${i}`;
        let host = `tc405-112-${iTwoDigits}.insa-lyon.fr`;
        let ipAddr = String(await lookupPromise(host));
        if(!ipAddr.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) throw new Error();
        nodes.push(`http://${ipAddr}:${PORT}`); 
        console.log(`at [${i}]  ${host} => ${ipAddr}`);
      }
    }
    catch (err) {
      console.log(`ERROR - ${err.name} (status ${data.status})    [at line ${__line}]`);
      console.log(err);
    }
  }
  if(nodes.length != 15) {
    console.log(`ERROR - nodes.length = ${nodes.length} but expected 15    [at line ${__line}]`);
  }
  return nodes;
}

/** restart
 *  must ALWAYS be followed by `continue mainloop` and a sleep()
 */
const restart = logDecorator(restart_);
function restart_(errMsg) {
  leader = -1;
  restartCount++;
  console.log(errMsg);
  console.log(`\n\n---------------------------------------     RESTART n°${restartCount}     --------------------------------------------`);
}

/** sleepSec
 *
 */
const sleepSec = logDecorator(sleepSec_);
async function sleepSec_(timeSec) {
  return new Promise(resolve => setTimeout(resolve, timeSec * 1000));
}

/** sendMail
 *
 */
const sendMail = logDecorator(sendMail_);
async function sendMail_(msg) {
  const email = {
      from: 'leader-election@email.com',
      to: 'to@email.com',
      subject: 'Critical error on ',
      text: msg
  };
  try {
    await transport.sendMail(email);
  } catch (err) {
    console.log("ERROR - Could not send mail");
    console.log(err);
  }
}

/** isProcessRunning
 *
 */
const isProcessRunning = logDecorator(isProcessRunning_);
async function isProcessRunning_(cmd, args) {
  return new Promise((resolve, reject) => {
    ps.lookup(
    { command: cmd,
      arguments: args,
    },
    (err, resultList ) => {
      // resultList = [ {pid, command, arguments} ]
      if (err) {
          return reject(err);
      }

      resultList = resultList.filter(ele => ele.pid != process.pid);
      for (p of resultList) {
        console.log(`detected running process '${cmd} ${args}' (PID ${p.pid})`);
      }
      resolve(resultList.length > 0);
    });
  });
}

/** lookupPromise
 *
 */
async function lookupPromise(host){
    return new Promise((resolve, reject) => {
        dns.resolve4(host, (err, address) => {
            if(err) {
              return reject(err);
            }
            resolve(address);
        });
   });
};




/*************************************
 *        logging preferences        *
 *************************************/
function logDecorator(wrapped) {
  return async function() {
    // console.log(`>>>>>> ${wrapped.name}() called with: ${JSON.stringify(arguments).slice(0, 80)}`);
    console.log(`>>>> ${wrapped.name}()`);
    const result = await wrapped.apply(this, arguments);
    console.log(`<<<< ${wrapped.name} returns ${String(result).slice(0,80)}`);
    return result;
  }
}

const orig = console.log
console.log = function() {
  let newArgs = []
  let date = new Date();
  newArgs.push(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().replace(/T/, ' ').replace(/\..+/, ''));
  newArgs.push(" ");
  newArgs.push(HOSTNAME);
  newArgs.push(process.pid);
  newArgs.push(" ");
  let func = `${__function}`;
  while(func.length <= 30) func = func +" ";
  newArgs.push(func);
  newArgs.push(...arguments);
  orig.apply(console, newArgs);
}

Object.defineProperty(global, '__stack', {
get: function() {
      // try {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
      // } catch (err) {
      //   console.error("ERROR - at magic function __stack");
      //   console.error(String(err) + "\n");
      // }
    }
});

Object.defineProperty(global, '__line', {
get: function() {
      // try {
      //   return 1;
        return __stack[1].getLineNumber();
      // } catch (err) {
      //   console.error("ERROR - at magic function __line");
      //   console.error(String(err) + "\n");
      // }
    }
});

Object.defineProperty(global, '__function', {
get: function() {
      // try {
      //   return 1;
        return __stack[2].getFunctionName();
      // } catch (err) {
      //   console.error("ERROR - at magic function __function");
      //   console.error(String(err) + "\n");
      // }
    }
});









/***************************************
 *        express configuration        *
 ***************************************/
const app = express();

app
  .use(express.json())
  .use(express.urlencoded({ extended: false }))

  .use((req,res,next) => {
    if (req.body) {
      console.log(req.method + " " + req.url + " " + JSON.stringify(req.body) + " (from " + req.ip + ")");
    }
    else {
      console.log(req.method + ' ' + req.url + " (from " + req.ip + ")");
    }
    next();
  })

  .get('/status', (req, res) => {
    res.status(200).end();
  })

  .get('/leader', (req, res) => {
    res.status(200).end(String(leader));
  })

  .post('/election/:pid', (req, res) => {
    let newLeaderPid = Number(req.params.pid);

    if(newLeaderPid > PRIORITY) {
      leader = newLeaderPid;
      res.status(200).end()
    } else {
      console.log(`ERROR - received unexpected leader request from ${newLeaderPid}    [at line ${__line}]`);
      res.status(401).end()
    }
  })

  .use((req, res) => {
    res.status(500).end();
  });








/************************
 *        launch        *
 ************************/
(async () => {

  // EXIT if leader.js was badly invoked
  if(process.argv.length < 3) {
    process.stdout.write("usage: node leader.js PRIORITY [follower]\n");
    process.exit(1);
  }
  PRIORITY = process.argv[2];

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
    console.log(`ERROR - hostname=${HOSTNAME} did not match as expected with 'tc405-112-xx'  [at line ${__line}]`);
    console.log('Exiting');
    process.exit(1);
  }
  //   - invoked with a PRIORITY that does not match HOSTNAME
  HOSTNAME = unameMatch[0];
  const HOST_ID = Number(unameMatch[1]);
  if(HOST_ID != PRIORITY) {
    console.log(`ERROR - prority=${PRIORITY} but expected ${HOST_ID} (as hostname=${HOSTNAME})    [at line ${__line}]`);
    console.log('Exiting');
    process.exit(1);
  }


  // EXIT if leader.js is already running
  try {
    if (await isProcessRunning('node', 'leader.js')) {
      console.log('Exiting');
      process.exit(0);
    }
  } catch (err) {
    console.log(`ERROR - could not execute isProcessRunning()    [at line ${__line}]`);
    console.log(err)
  }

  // launch
  module.exports = app.listen(PORT, () => {
    console.log("Listening on port "+PORT);
    if(process.argv.length == 4 && process.argv[3] == "follower") {
      console.log(`state=FOLLOWER             prority=${PRIORITY}     hostname=${HOSTNAME}`)
    }
    else {
      console.log(`state=POTENTIAL_LEADER     prority=${PRIORITY}     hostname=${HOSTNAME}`)
      main();
    }
  });
})();
