#------------------------------------------------------[ Cluster.ps1 ]-----------------------------------------------------

$PORT = 5005
$argsString = $Args -join " "
$helpString="usage: ./Cluster.ps1 ACTION SUBJECT

 where ACTION = list              and SUBJECT = nodes
                remove                          leaders
                start/kill                      crons
                build                           jobs
                deploy                          logs
                                                errors
                                                last commit"

switch($argsString) {
    # nodes
    "list nodes"            { &{ 1..9 | %{ echo "tc$_ => $((curl -TimeoutSec 1 -Method GET -Uri http://tc405-112-0$_.insa-lyon.fr:$PORT/status).StatusDescription)"}; 10..16 | %{ echo "tc$_ => $((curl -TimeoutSec 1 -Method GET -Uri http://tc405-112-$_.insa-lyon.fr:$PORT/status).StatusDescription)"}}}
    "list leaders"          { &{ 1..9 | %{ $a = ''; $a = (curl -Method GET -Uri http://tc405-112-0$_.insa-lyon.fr:$PORT/leader).RawContent; $a = $a.substring($a.indexof("Express") + 11); echo "tc$_ => leader is $a"}; 10..16 | %{ $a = ''; $a = (curl -Method GET -Uri http://tc405-112-$_.insa-lyon.fr:$PORT/leader).RawContent; $a = $a.substring($a.indexof("Express") + 11); echo "tc$_ => leader is $a"}}}

    # crontab
    "list crons"            { &{ 1..16 | %{ echo tc$_; ssh tc$_ "crontab -l"}}}
    "remove crons"          { &{ 1..16 | %{ echo tc$_; ssh tc$_ "crontab -r"}}}

    # active jobs
    "list jobs"             { &{ 1..16 | %{ ssh tc$_ "ps -eo 'pid,cmd' | grep -E '^.{5} node'" }}}
    "kill jobs"             { &{ echo "Getting jobs..."; 1..16 | %{ ssh tc$_ "ps -eo 'pid,cmd' | grep -E '^.{5} node' |  grep -oE '^.{5}'" } > jobs.log; echo "Found jobs"; cat jobs.log; echo "Killing jobs..."; 1..16 | %{ ssh tc$_ "kill $((cat .\jobs.log) -join `" `") 2>/dev/null"; echo "$_ => $?" } ; rm  jobs.log }}
    "start jobs"            { &{ 1..16 | %{ ssh tc$_ "cd ~/leader-election; node leader.js $_ >> ~/electionlog_$_ 2>&1 &"; echo "tc$_ => $?" }}}

    # log files
    "list logs"             { &{ 1..1 | %{ ssh tc$_ "ls electionlog_*" }}}
    "list errors"           { &{ 1..1 | %{ ssh tc$_ "cat electionlog_* | grep ERROR" }}}
    "remove logs"           { &{ 1..16 | %{ ssh tc1 "echo '' > electionlog_$_"; echo "tc$_ => $?" }}}

    # build and deploy
    "list last commit"      { &{ 1..1  | %{ ssh tc$_ "cd ~/leader-election; git log -n 1" }}}
    "build"                 { &{ 1..1  | %{ ssh tc$_ ". ~/.profile; ssh-add ~/.ssh/github_from_tc; cd ~/leader-election; git pull; npm i" }}}
    # (!) this removes all pre-existing cron jobs
    "deploy"                { &{ 1..16 | %{ ssh tc$_ "echo '* * * * * (node ~/leader-election/leader.js $_ >> ~/electionlog_$_ 2>&1 &) && (echo ""CRON ALIVE ``uname -n`` ``date '\''+\%d-\%h \%H:\%M:\%S'\''``"" >> ~/electionlog_$_ 2>&1)' | crontab -" ; echo "tc$_ => $?"}}}

    default                 { echo $helpString }
}
#------------------------------------------------------[     END     ]-----------------------------------------------------