package main

import (
	"os"

	"github.com/gforien/flightbeat/cmd"

	_ "github.com/gforien/flightbeat/include"
)

func main() {
	if err := cmd.RootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
