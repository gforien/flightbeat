(async () => {

  // we start from _skyscanner_1000_places which :

  //     - are unique (checked by hand)                                     a.filter( (v, i, s) => {return (s.findIndex(e => {return (e.iata === v.iata)}) === i)}).length
  //     - are geolocated (added with _9000_coordinates)                    a = routes.map(e => { e.geo = locations.find(v => v.iata_code===e.iata).coordinates; return e})
  //     - exist in the skyscanner API (checked by hand)
  //

  // skyscanner_40K_routes do not necessarily exist, they only correspond to existing places
  
  const axios      = require('axios');
  const fs         = require('fs');
  let routes       = require('./_WIP_routes.json');
  let active_routes= require('./active_routes.json');

  console.log(`Read ${routes.length} routes from ./_WIP_routes.json`);

  while(true) {

    let ele = routes.shift();
    console.log(`Query ${ele.orig.iata} => ${ele.dest.iata}`);

    try {
        response = await axios({
          "method":"GET",
          "url":`https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/US/USD/en-US/${ele.orig.iata}/${ele.dest.iata}/2020-12-01`,
          "headers":{
            "content-type":"application/octet-stream",
            "x-rapidapi-host":"skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
            "x-rapidapi-key": process.env.FLIGHT_API_KEY,
            "useQueryString":true
          }
        });

        if(response.data.Quotes.length > 0) {
          console.log(`Found ${response.data.Quotes.length} routes`);
          active_routes.push(ele);
        }

      fs.writeFileSync('_WIP_routes.json', JSON.stringify(routes));
      console.log(`Wrote ${routes.length} routes to ./_WIP_routes.json`);

      active_routes = [...new Set(active_routes)];
      fs.writeFileSync('active_routes.json', JSON.stringify(active_routes, null, 2));
      console.log(`Wrote ${active_routes.length} routes to ./active_routes.json`);
    }
    catch (error) {
      console.error(error);
      process.exit(1);
    }

    await sleepSec(1);
  }


  async function sleepSec(timeout) {
    return new Promise(resolve => setTimeout(resolve, 1000*timeout));
  }

})();