/**
 * Caption Writer Application
 * 
 * Author: Chadd Frasier
 * Date Started: 05/31/19
 * Version: 2.2.1
 * Last Modified: 06/10/19
 * Description: 
 *      This is the driver for the Caption Writer server 
 * 
 * TODO: unit test all componets
 */

// require dependencies
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const jimp = require('jimp');
const exec = require('child_process').exec;
const fs = require('fs');
const alert = require('alert-node');

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
    let code = request.query.alertCode;
    console.log(code);
    // clean print.prt files from isis3
    exec('rm print.prt');

    // render the index page
    if(code == undefined){
        response.render("index.ejs", {alertCode: 0});
    }else{
        response.render("index.ejs", {alertCode: code});
    }
    
});

// post action to caption writing page
app.post('/upload', function(request, response){
    console.log(request.path);

    // prepare the variables for response to user
    var templateText = '';
    var cubeFileData= '';

    // cube file section
    try{
        if(request.files == null ){
            // if no cube file uploaded
            console.log('User Error Upload a Cube File to begin');
            // redirect the user
            //alert('Upload a cube file (.cub)');

            response.redirect('/?alertCode=3');
            response.end();
        }
        // cube (.cub) file regexp
        else if(/^.*\.(cub|CUB)$/gm.test(request.files.uploadFile.name)){
            // get the file from request
            let cubeFile = request.files.uploadFile;

            // save the cube upload to upload folder
            cubeFile.mv('./uploads/' + cubeFile.name, function(err){
                if(err){
                    // send error if uploaded folder doesn't exist
                    console.log('This Error could have been because "/uploads" folder does not exist');
                    return response.status(500).send(err);
                }
            });
            // log run real command
            console.log('running ISIS commands on upload');

            // make command and check error status
            if(util.makeSystemCalls(cubeFile.name,
                 path.join('uploads',cubeFile.name),
                    path.join('pvl','return.pvl'),
                    'images') !== 0){
                        console.log('makeSystemCalls ended with a non-zero status');
                    }
        }
        else{
            // wrong file type uploaded
            console.log('wrong file type uploaded for cube section');
            console.log('file name is: ' + request.files.uploadFile.name);
            response.redirect('/?alertCode=1');
            response.end();
            }
    }catch(err){
        console.log('Fatal Error Occured');
        console.log(err);
        response.redirect('/?alertCode=1');
        response.end();
    }

    // template file section
    try{
        // reexp for verifing tpl file
        if(/^.*\.(tpl)$/gm.test(request.files.templateFile.name)){
            // get file object
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
            response.redirect('/?alertCode=2');
            response.end();
        }
    }catch(err){
        // tpl is null
        console.log('Default Template Being Used');
        templateText = fs.readFileSync('tpl/default.tpl', 'utf-8');
        console.log('default.tpl says: '+ templateText);

    }

    // set output and render
    // TODO: DICTIONARY DATA
    // TODO: CSVSTRING Data
   
    response.render('writer.ejs',
        { templateText: templateText, 
        dictionaryString: 'dict strring',
        csvString: 'hello,world\n'} ); 
    
});

// image editing page
app.post('/showImage', function(request, response){
    console.log(request.path);

    // render image
    response.render("imagePage.ejs");
});

// listen on 8080 or open port
const PORT = 8080 || process.env.PORT;
app.listen(PORT);

// tell console status
console.log("Server is running and listen to port " + PORT);
