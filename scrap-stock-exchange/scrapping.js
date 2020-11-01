/*************************
 *        Imports        *
 *************************/
const request = require('request-promise');
const $ = require('cheerio');
const HtmlTableToJson = require('html-table-to-json');
const sleep = require('sleep');
const https = require('https')


/**********************
 *        Vars        *
 **********************/
const bsUrl1 = 'https://www.boursorama.com/bourse/actions/cotations/?quotation_az_filter%5Bmarket%5D=1rPCAC&quotation_az_filter%5Bletter%5D=&quotation_az_filter%5Bfilter%5D=&sortColumn=last&orderAsc=0';
const bsUrl2 = 'https://www.boursorama.com/bourse/actions/cotations/page-2?quotation_az_filter%5Bmarket%5D=1rPCAC&quotation_az_filter%5Bletter%5D=&quotation_az_filter%5Bfilter%5D=&sortColumn=last&orderAsc=0';


/***************************
 *        Scrapping        *
 ***************************/

async function getData(url) {
  return new Promise(resolve => {
    request(url)
    .then(function(html){
      var table = "<table>"+$('table', html).html()+"</table>";
      const jsonTables = HtmlTableToJson.parse(table);
      // console.log(jsonTables.results);
      resolve(jsonTables.results);
    })
    // .catch(function(err){
    //   console.error("ERROR");
    //   return null
    // });
  });
}

async function main() {
  // while(true) {
    var result1 = await getData(bsUrl1);
    var result2 = await getData(bsUrl2);
    var result = result1[0].concat(result2[0])
    console.log(result);

    if(result.length != 40) {
      throw new Error("Array.length != 40");
    }

    var data = JSON.stringify(result);

    request.post({
      headers: {'content-type' : 'application/json'},
      url:     'http://localhost:9200',
      body:    data
    }, function(error, response, body){
      console.log(body);
    });

    sleep.sleep(1);
  // }
}

main();