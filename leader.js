/****************************************************
 *                                                  *
 *        leader.js : simple leader election        *
 *                                                  *
 ****************************************************/
const axios = require('axios');
const express = require('express');
const dns = require('dns');
const PORT = 5000;
const TIMEOUT = 100;
let leader = -1;
let PID = -1;
let restartCount = 0;


const main = logDecorator(main_);
async function main_(PID) {

  let allNodes = await getNodesIp();

  mainloop: while(true) {

    let nodesUp = await getNodesStatus(allNodes);
    let iAmNextLeader = await isNextLeader(nodesUp);
    if (await notEnoughNodes(nodesUp)) {
      restart("Not enough nodes");
      sleepSec(10);
      continue mainloop;
    }

    if (leader == -1) leader = await getLeader(allNodes, nodesUp);

    if (leader == PID) {
      console.log('I am leader');
      await sleepSec(5);
    }

    else if (leader != -1 && iAmNextLeader) {
      console.log('STEP 3 for LEADER - trigger election');
      for(let node of allNodes) {
        try {
          if(!nodesUp[allNodes.indexOf(node)]) continue;

          let req = `POST ${node}/election/${PID}  => `;
          data = await axios.post(`${node}/election/${PID}`);
          if(data.status != 200) {
            console.log(`${req} false (status ${data.status})`);
            restart(`ERROR - election failed, status=${data.status} for node ${node}`);
            continue mainloop;
          }
          console.log(`${req} ok (status ${data.status})`);
        }
        catch (err) {
          console.log(`${req} ERROR`);
          restart(`ERROR - election failed for unknown reason`);
          continue mainloop;
        }
      }
      leader = PID;
      console.log('STEP 3 - leader elected !');
    }

    else {
      //leader != PID  and I am NOT next leader
      await sleepSec(5);

      if (leader == -1) {
        restart('Limit case: after 5 sec, there is no leader');
        continue mainloop;
      }

      if (allNodes[leader-2] == false) {
        restart('Expected leader is down');
        continue mainloop;
      }

      console.log(`Leader is ${leader}`);

      /*else {
        leaderNode = allNodes[leader-1];
        try {
          data = await axios.get(`${leaderNode}/status`, {timeout: TIMEOUT});
          if(data.status != 200) {
            restart(`ERROR - leader (index ${leader-1}) is down, status=${data.status} for node ${leaderNode}`);
            continue mainloop;
          }
        }
        catch (err) {
          restart(`ERROR - election failed for unknown reason`);
          continue mainloop;
        }
      }*/
    }
  }
}











/***************************
 *        functions        *
 ***************************/

/** isNextLeader
 *
 */
const isNextLeader = logDecorator(isNextLeader_);
async function isNextLeader_(nodesUp) {
  return nodesUp.slice(PID-1).every(ele => !ele);
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

/** getNodesStatus
 *
 */
const getNodesStatus = logDecorator(getNodesStatus_);
async function getNodesStatus_(allNodes) {
  nodesUp = [];
  for(let node of allNodes) {
    try {
      data = await axios.get(`${node}/status`, {timeout: TIMEOUT});
      nodesUp.push(data.status == 200);
    }
    catch (err) {
      nodesUp.push(false)
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
      console.log(`ERROR - ${err.name} (status ${data.null})`);
      console.log(String(err));
    }
  }

  if (leaders.length == 0) return -1;
  else return Math.max.apply(null, leaders);
}

/** getNodesIp
 *
 */
const getNodesIp = logDecorator(getNodesIp_)
async function getNodesIp_() {
  nodes = [];
  for (let i = 1; i <= 16; i++) {
    try {
      if(i != PID) {
        let iTwoDigits = (i<10)? `0${i}`: `${i}`;
        let host = `tc405-112-${iTwoDigits}.insa-lyon.fr`;
        let ipAddr = String(await lookupPromise(host));
        if(!ipAddr.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) throw new Error();
        nodes.push(`http://${ipAddr}:${PORT}`); 
      }
    }
    catch (err) {
      // throw err;
      console.log('Limit case');
      console.log(err);
    }
  }
  if(nodes.length != 15) throw new Error();
  return nodes;
}

/** restart
 *  must ALWAYS be followed by `continue mainloop` and a sleep()
 */
function restart(errMsg) {
  leader = -1;
  restartCount++;
  console.log(errMsg);
  console.log(`\n\n---------------------------------------     RESTART n°${restartCount}     --------------------------------------------`);
}

/** sleepSec
 *
 */
async function sleepSec(timeSec) {
  return new Promise(resolve => setTimeout(resolve, timeSec * 1000));
}

/** lookupPromise
 *
 */
async function lookupPromise(host){
    return new Promise((resolve, reject) => {
        dns.resolve4(host, (err, address) => {
            if(err) reject(err);
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
  // newArgs.push(new Date().toISOString().slice(11,19))
  newArgs.push(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
  newArgs.push(" ");
  let func = `${__function}`
  if (func.length < 8) newArgs.push(func+"\t\t");
  else newArgs.push(func+"\t");
  newArgs.push(...arguments);
  orig.apply(console, newArgs);
}

Object.defineProperty(global, '__stack', {
get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__line', {
get: function() {
        return __stack[2].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
get: function() {
        return __stack[2].getFunctionName();
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
      console.log(req.method + " " + req.url + " " + JSON.stringify(req.body));
    }
    else {
      console.log(req.method + ' ' + req.url);
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
    let newLeaderPid = req.params.pid;

    if(newLeaderPid > PID) {
      leader = newLeaderPid;
      res.status(200).end()

    } else {
      console.log(`Limit case: received leader request from ${newLeaderPid}`)
      res.status(401).end()
    }
  })

  .use((req, res) => {
    res.status(500).end();
  });



/************************
 *        launch        *
 ************************/
module.exports = app.listen(PORT, () => {
  console.log("Listening on port "+PORT);

  if(process.argv.length < 3) throw new Error("usage: node leader.js PID [follower]");
  PID = process.argv[2];

  if(process.argv.length == 4 && process.argv[3] == "follower") {
    console.log(`state=FOLLOWER     pid=${PID}`)
  }
  else {
    console.log(`state=POTENTIAL_LEADER     pid=${PID}`)
    main(PID);
  }
});