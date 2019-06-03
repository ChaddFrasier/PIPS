/**
 * Caption Writer Application
 * 
 * Author: Chadd Frasier
 * Date: 5/31/19
 * Version: 2.1
 * Description: 
 *      This is the driver for the Caption Writer server 
 */

// require dependencies
const express = require('express');
const path = require('path');
const jimp = require('jimp');

// start app env
var app = express();

// give app access to routes
app.use("/css" , express.static("css"));
app.use("/images" , express.static("images"));

// start view engine
app.set('view engine', 'ejs');

// index page
app.get('/', function(request, response){
    console.log(request.path);
    response.render("index.ejs");
});

// caption writing page
app.post('/upload', function(request, response){
    console.log(request.path);
    response.render("writer.ejs");
});

// image editing page
app.post('/showImage', function(request, response){
    console.log(request.path);
    response.render("imagePage.ejs");
});

// listen on 3030
const PORT = 8080 || process.env.PORT;
app.listen(PORT);

// tell console status
console.log("Server is running and listen to port " + PORT);
