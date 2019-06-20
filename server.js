/**
 * Caption Writer Application
 * 
 * Author: Chadd Frasier
 * Date Started: 05/31/19
 * Version: 2.3.2
 * Last Modified: 06/13/19
 * Description: 
 *      This is the driver for the Caption Writer server 
 * 
 * TODO: unit test all componets
 * TODO: send data to webpage
 * TODO: get image functions working agian
 */

// require dependencies
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const jimp = require('jimp');
const exec = require('child_process').exec;
const fs = require('fs');
const cookieparser = require('cookie-parser');

// include custom utils 
const util = require('./util.js');

// start app env
var app = express();

// use express upload and cookie parser
app.use(fileUpload());
app.use(cookieparser());

// set OS flag
var isWindows = process.platform === 'win32';

// give app access to routes
app.use("/css" , express.static("css"));
app.use("/images" , express.static("images"));
app.use("/tpl" , express.static("tpl"));
app.use("/pvl " , express.static("pvl"));

// start view engine
app.set('view engine', 'ejs');


// Functions
/**
 * function to handle '/' requests
 */
app.get('/', function(request, response){
    console.log(request.path);
    // queryt for alert code
    let code = request.query.alertCode;
    
    // clean print.prt files from isis3
    if( !isWindows ){
        exec('rm print.prt');
    }else{
        exec('del "print.prt"');
    }
    

    // render the index page w/ proper code
    if(code == undefined){
        response.render("index.ejs", {alertCode: 0});
    }else{
        response.render("index.ejs", {alertCode: code});
    }
});
 
/**
 * function to handle '/tpl' requests
 */ 
app.get('/tpl',function(request, response){
    // read and send the data in the form of ejs file
    fs.readFile('./tpl/description.tpl', function read(err, data) {
        if (err) {
            throw err;
        }
        // render the data
        response.render('tpl.ejs', {tplData:data});
    });
});

/**
 * function to handle '/upload' requests
 */
app.post('/upload', function(request, response){
    console.log(request.path);

    // prepare the variables for response to user
    var templateText = '';
    var cubeFileData;
    var dicString = '';

    // clean up the return file
    exec('rm pvl/return.pvl');
    

    console.log('===========================================');
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
           
            let promises = []
            response.cookie('cubeFile', cubeFile.name, {expires: new Date(Date.now() + 900000), httpOnly: true});
            //console.log('cookie created for cube file');
            // make command and check error status

            promises.push(util.makeSystemCalls(cubeFile.name,
                path.join('uploads',cubeFile.name),
                   path.join('pvl','return.pvl'),
                   'images'));
              
            // this block will pass and run when all isis commands are finished
             Promise.all(promises).then(function(){
                console.log('server heard back from ISIS');
                promises = [];
                promises.push(util.readPvltoStruct(cubeFile.name));

                // this block will pass and run when all isis commands are finished
                Promise.all(promises).then(function(cubeData){
                    console.log('server got data: \n');
                    cubeFileData = JSON.parse(cubeData);
                    // console.log(cubeFileData);
                    for(key in cubeFileData){
                        dicString = String(dicString + key + ':'+ cubeFileData[key] +'\n');
                    }

                    //console.log(dicString);

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
                        //console.log('Default Template Being Used');
                        templateText = fs.readFileSync('tpl/default.tpl', 'utf-8');
                        //console.log('default.tpl says: '+ templateText);

                    }

                    //console.log('dictionary string: ' + dicString);
                    // set output and render
                    // TODO: CSVSTRING Data

                    // get the csvString for webpage
                    promises = []

                    promises.push(util.getCsv(dicString));

                    Promise.all(promises).then(function(csvData){
                        console.log('csv: ' + csvData); 
                         
                        // send response
                        response.render('writer.ejs',
                        { templateText: templateText, 
                        dictionaryString: dicString,
                        csvString: csvData }); 
                    });
                });
            });
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
});

    

    

/**
 * function to handle '/showImage' requests
 */
app.post('/showImage', function(request, response){
    //TODO: image page
    console.log(request.path);
    var cookieval = request.cookies['cubeFile'];
    var imagepath;

    if(cookieval != undefined){
        let image = util.getimagename(cookieval, 'png');
        imagepath = '../images/' + image;
    }else{
        imagepath = 'none';
    }

    // render image
    response.render("imagePage.ejs", {image:imagepath});
});

// listen on 8080 or open port
const PORT = 8080 || process.env.PORT;
app.listen(PORT);

// tell console status
console.log("Server is running and listen to port " + PORT);
