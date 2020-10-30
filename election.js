/**************************************
 *        constants definition        *
 **************************************/
require('dotenv').config();
const axios            = require('axios');
const dns              = require('dns');
const ps               = require('ps-node');
const child_process    = require('child_process');
const { logDecorator } = require('./logConfig.js');


let leader       = -1;


/*******************************
 *       leader election       *
 *******************************/
const election = logDecorator(election_);
async function election_(ID) {

  let restartCount = 0;
  let allNodes     = await getNodesIp(ID);

  mainloop: while(true) {


    // const restart = logDecorator((errMsg) => {
    //   leader = -1;
    //   restartCount++;
    //   console.log(errMsg);
    //   console.log(`\n\n---------------------------------------     RESTART n°${restartCount}     --------------------------------------------`);
    //   continue mainloop;
    // });


    let nodesUp = await getNodesStatus(allNodes);
    let iAmNextLeader = await isNextLeader(ID, nodesUp);
    let otherNodesLeader = await getLeader(allNodes, nodesUp);

    if (await notEnoughNodes(nodesUp)) {
      leader = -1;
      restartCount++;
      restart(`ERROR - Not enough nodes    [at line ${__line}]`, restartCount);
      await sleepSec(10);
      continue mainloop;
    }

    if (leader == -1) {
      leader = otherNodesLeader;
    } else if (leader != otherNodesLeader) {
      leader = -1;
    }

    if (leader == ID) {
      console.log(`I am leader (${leader})`);
      /*-----------------------------------------------------------------------*/
      /*--------------------       Critical section        --------------------*/

      if(await isProcessRunning('beat', 'leader.js'))
      /*-----------------------------------------------------------------------*/
      await sleepSec();
    }

    else if (await shouldTriggerElection(iAmNextLeader, nodesUp)) {
      console.log('STEP 3 for LEADER - trigger election');
      for(let node of allNodes) {
        let request = "";
        try {
          if(!nodesUp[allNodes.indexOf(node)]) continue;

          request = `POST ${node}/election/${ID}  => `;
          data = await axios.post(`${node}/election/${ID}`);
          if(data.status != 200) {
            console.log(`${request} false (status ${data.status})`);
            leader = -1;
            restartCount++;
            restart(`ERROR - election failed, status=${data.status} for node ${node}    [at line ${__line}]`, restartCount);
            continue mainloop;
          }
          console.log(`${request} ok (status ${data.status})`);
        }
        catch (err) {
          console.log(`${request} ERROR`);
          console.log(err);
          leader = -1;
          restartCount++;
          restart(`ERROR - election failed for unknown reason    [at line ${__line}]`, restartCount);
          continue mainloop;
        }
      }
      leader = ID;
      console.log('STEP 3 - leader elected !');
    }

    else if (leader == -1) {
      await sleepSec(5);
      leader = -1;
      restartCount++;
      restart('Limit case: after 5 sec, there is no leader', restartCount);
      continue mainloop;
    }

    else {
      console.log(`Leader is ${leader}`);
      await sleepSec(process.env.MAIN_DELAY_SEC);

      if (allNodes[leader-2] == false) {
        leader = -1;
        restartCount++;
        restart('Expected leader is down', restartCount);
        continue mainloop;
      }
    }
  }
}

/** restart
 *  must ALWAYS be followed by `continue mainloop` and a sleep()
 */
const restart = logDecorator(restart_);
function restart_(errMsg, restartCount) {
  // leader = -1;
  // restartCount++;
  console.log(errMsg);
  console.log(`\n\n---------------------------------------     RESTART n°${restartCount}     --------------------------------------------`);
}




/**********************************
 *        useful functions        *
 **********************************/

/** isNextLeader
 *
 */
const isNextLeader = logDecorator(isNextLeader_);
async function isNextLeader_(ID, nodesUp) {
  console.log(`I am ${ID} so nodes above me are ${nodesUp.slice(ID-1)}`);
  return nodesUp.slice(ID-1).every(ele => !ele);
}

/** notEnoughNodes
 *
 */
const notEnoughNodes = logDecorator(notEnoughNodes_)
function notEnoughNodes_(nodesUp) {
  let countNodesUp = nodesUp.filter(ele => ele == true).length;
  if(countNodesUp < process.env.MIN_NODES_UP) {
    return true;
  }
  return false;
}

/** shouldTriggerElection
 *
 */
const shouldTriggerElection = logDecorator(shouldTriggerElection_);
function shouldTriggerElection_(ID, iAmNextLeader, nodesUp) {
  let leaderIndex = (leader < ID)? leader-1: leader-2;
  console.log(`leader = ${leader} ; priority = ${ID} so leader index is ${leaderIndex}`);
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
      data = await axios.get(`${node}/status`, {timeout: process.env.GET_STATUS_TIMEOUT});
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
async function getNodesIp_(ID) {
  nodes = [];
  for (let i = 1; i <= 16; i++) {
    try {
      if(i != ID) {
        let iTwoDigits = (i<10)? `0${i}`: `${i}`;
        let host = `tc405-112-${iTwoDigits}.insa-lyon.fr`;
        let ipAddr = String(await lookupPromise(host));
        if(!ipAddr.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) throw new Error();
        nodes.push(`http://${ipAddr}:${process.env.PORT}`); 
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

/** sleepSec
 *
 */
const sleepSec = logDecorator(sleepSec_);
async function sleepSec_(timeSec) {
  return new Promise(resolve => setTimeout(resolve, timeSec * 1000));
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

module.exports = {
  "election" : election,
  "isProcessRunning" : isProcessRunning,
  "leader" : leader
};