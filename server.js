/**
 * @file server.js 
 * @alias server
 * 
 * @author Chadd Frasier
 * @version 2.3.2
 * @description This is the driver for the Caption Writer server.
 * 
 * Date Created: 05/31/19
 * Last Modified: 06/23/19
 *
 * @todo unit test all componets
 * 
 * @todo use jimp to super impose icons on the images using pixel tracking technique
 *      @see https://www.chestysoft.com/imagefile/javascript/get-coordinates.asp for details on pixel tracking
 * @todo parse data from webpage into tag format
 * @todo get images working again
 * @todo TODO: must implement the configuration file for Important Tags
 * @todo writer.ejs needs to exchange the data values properly
 * 
 * @requires ./util.js
 * 
 * Note: This server is only capable of running on a linux or mac.
 *  operating systems
 */

 /** READ ME BEFORE EDITING
  * @fileoverview 
  *         As of 06/23/19 the application has working responses with proper ejs templates for every page.
  *     The file upload works properly and the isis commands succeed when isis3 is running. Promises were used
  *     to keep the functions processing in the proper order everytime without exception and allows for exec calls to be remerged.
  *     Cookies are used to keep track of user file uploads and subsequent data responses. The user will recieve
  *     live notifications when files fail to upload and it will inform user of the issue that the server 
  *     is facing. Added another button to index.ejs that allows users to read about how to create TPL files.
  *     AllTags function works on the front end but the important tags are not implimented yet.
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


// HTTP Handling Functions
/**
 * GET '/' 
 * 
 * remove the print.prt if it exists and render the page with the proper code
 */
app.get('/', function(request, response){
    console.log(request.path);
    // query for alert code
    let code = request.query.alertCode;
    
    // TODO: i dont think windows can use the exec call
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
 * GET '/tpl'
 * 
 * Renders the basic page with the description file
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
 * POST '/upload'
 * 
 * allows file upload and data extraction to take place when upload button is activated
 */
app.post('/upload', function(request, response){
    console.log(request.path);

    // prepare the variables for response to user
    var templateText = '';
    var cubeFileData;

    // clean up the return file
    exec('rm pvl/return.pvl');
    console.log('=================== New Run ========================');
    // cube file section
    try{
        if(request.files == null ){
            // if no cube file uploaded
            console.log('User Error Upload a Cube File to begin');
            // redirect the user & alert they need a .cub
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
                    
                    fullString = JSON.stringify(cubeFileData);

                    let importantTagArr = util.configServer(fs.readFileSync(path.join(__dirname,'cfg', 'config1.cnf'), {encoding: 'utf-8'}));
                    //console.log(importantTagArr);

                    var impDataString = util.importantData(cubeFileData,importantTagArr);
                    console.log(impDataString);
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

                    // send response
                    response.render('writer.ejs',
                    { templateText: templateText, 
                    dictionaryString: impDataString,
                    csvString: fullString }); 
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
        response.redirect('/?alertCode=4');
        response.end();
    }
});


/**
 * POST '/showImage'
 * 
 * renders the image page withg needed data
 */
app.post('/showImage', function(request, response){
    //TODO: image page
    console.log(request.path);
    var cookieval = request.cookies['cubeFile'];
    var imagepath;

    if(cookieval != undefined){
        let image = util.getimagename(cookieval, 'png');
        imagepath = './images/' + image;
    }else{
        imagepath = 'none';
    }

    // render image
    response.render("imagePage.ejs", {image:imagepath});
});


/* activate the server */
// listen on 8080 or open port
const PORT = 8080 || process.env.PORT;
app.listen(PORT);

// tell console status
console.log("Server is running and listen to port " + PORT);
