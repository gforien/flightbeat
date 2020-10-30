/***************************************
 *        express configuration        *
 ***************************************/
const express = require('express');
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


module.exports = {
  "app" : app
};