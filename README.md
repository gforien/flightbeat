# flightbeat :airplane::zap:

![](https://img.shields.io/badge/5TC-ELK-blueviolet)
![](https://img.shields.io/badge/license-Apache-grey)

#### Beat written in Go to retrieve flight prices from Skyscanner API and insert them into an elasticsearch cluster

## :construction_worker: Build and run the beat
```bash
$ mage build
$ ./flightbeat -e -d "*"
# input : flightbeat.yml (default)
# output: console (default)
```

## :rocket: Deploy
The beat has to always be active on 1 node (out of 16).
A periodic NodeJS job, **leader.js** makes sure that there is always a leader designated to run the beat.
*(and because a NodeJS job doesn't handle hard reboot, a cron job makes sure every hour that **leader.js** is up and running).*
In case of failure of the leader, the nodes perform a leader election to elect a new leader who will run the beat.


## :wrench: Generate your Beat from elastic/beats with mage (oct. 2020)
1. install go
2. `go get github.com/elastic/beats`
3. `go get github.com/magefile/mage`
4. `cd elastic/beats; mage GenerateCustomBeat` (fill everything explicitly, there is no default value)
5. `cd gforien/custombeat`
6. disable W10 App execution alias  + copy python.exe to go/bin/python3.exe  + disable W10 real-time protection (re-enable after)
7. `make setup; make`


## :books: Sources
This project is sampled from :
- [Beats developer guide](https://www.elastic.co/guide/en/beats/devguide/current/new-beat.html)
- [Go by example](https://gobyexample.com/)
- [HTTP requests in Go](https://medium.com/rungo/making-external-http-requests-in-go-eb4c015f8839)
- [Biggest airports in the world](https://gettocenter.com/airports/top-100-airports-in-world/1000)
- [Flight routes database](https://www.kaggle.com/open-flights/flight-route-database)
##
#### [Gabriel FORIEN](https://github.com/gforien)
![](https://upload.wikimedia.org/wikipedia/commons/b/b9/Logo_INSA_Lyon_%282014%29.svg)



<!-- # {Beat}

Welcome to {Beat}.

Ensure that this folder is at the following location:
`${GOPATH}/src/github.com/gforien/flightbeat`

## Getting Started with {Beat}

### Requirements

* [Golang](https://golang.org/dl/) 1.7

### Init Project
To get running with {Beat} and also install the
dependencies, run the following command:

```
make setup
```

It will create a clean git history for each major step. Note that you can always rewrite the history if you wish before pushing your changes.

To push {Beat} in the git repository, run the following commands:

```
git remote set-url origin https://github.com/gforien/flightbeat
git push origin master
```

For further development, check out the [beat developer guide](https://www.elastic.co/guide/en/beats/libbeat/current/new-beat.html).

### Build

To build the binary for {Beat} run the command below. This will generate a binary
in the same directory with the name flightbeat.

```
make
```


### Run

To run {Beat} with debugging output enabled, run:

```
./flightbeat -c flightbeat.yml -e -d "*"
```


### Test

To test {Beat}, run the following command:

```
make testsuite
```

alternatively:
```
make unit-tests
make system-tests
make integration-tests
make coverage-report
```

The test coverage is reported in the folder `./build/coverage/`

### Update

Each beat has a template for the mapping in elasticsearch and a documentation for the fields
which is automatically generated based on `fields.yml` by running the following command.

```
make update
```


### Cleanup

To clean  {Beat} source code, run the following command:

```
make fmt
```

To clean up the build directory and generated artifacts, run:

```
make clean
```


### Clone

To clone {Beat} from the git repository, run the following commands:

```
mkdir -p ${GOPATH}/src/github.com/gforien/flightbeat
git clone https://github.com/gforien/flightbeat ${GOPATH}/src/github.com/gforien/flightbeat
```


For further development, check out the [beat developer guide](https://www.elastic.co/guide/en/beats/libbeat/current/new-beat.html).


## Packaging

The beat frameworks provides tools to crosscompile and package your beat for different platforms. This requires [docker](https://www.docker.com/) and vendoring as described above. To build packages of your beat, run the following command:

```
make release
```

This will fetch and create all images required for the build process. The whole process to finish can take several minutes.
 -->
