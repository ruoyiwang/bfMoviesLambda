'use strict';

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'search-bonfiremovies-fqthmtp6w4gfeypx2pm562oqxq.us-east-1.es.amazonaws.com',
  log: 'trace'
});

/**
 * Gets the list of imdb ids assocaited with a user id
 */
exports.handler = (event, context, callback) => {
    // console.log('Received event:', JSON.stringify(event, null, 2));

    // done handler
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*'
        },
    });

    switch (event.httpMethod) {
        case 'GET':

            // query to get everything
            var q = {
                match_all: {}
            };
            // if uid is provided, query the uid
            if (event.queryStringParameters && event.queryStringParameters.uid) {
                q = {
                    match: {
                        users: event.queryStringParameters.uid
                    }
                };
            }

            // conduct the search
            client.search({
                index: 'usermovies',
                type: 'movies',
                body: {
                  query: q
                },
                size: 500
            }).then(function (resp) {
                var hits = resp.hits.hits;
                var results = [];
                for (var i = 0; i < hits.length; i++) {
                    results.push(hits[i]._source);
                }
                done(null, results);
            }, function (err) {
                done(err, null);
            });

            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
