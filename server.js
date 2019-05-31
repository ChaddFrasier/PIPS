var express = require('express');
var path = require('path');
var jimp = require('jimp');

var app = express();
app.set('view engine', 'ejs');

app.get('/', function(request, response){
    response.send('<h1>HELLO WORLD</h1>');
});

// listen on 3030
const PORT = 8080 || process.env.PORT;
app.listen(PORT);
// tell console
console.log("Server is running and listen to port " + PORT);
