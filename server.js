/**
 * Caption Writer Application
 * 
 * Author: Chadd Frasier
 * Date Started: 05/31/19
 * Version: 2.2
 * Last Modified: 06/04/19
 * Description: 
 *      This is the driver for the Caption Writer server 
 */

// require dependencies
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const jimp = require('jimp');
const fs = require('fs');

// include custom utils 
const util = require('./util');

// start app env
var app = express();

// use express upload
app.use(fileUpload());


// give app access to routes
app.use("/css" , express.static("css"));
app.use("/images" , express.static("images"));
app.use("/tpl" , express.static("tpl"));

// start view engine
app.set('view engine', 'ejs');

// index page
app.get('/', function(request, response){
    console.log(request.path);

    response.render("index.ejs");
});

// post action to caption writing page
app.post('/upload', function(request, response){
    console.log(request.path);

    var templateText = '';
    var cubeFileData= '';

    // cube file section
    try{
        if(request.files == null ){
            console.log('User Error Upload a Cube File to begin');
            response.redirect('/');
            response.end();
        }
        else if(/^.*\.(cub|CUB)$/gm.test(request.files.uploadFile.name)){
            // grab the name of the cube file slot
            console.log(request.files.uploadFile.name + 'is the cube');
            
            let cubeFile = request.files.uploadFile;

            // save the cube upload to upload folder
            cubeFile.mv('./uploads/' + cubeFile.name, function(err){
                if(err){
                    return response.status(500).send(err);
                }
            });


            // run real command
            console.log('running ISIS commands on upload');

            console.log(util.makeSystemCalls(cubeFile.name,
                 path.join('uploads',cubeFile.name),
                    path.join('pvl','return.pvl'),
                    'images')
                    );
        }
        else{
            console.log('wrong file type uploaded for cube section');
            console.log('file name is: ' + request.files.uploadFile.name);
            response.redirect('/');
            response.end();
            }
    }catch(err){
        console.log('No Cube File uploaded');
        console.log(err);
        response.redirect('/');
        response.end();
    }

    // template file section
    try{
        // template file slot
        if(/^[A-Za-z0-9_]*.tpl$/.test(request.files.templateFile.name)){
            console.log(request.files.templateFile);
            console.log('template file passes');

            let tplFile = request.files.templateFile;

            // save to server
            tplFile.mv('./tpl/'+tplFile.name, function(err){
                if(err){
                    return response.status(500).send(err);
                }
            });
            // set output for template
            templateText = tplFile.data.toString();
        }
        else{
            console.log('Wrong file type for template');
            response.redirect('/');
            response.end();
        }
    }catch(err){
        // tpl is null
        console.log('Default Template Being Used');
        templateText = fs.readFileSync('tpl/default.tpl', 'utf-8');
        console.log('default.tpl says: '+ templateText);

    }

// do more stuff


    // set output and render
    // TODO: DICTIONARY DATA
    //      CSVSTRING Data
   
    response.render('writer.ejs',
        { templateText: templateText, 
        dictionaryString: 'dict strring',
        csvString: 'hello,world\n'} ); 
    
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
