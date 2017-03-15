'use strict';

var http = require('http');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
  host: 'search-bonfiremovies-fqthmtp6w4gfeypx2pm562oqxq.us-east-1.es.amazonaws.com',
  log: 'trace'
});
var esIndex = "usermovies";
var esType = "movies";
'use strict';

console.log('Loading function');

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Received context:', JSON.stringify(context, null, 2));

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*'
        },
    });

    var imdbID = encodeURI(event.imdbID);

    // add to ElasticSearch
    var addToES = function(movieResult) {
        movieResult.users = [];
        client.create({
            index: esIndex,
            type: esType,
            id: imdbID,
            body: movieResult
        }, done);
    }

    // call back to handle data from omdb then hit ES
    var httpCallBack = function(response) {
        var str = '';
        response.on('data', function (chunk) {
            str += chunk;
        });
        response.on('end', function () {
            console.log(str);
            var result = JSON.parse(str);
            addToES(result);
        });
    }

    // hit omdb
    http.get('http://www.omdbapi.com/?i='+imdbID, httpCallBack).end();

};
