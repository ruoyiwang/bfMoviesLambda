'use strict';

var addMovieByIdUri = 'http://6lk6s51xv6.execute-api.us-east-1.amazonaws.com/prod/AddMovieById';

var elasticsearch = require('elasticsearch');
var http = require('http');
var aws = require('aws-sdk');
var lambda = new aws.Lambda({
  region: 'us-east-1' //change to your region
});

var client = new elasticsearch.Client({
  host: 'search-bonfiremovies-fqthmtp6w4gfeypx2pm562oqxq.us-east-1.es.amazonaws.com',
  log: 'trace'
});
var esIndex = "usermovies";
var esType = "movies";
// const dynamo = new AWS.DynamoDB.DocumentClient();

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

    // funtion to just add a user to the movie if the movie already exists
    var updateEntry = function(imdbID, uid) {
        // first search if the user already exists
        // doesn't really matter if repeating items are there
        client.search({
            index: esIndex,
            type: esType,
            body: {
                query: {
                    "bool": {
                        "must": [
                            { "match": { "_id":  imdbID }},
                            { "match": { "users": uid }}
                        ]
                    }
                }
            }
        }).then(function(resp){
            if (resp.hits.total > 0) {
                done(null, {"success":true});
            }
            else {
                console.log("adding user " + uid + " to " + imdbID);
                client.update({
                    index: esIndex,
                    type: esType,
                    id: imdbID,
                    body: {
                        "script": {
                            "lang": "painless",
                            "inline": "ctx._source.users.add(params.new_user)",
                            "params": {
                                "new_user": uid
                            }
                        }
                    }
                }, done);
            }
        }, function(err) {
            done(err)
        })
    };

    var uid = encodeURI(event.uid);
    var imdbID = encodeURI(event.imdbID);
    if (!uid || !imdbID) {
        done(new Error('missing uid or imdbID'));
    }

    // see if movie already exists
    client.get({
        index: esIndex,
        type: esType,
        id: imdbID
    }, function (error, response) {
        if (error) {
            // if not found
            console.log("ES error");
            console.log("found:" + JSON.parse(error.response).found);
            var found = (JSON.parse(error.response).found);

            if (!found) {
                // if doesn't pull from omdb
                console.log("movie doesn't exist " + imdbID);

                // post body for adding the mobie by id
                var newMovieReqObj = {
                    "imdbID": imdbID
                }
                var postBody = JSON.stringify(newMovieReqObj);

                lambda.invoke({
                    FunctionName: 'AddMovieById',
                    Payload: JSON.stringify(newMovieReqObj, null, 2) // pass params
                }, function(error, data) {
                    if (error) {
                        done(error);
                    }
                    if(data){
                        console.log("lamda call data", data);
                        updateEntry(imdbID, uid);
                    }
                });
            }
            else {
                done(error);
            }
        }
        else if (response) {
            // if movie exists we update
            console.log(response._source.users);
            var users = response._source.users;
            updateEntry(imdbID, uid);

        }
        else {
            done(new Error("unknown state"));
        }
    });
};
