(async () => {

  const axios      = require('axios');
  const fs         = require('fs');
  let iataCodes    = require('./_WIP_iata_codes.json');
  let uniquePlaces = require('./_skyscanner_6000_places.json')

  console.log(`Read ${iataCodes.length} IATA codes from ./_WIP_iata_codes.json`);

  while(true) {
    let ele = iataCodes.shift();
    console.log(`Query ${ele}`);

    try {
      response = await axios({
        "method":"GET",
        "url":"https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/autosuggest/v1.0/UK/GBP/en-GB/",
        "headers":{
        "content-type":"application/octet-stream",
        "x-rapidapi-host":"skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
        "x-rapidapi-key":process.env.FLIGHT_API_KEY,
        "useQueryString":true
        },"params":{
        "query":ele
        }
      });

      for (let place of response.data.Places) {
        if(place.PlaceId == ele+"-sky") console.log(`${ele} was found`);
        uniquePlaces.push(place.PlaceId);
      }

      uniquePlaces = [...new Set(uniquePlaces)];
      iataCodes = iataCodes.filter(v => !uniquePlaces.includes(v+"-sky"));

      fs.writeFileSync('_WIP_iata_codes.json', JSON.stringify(iataCodes));
      console.log(`Wrote ${iataCodes.length} IATA codes to ./_WIP_iata_codes.json`);

      fs.writeFileSync('_skyscanner_6000_places.json', JSON.stringify(uniquePlaces));
      console.log(`Wrote ${uniquePlaces.length} IATA codes to ./_skyscanner_6000_places.json`);
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