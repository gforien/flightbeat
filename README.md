# leader-election :computer::policeman::globe_with_meridians:

![](https://img.shields.io/badge/5TC-ELK-blueviolet)
![](https://img.shields.io/badge/license-The%20Unlicense-ff69b4)

#### Here is a simple description of what it does
<!--- Here are technologies used
<p style = text-align:center;>
    <img  src="https://upload.wikimedia.org/wikipedia/fr/3/38/Guitar_Hero_Logo.png" alt="Guitar Hero" height="145" width="199">
    <img src="https://www.neonmag.fr/content/uploads/2019/04/color-spotify-logo.jpg" alt="Spotify" height="145" width="214">
    <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Osu_new_logo.png" alt="Osu" height="145" width="145">
</p>
Or more simply, a GIF of the app functionning
![](screenshot.gif)
--->

## :construction_worker: Building and launching
For instance, on the **node n°5**
```bash
$ npm install
$ nohup node ~/leader-election/leader.js 5 >> ~/electionlog_5 2>&1 &
```

## :rocket: Deploy
Deployment consists of addig a cron job on every node. This cron job will periodically launch a new **leader.js**<br>
On the **node n°5** for instance, the shell command for adding this cron job would be
<!--
```bash
$ (crontab -l 2>/dev/null; echo '* * * * * (node ~/leader-election/leader.js 5 >> ~/electionlog_5 2>&1 &) && (echo "CRON ALIVE `uname -n` `date ''+\%d-\%h \%H:\%M:\%S\''`" >> ~/electionlog_5 2>&1)') | crontab -
```
-->
Hence, deployment from a remote Powershell terminal looks like this:
```ps1
> 1..16 | %{ ssh tc$_ "crontab -l"; echo "tc$_ => $?" }                                                         # list crontabs
> 1..16 | %{ ssh tc$_ "crontab -r"; echo "tc$_ => $?" }                                                         # empty crontabs
> 1..16 | %{ ssh tc$_ "ps -eo 'pid,cmd' | grep -E '^.{5} node'" }                                               # print running jobs
> 1..16 | %{ ssh tc$_ "ps -eo 'pid' | grep -E '^.{5} node'"} > jobs.log                                         # get running jobs
> 1..16 | %{ ssh tc$_ "kill $((cat .\jobs.log) -join " ")" } ; rm  jobs.log                                     # kill running jobs
> 1..1  | %{ ssh tc$_ "cat electionlog_$_"; echo "tc$_ => $?" }                                                 # print log files
> 1..16 | %{ ssh tc$_ "cat electionlog_$_ | grep 'leader is'" }                                                 # get leader
> 1..1  | %{ ssh tc$_ "ls -l"; echo "tc$_ => $?" }                                                              # list files in ~
> 1..1  | %{ ssh tc$_ ". ~/.profile; ssh-add ~/.ssh/github_from_tc; cd ~/leader-election; git pull; npm i" }    # build
> 1..16 | %{ ssh tc$_ ". ~/.profile; ssh-add ~/.ssh/path_to_key" }                                              # add a ssh key
> 1..16 | %{ ssh tc$_ ". ~/.profile; ssh-add -l" }                                                              # list ssh keys
> # add a cron job and remove all other cron jobs
> 1..16 | %{ ssh tc$_ "echo '* * * * * (node ~/leader-election/leader.js $_ >> ~/electionlog_$_ 2>&1 &) && (echo ""CRON ALIVE ``uname -n`` ``date '\''+\%d-\%h \%H:\%M:\%S'\''``"" >> ~/electionlog_$_ 2>&1)' | crontab -" ; echo "tc$_ => $?"}
> # add a cron job and and keeping other cron jobs
> 1..16 | %{ ssh tc$_ "(crontab -l 2>/dev/null; echo '* * * * * (node ~/leader-election/leader.js $_ >> ~/electionlog_$_ 2>&1 &) && (echo ""CRON ALIVE ``uname -n`` ``date '\''+\%d-\%h \%H:\%M:\%S'\''``"" >> ~/electionlog_$_ 2>&1)') | crontab -" ; echo "tc$_ => $?"}
```

## :books: Sources
This project is sampled from :
- [npm got](https://www.npmjs.com/package/got)

##
#### [Gabriel FORIEN](https://github.com/gforien)
![](https://upload.wikimedia.org/wikipedia/commons/b/b9/Logo_INSA_Lyon_%282014%29.svg)
