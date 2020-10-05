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

async function leaderElection(PID) {

  let allNodes = await getNodesIp();

  mainloop: while(true) {

    let nodesUp = await getNodesStatus(allNodes);
    let amINextLeader = await isNextLeader(nodesUp);
    if (notEnoughNodes(nodesUp)) {
      restart("Not enough nodes");
      continue mainloop;
    }

    if (leader == PID && amINextLeader) {
      console.log('STEP 4 - I am leader');

    }

    else if (amINextLeader) {
      console.log('STEP 3 for LEADER - trigger election');
      for(let node of allNodes) {
        try {
          if(!nodesUp[allNodes.indexOf(node)]) continue;

          process.stdout.write(`POST ${node}/election/${PID} \t\t`);
          data = await axios.post(`${node}/election/${PID}`);
          if(data.status != 200) {
            console.log(`false (status ${data.status})`);
            restart(`ERROR - election failed, status=${data.status} for node ${node}`);
            continue mainloop;
          }
          console.log(`ok (status ${data.status})`);
        }
        catch (err) {
          console.log(`false !`);
          console.log(err);
          restart(`ERROR - election failed for unknown reason`);
          continue mainloop;
        }
      }
      leader = PID;
      console.log('STEP 3 - leader elected !');
    }

    else {
      console.log('STEP 3 for FOLLOWER - wait for election');
      await new Promise(resolve => setTimeout(resolve, 10000));

      if (leader == -1) {
        restart('Limit case: after 10 sec, there is no leader');
        continue mainloop;
      }

      else {
        leaderode = allNodes[leader-1];
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
      }
    }
  }
}

function notEnoughNodes(nodesUp) {
  let countNodesUp = nodesUp.filter(ele => ele == true).length;
  if(countNodesUp < 3) {
    restart(`ERROR - countNodesUp = ${countNodesUp} but expected a number >= 3`);
    return true;
  }
  return false;
}

/** restart
 *
 */
async function restart(errMsg) {
  leader = -1;
  restartCount++;
  console.log(errMsg);
  console.log(`\n\n-------------------------  RESTART n°${restartCount}  ------------------------------`);
  console.log('-------------------------------------------------------------------------------------');
  await new Promise(resolve => setTimeout(resolve, 10000));
}

/** getNodesStatus
 *
 */
const getNodesStatus = loggingDecorator(getNodesStatus_);
async function getNodesStatus_(allNodes) {
  nodesUp = [];
  for(let node of allNodes) {
    try {
      // process.stdout.write(`GET ${node}/status \t\t`);
      data = await axios.get(`${node}/status`, {timeout: TIMEOUT});
      nodesUp.push(data.status == 200);
      // console.log(`=> true (code ${data.status})`)
    }
    catch (err) {
      nodesUp.push(false)
      // console.log(`=> false (${err.name})`)
    }
  }
  if (nodesUp.length != 15) throw new Error(`nodesUp.length = ${nodesUp.length} but expected 15`);
  return nodesUp;
}


/** getNodesIp
 *
 */
const getNodesIp = loggingDecorator(getNodesIp_);
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


/** amINextLeader
 *
 */
const isNextLeader = loggingDecorator(isNextLeader_);
async function isNextLeader_(nodesUp) {
  return nodesUp.slice(PID-1).every(ele => !ele);
}


/** loggingDecorator
 *
 */
function loggingDecorator(wrapped) {
  return async function() {
    console.log(`>>>>>> ${wrapped.name}() called with: ${JSON.stringify(arguments).slice(0, 80)}`);
    const result = await wrapped.apply(this, arguments);
    console.log(`<<<<<< ${wrapped.name} returns: ${String(result).slice(0,80)}`);
    return result;
  }
}


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
  });


/***************************
 *        endpoints        *
 ***************************/
app
  .get('/status', (req, res) => {
    res.status(200).end();
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

module.exports = app.listen(PORT, () => {
  console.log("Listening on port "+PORT);

  if(process.argv.length < 3) throw new Error("usage: node leader.js PID [follower]");
  PID = process.argv[2];

  if(process.argv.length == 4 && process.argv[3] == "follower") {
    console.log(`init() as FOLLOWER ONLY with pid=${PID}`)
  }
  else {
    console.log(`init() as CONTENDER with pid=${PID}`)
    leaderElection(PID);
  }
});