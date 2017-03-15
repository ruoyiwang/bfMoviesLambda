'use strict';

console.log('Loading function');

var http = require('http');

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

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
            var title = encodeURI(event.queryStringParameters.title);

            var httpCallBack = function(response) {
                var str = '';

                //another chunk of data has been recieved, so append it to `str`
                response.on('data', function (chunk) {
                    str += chunk;
                });

                //the whole response has been recieved, so we just print it out here
                response.on('end', function () {
                    console.log(str);
                    var result = JSON.parse(str);
                    done(null, result.Search);
                });
            }

            http.get('http://www.omdbapi.com/?s='+title, httpCallBack).end();

            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
