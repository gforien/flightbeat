package beater

import (
	"fmt"
	"os"
	"time"
	"errors"
    "net/http"
    "encoding/json"
    "io/ioutil"
	"github.com/elastic/beats/v7/libbeat/beat"
	"github.com/elastic/beats/v7/libbeat/common"
	"github.com/elastic/beats/v7/libbeat/logp"
	"github.com/gforien/flightbeat/config"
)

type flightbeat struct {
	done   chan struct{}
	config config.Config
	client beat.Client
}

type skRoute struct {
	Orig struct {
		Rank       int    `json:"rank"`
		Name       string `json:"name"`
		Iata       string `json:"iata"`
		City       string `json:"city"`
		Country    string `json:"country"`
		Passengers int    `json:"passengers"`
		Geo        struct {
			Lat    float32 `json:"lat"`
			Lon    float32 `json:"lon"`
		} `json:"geo"`
	} `json:"orig"`
	Dest struct {
		Rank       int    `json:"rank"`
		Name       string `json:"name"`
		Iata       string `json:"iata"`
		City       string `json:"city"`
		Country    string `json:"country"`
		Passengers int    `json:"passengers"`
		Geo        struct {
			Lat    float32 `json:"lat"`
			Lon    float32 `json:"lon"`
		} `json:"geo"`
	} `json:"dest"`
	Carrier string
	Direct bool
	MinPrice int
}

type skResponse struct {
	Quotes []struct {
		QuoteID     int  `json:"QuoteId"`
		MinPrice    int  `json:"MinPrice"`
		Direct      bool `json:"Direct"`
		OutboundLeg struct {
			OriginID      int    `json:"OriginId"`
			DestinationID int    `json:"DestinationId"`
			DepartureDate string `json:"DepartureDate"`
		} `json:"OutboundLeg"`
		QuoteDateTime string `json:"QuoteDateTime"`
	} `json:"Quotes"`
	Carriers []struct {
		CarrierID int    `json:"CarrierId"`
		Name      string `json:"Name"`
	} `json:"Carriers"`
	Places []struct {
		Name           string `json:"Name"`
		Type           string `json:"Type"`
		PlaceID        int    `json:"PlaceId"`
		IataCode       string `json:"IataCode"`
		SkyscannerCode string `json:"SkyscannerCode"`
		CityName       string `json:"CityName"`
		CityID         string `json:"CityId"`
		CountryName    string `json:"CountryName"`
	} `json:"Places"`
	Currencies []struct {
		Code                        string `json:"Code"`
		Symbol                      string `json:"Symbol"`
		ThousandsSeparator          string `json:"ThousandsSeparator"`
		DecimalSeparator            string `json:"DecimalSeparator"`
		SymbolOnLeft                bool   `json:"SymbolOnLeft"`
		SpaceBetweenAmountAndSymbol bool   `json:"SpaceBetweenAmountAndSymbol"`
		RoundingCoefficient         int    `json:"RoundingCoefficient"`
		DecimalDigits               int    `json:"DecimalDigits"`
	} `json:"Currencies"`
}

func (r skRoute) toString() string {
    bytes, err := json.Marshal(r)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(1)
    }
    return string(bytes)
}

func getRoutes() []skRoute {
    // routes := make([]skRoute, 42000)
    routes := make([]skRoute, 41748)

	// read JSON file
    raw, err := ioutil.ReadFile("./skyscanner_routes.json")
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(1)
    }

    err = json.Unmarshal(raw, &routes)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(1)
    }
    return routes
}

// Run starts flightbeat.
// logp.Info("flightbeat is running! Hit CTRL-C to stop it.")
func (bt *flightbeat) Run(b *beat.Beat) error {


	var err error
	bt.client, err = b.Publisher.Connect()
	if err != nil {
		return err
	}

	ticker := time.NewTicker(bt.config.Period)
	routes := getRoutes()
	counter := 0


	for {
		fmt.Println("Query "+routes[counter].Orig.Iata+" => "+routes[counter].Dest.Iata)

		select {
		case <-bt.done:
			return nil
		case <-ticker.C:
		}

		quote, err := request(routes, counter)
	    if err != nil {
	        fmt.Println(err.Error())
	        routes = remove(routes, counter)
			fmt.Println("len(routes) = ", len(routes))

	    } else {
			event := beat.Event{
				Timestamp: time.Now(),
				Fields: common.MapStr{
					"Orig": quote.Orig,
					"Dest": quote.Dest,
					"Carrier": quote.Carrier,
					"Direct": quote.Direct,
					"MinPrice": quote.MinPrice,
				}}

			bt.client.Publish(event)
			logp.Info("Event sent")
			counter = (counter+1)%41748
	    }
	}

	return nil
}

func remove(s []skRoute, i int) []skRoute {
    s[i] = s[len(s)-1]
    return s[:len(s)-1]
}

// Stop stops flightbeat.
func (bt *flightbeat) Stop() {
	bt.client.Close()
	close(bt.done)
}

func request(routes []skRoute, index int) (skRoute, error) {

	origin := routes[index].Orig.Iata
	dest := routes[index].Dest.Iata
	now:= time.Now()
	now.AddDate(0,0,14)
	outboundpartialdate := fmt.Sprintf("%d-%d-%[2]d", now.Year(), now.Month(), now.Day())

	url := fmt.Sprintf("https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/US/USD/en-US/%s/%s/%s", origin, dest, outboundpartialdate)
	req, err := http.NewRequest("GET", url, nil)
	if (err != nil) { fmt.Println(err.Error()) }

	req.Header.Add("x-rapidapi-host", "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com")
	if (index%2 == 0) {
		req.Header.Add("x-rapidapi-key", os.Getenv("FLIGHT_API_KEY"))
	} else {
		req.Header.Add("x-rapidapi-key", os.Getenv("FLIGHT_API_KEY_2"))
	}

	res, err := http.DefaultClient.Do(req)
	if (err != nil) { fmt.Println(err.Error()) }

	defer res.Body.Close()
	body, err := ioutil.ReadAll(res.Body)
	if (err != nil) { fmt.Println(err.Error()) }

	data := skResponse{}
    err = json.Unmarshal(body, &data)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(1)
    }

	if len(data.Quotes) > 0 {

		result := skRoute{
			Orig: routes[index].Orig,
			Dest: routes[index].Dest,
			Carrier: data.Carriers[0].Name,
			Direct: data.Quotes[0].Direct,
			MinPrice: data.Quotes[0].MinPrice}
		return result, nil
	} else if (res.StatusCode != 200) {
		return skRoute{}, errors.New("Error (status "+string(res.Status)+")")
	} else {
		return skRoute{}, errors.New("Returned empty (status "+string(res.Status)+")")
	}
}


// New creates an instance of flightbeat.
func New(b *beat.Beat, cfg *common.Config) (beat.Beater, error) {
	c := config.DefaultConfig
	if err := cfg.Unpack(&c); err != nil {
		return nil, fmt.Errorf("Error reading config file: %v", err)
	}

	bt := &flightbeat{
		done:   make(chan struct{}),
		config: c,
	}
	return bt, nil
}