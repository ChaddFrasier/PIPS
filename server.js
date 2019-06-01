const express = require('express');
const path = require('path');
const jimp = require('jimp');


var app = express();
// allow static files to be seen and served from any directory

app.use("/css" , express.static("css"));
app.use("/images" , express.static("images"));

app.set('view engine', 'ejs');

app.get('/', function(request, response){
    console.log(request.path);
    response.render("index.ejs");
});

app.post('/upload', function(request, response){
    console.log(request.path);
    response.render("writer.ejs");
});


// listen on 3030
const PORT = 8080 || process.env.PORT;
app.listen(PORT);
// tell console
console.log("Server is running and listen to port " + PORT);
