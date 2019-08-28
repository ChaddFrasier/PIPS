/**
 * @file server.js 
 * @alias server
 * @run node server 
 * 
 * @author Chadd Frasier 
 *      @link https://www.cefns.nau.edu/~cmf339/ChaddFrasier/
 * 
 * @version 2.7.0
 * @description This is the driver for the Caption Writer server by USGS.
 * 
 * @since 05/31/19
 * @updated 08/23/19
 *
 * 
 * @todo 8 log the isis returns to a file if the user wants that
 * @todo 9 have a POST '/pow' link that calculates data and creates an image based on preset defaults and a data file for input
 * @todo 10 '/pow will need to set the log flag in the user instance
 * 
 * 
 * 
 * @requires ./util.js {this needs to be in root of application because of ISIS Commands}
 * @requires ./js/cubeObj.js
 * 
 * Note: This server is only capable of running on a linux or mac operating systems due to ISIS3 
 */

 /** READ ME BEFORE EDITING
  * --------------------------------------------------------------------------------------------------------------------------
  * @summary  08/28/19
  * 
  *     Uploads can be in .cub or .tif and the server now has more user friendly acceptance of dimensions by auto 
  * generating the size of the other dimensions when not given 
  * 
  * Ex: if given a height OR a width and the other box is left blank, 
  *     the server calculated the other dimension preserving aspect ratio
  * 
  * Or the user can specify an exact output size of the figures (width AND height).
  * The user can now add icons with the proper roatation and invert any of the icons' color. Scalebars are working and 
  * will be disabled if its not possible to calculate. Icons are disabled when the data cannot be found.
  * Icons, Text, and Outline Boxes all can be scaled using the corners of the icon by clicking when indicated 
  * and dragging the mouse in the directions of the mouse pointer.
  * 
  *     The pencil tool now allows the user to hit the escape key to undo a misplaced point on the pencil tool.
  * The pencil works off of a two click system right now and this make be changed to a drag later if the users would
  * prefer that method instead. 
  * 
  *     Sizes of UI are more friendly toward smaller screens. Changes include tighter spaceing on the writer page,
  * and better button placements. The user no longer has to scroll down to move to the photo editing page. The UI 
  * on the writer page now has a filter tags function where the user can type a 3 or more character string into the filter bar 
  * and results that contain that string will be displayed in the tag section.
  *  
  * 
  *     Annotation and outline boxes have been added, the user can select a color for the text, outline
  * boxes, and pencil tool independent of one another. 
  * 
  *     Padding can be added to the image on one of the 4 sides, it adds pixels to the image 
  * not shrinks the image down and it will update the padding on any change of the value in the textbox. 
  * 
  *     A new id system has been created to allow users to keep a 23 character id for a month before losing it.
  * this helps testing and prevents users from having identical ids when the server restarts unexpectedly. 
  * 
  *     Exporting is working perfectly now and can be saved as either png,jpeg,jpg (at any size),
  * or svg (when the data is not too large). SVGs are in standard format and can be opened and edited 
  * with Gimp as long as the files are not too large to parse safely.
  * 
  * --------------------------------------------------------------------------------------------------------------------------
  * 
  * Last Notes for Coders
  * ---------------------
  * 
  *     Comment your code and include an 'author' tag for any functions you write to the server. 
  * Try your best to follow commenting paradigms which includes using param, return, and desc tags for your
  * functions on the server js files (not on the webpages).
  *  
  *     DO NOT remove functions if your version does not use them. Let the repository managers do that
  * during merging.(This is to prevent conflicts with any major branch changes.)
  * 
  *     Lastly, this server is built to simplify the figure creation process not to replace photo editing software so keep
  * that in mind when adding yor owm code.
  * 
  * 
*/

// require dependencies
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const jimp = require('jimp');
const exec = require('child_process').exec;
const fs = require('fs');
const Promise = require('bluebird');
const cookieparser = require('cookie-parser');
const {performance} = require('perf_hooks');


// include custom utility functions
const util = require('./util.js');
const Cube = require('./js/cubeObj.js');

// start app env
var app = express();
// global instance array for cube objects
var cubeArray = [];
var numUsers = 0;

// use express upload and cookie parser
app.use(fileUpload());
app.use(cookieparser());

app.set('etag', false);
app.disable('view cache');

// set OS flag
var isWindows = process.platform === 'win32';

// give app access to routes
app.use("/css" , express.static("css"));
app.use("/images" , express.static("images"));
app.use("/csv" , express.static("csv"));
app.use("/js" , express.static("js"));
app.use("/tpl" , express.static("tpl"));
app.use("/jimp", express.static("jimp"));
app.use("/pvl " , express.static("pvl"));

// start view engine
app.set('view engine', 'ejs');

// erase uneeded files before server startup
try{
    exec('rm ./images/*.pgw');
    exec('rm ./jimp/*');
    exec('rm ./uploads/*');
    exec('rm ./pvl/*.pvl');
    exec('rm ./csv/*.csv');
    exec('rm ./print.prt');
    
    // get the list of files in the images dir
    let fileArr = fs.readdirSync("./images");
    // loop throught then and delete the file if it matchest this regexp
    for(index in fileArr){
        // regexp uses negativelookbehind to ensure the image file is not one of the required file strings
        if(/^.*(?<!arrow|eye_symbol|north|pencil|pencilcursor|sun_symbol|usgsLogo)\.(png)$/gm.test(fileArr[index])){
            // remove the file
            fs.unlinkSync(path.join('images',fileArr[index]));
        }
    }
}
catch(err){
    console.log('file error occured: ' + err);
}

// read the config file to get only important tags for webpage
const importantTagArr = util.configServer(fs.readFileSync(
    path.join('.','cfg', 'config1.cnf'), {encoding: 'utf-8'}));


// HTTP Handling Functions
/**
 * GET '/' 
 * 
 * render the page with the proper code
 */
app.get('/', function(request, response){
    console.log(request.path);
    // query for alert code
    let code = request.query.alertCode;

    // set the http status for official server use
    switch(code){
        case "1":
            response.status(415);
            break;
        case "2":
            response.status(415);
            break;
        case "3":
            response.status(412);
            break;
        case "4":
            response.status(412);
            break;
        case "5":
            response.status(500);
            break;
        case "6":
            response.status(510);
            break;
        case "7":
            response.status(400);
            break;
        default:
            response.status(200);
                
    }  
    // render the index page w/ proper code 
    response.render("index.ejs", {alertCode: (code === undefined) ? 0 : code});
    
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
            // throw the error if needed
            throw err;
        }
        // render the data
        response.render('tpl.ejs', {tplData:data});
    });
});


/**
 * GET '/upload'
 * 
 * this occurs when a user types the '/upload'
 * matches the last cube instance and returns that data
 * 
 * USER MUST POST TO UPLOAD A NEW FILE
 */
app.get('/upload',function(request,response){
    console.log(request.path);

    var userid = request.cookies['userId'];

    if(userid === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');

    }else{
        //retrieve the last found file for the user if it is there
        // otherwise rensder index with an alert that the session timed out and they should upload again
        console.log('cookie found: its value is: ' + userid);

        var userObject = util.getObjectFromArray(userid, cubeArray);

        // if the user Obj is not an error code
        if(typeof(userObject) !== "number"){
        
            // send response w/ all variables
            response.render('writer.ejs',
                {   templateText: fs.readFileSync('tpl/default.tpl', 'utf-8'), 
                    dictionaryString: userObject.impData,
                    wholeData: userObject.data,
                    csvString: util.getCSV(userObject.data),
                    outputName: userObject.name.replace('.cub','_PIPS_Caption.txt')
                });
        }else{
            response.redirect("/?alertCode=4");
        }


    }
});

/**
 * POST '/upload'
 * 
 * allows file upload and data extraction to take place when upload button is activated
 */
app.post('/upload', async function(request, response){
    console.log(request.path);

    // prepare the variables for response to user
    var templateText = '';
    let isTiff = false;
    
    //============== for testing only =======================
    console.log('=================== New Upload ========================');
    //================================================

    // cube file section
    try{
        if(request.files === null ){
            // if no files uploaded
            console.log('User Error Upload a Cube File to begin');
            // redirect the user & alert they need a .cub
            response.redirect('/?alertCode=3');
            // end the response
            response.end();
        }
        // cube (.cub) file regexp
        else if(/^.*\.(cub|CUB|tif|TIF)$/gm.test(request.files.uploadFile.name)){
           
            // get the file from request
            var cubeFile = request.files.uploadFile;

            //  find user id if it exists
            var uid = request.cookies["userId"];
            
            // create promises array for syncronous behavior
            var promises = [];

            // set tiff flag
            if(cubeFile.name.indexOf('.tif') !== -1){
                isTiff = true;
            }else{
                isTiff = false;
            }

            // if no user id is found 
            if(uid === undefined){
                // create a random 23 character user id
                uid = util.createUserID(23);
                // set cookie for the given user id (expires in just over 1 month [2628100000 miliseconds]) (TEST SERVER USING SHORT EXPIRE TIMES)
                response.cookie('userId', uid, {expires: new Date(Date.now() + 2628100000), httpOnly: true});
            }

            // if the cubeArray is empty
            if(cubeArray.length === 0){
                // create new instance
                var cubeObj = new Cube('u-' + numUsers + cubeFile.name, uid);
                cubeObj.userNum = numUsers++;
            }else{
                // loop through the active cubes and search for the user instance
                for(i in cubeArray){
                    if(cubeArray[i].userId === uid){
                        // reset the user cubeName
                        cubeArray[i].name = 'u-' + cubeArray[i].userNum + cubeFile.name;
                        //save the users instance into the cubeObj
                        cubeObj = cubeArray[i];
                        break;
                    }
                }
                // User id is found but not in the currnt server instances
                // create a new instance for this user
                if(cubeObj === undefined){
                    console.log('Old User was found');
                    var cubeObj = new Cube('u-' + numUsers + cubeFile.name, uid);
                    cubeObj.userNum = numUsers++;
                }
                   
            }


            // save the cube upload to upload folder
            await cubeFile.mv('./uploads/' + cubeObj.name , function(err){
                // report error if it occurs
                if(err){
                    console.log('This Error could have been because "/uploads" folder does not exist');
                    return response.status(500).send(err);
                }
            });

            
            //convert tiff to cube
            if(isTiff){
                promises.push(util.tiffToCube('uploads/' + cubeObj.name));
            }else{
                console.log('cube file was uploaded');    
            }
            // if the desired width and height are both given set that to be the user dimensions 
            if(Number(request.body.desiredWidth) > 50 || Number(request.body.desiredHeight)> 50){

                
                if(Number(request.body.desiredHeight) === 0){
                    // set to negative so we know to calculate it with jimp later
                    cubeObj.userDim = [Number(request.body.desiredWidth),-1];
                }
                else if(Number(request.body.desiredWidth) === 0){
                    // set to negative so we know to calculate it with jimp later
                    cubeObj.userDim = [-1,Number(request.body.desiredHeight)];
                }
                else{
                    console.log("default");
                    cubeObj.userDim = [Number(request.body.desiredWidth),Number(request.body.desiredHeight)];
                }


                
            }else{
                // otherwise ignore and default
                cubeObj.userDim = [0,0];
            }
            
            // reset server tif val because conversion completed
            isTiff = false;

            // after conversion finished
            Promise.all(promises).then(function(cubeName){

                // if the return array legth is not 0 extract the new cubefile name
                if(cubeName.length > 0){
                    cubeObj.name = path.basename(cubeName[0]);
                }
                // reset the promises array
                promises = [];
                
                // make promise on the isis function calls
                promises.push(util.makeSystemCalls(cubeObj.name,
                    path.join('.','uploads',cubeObj.name),
                    path.join('.','pvl',cubeObj.name.replace('.cub','.pvl')),
                    'images'));
                
                
                // when isis is done read the pvl file
                Promise.all(promises).then(function(){
                    console.log('server heard back from ISIS, starting pvl data extraction');
                    //reset promises array
                    promises = [];

                    // make new promise on the data extraction functions
                    promises.push(util.readPvltoStruct(cubeObj.name));

                    // when the readPvltoStructf function resolves create data instance
                    Promise.all(promises).then(function(cubeData){
                    
                        console.log("PVL Extraction Finished");
                        // add the cube instance to the cube array if it does not already exist
                        cubeArray = util.addCubeToArray(cubeObj,cubeArray);
                    
                        // save data to object using setter in class
                        cubeObj.data = JSON.parse(cubeData);
                        
                        // obtain the data for the important tags
                        var impDataString = util.importantData(cubeObj.data, importantTagArr);

                        // save the important data values to object using setter
                        cubeObj.impData = JSON.parse(impDataString);
                        

                        // template file section
                        try{
                            // regexp for verifying tpl file
                            if(/^.*\.(tpl)$/gm.test(request.files.templateFile.name)){
                                // get file object
                                let tplFile = request.files.templateFile;

                                // save to server
                                tplFile.mv('./tpl/'+tplFile.name, function(err){
                                    // report any errors
                                    if(err){
                                        return response.status(500).send(err);
                                    }
                                });
                                // set output for template
                                templateText = tplFile.data.toString();
                            }
                            else{
                                console.log('Wrong file type for template');
                                // send the alert code and redirect
                                response.redirect('/?alertCode=2');
                                // end response
                                response.end();
                            }
                        }catch(err){
                            // tpl is null set default
                            templateText = fs.readFileSync('tpl/default.tpl', 'utf-8');
                        }

                        // get the csv string
                        let csv = util.getCSV(cubeObj.data);

                        // get name of csv and write it to the csv folder
                        let csvFilename = cubeObj.name.replace('.cub','.csv');

                        // get name of possible output file
                        let txtFilename = cubeObj.name.replace('.cub','_PIPS_Caption.txt');

                        // write the csv data to the file
                        fs.writeFileSync(path.join('csv',csvFilename),csv,'utf-8');

                        // send response w/ all variables
                        response.render('writer.ejs',
                            { templateText: templateText, 
                            dictionaryString: impDataString,
                            wholeData: cubeObj.data,
                            csvString: csv,
                            outputName: txtFilename}); 

                    }).catch(function(err){
                        // catch any promise error
                        console.log('Promise Error Occured: ' + err);
                        response.write('<html>PROGRAMMING SYNC ERROR</html>');
                        response.end();
                    });
                }).catch(function(){
                    // alert 6 which happens when isis failed to create an image form the cube
                    response.redirect('/?alertCode=6');
                    // end response
                    response.end();
                });          
            }).catch(function(err){
                console.log(err);
                // alert 5 which happens when isis fails to convert a tif
                response.redirect('/?alertCode=5');
                // end response
                response.end();

            });
        }
        else{
            // wrong file type uploaded
            console.log('wrong file type uploaded for cube section');
            console.log('file name is: ' + request.files.uploadFile.name);
            // redirect with alert code
            response.redirect('/?alertCode=1');
            // end response
            response.end();
            }
    }catch(err){
        console.log('FATAL ERROR ON SERVER UPLOAD: ');
        console.log(err);
        // alert 5 which should never happen in a successful run
        response.redirect('/?alertCode=5');
        // end response
        response.end();
    }
});



/**
 * POST '/csv'
 * 
 *  this post function is only for matching the csv file with the users cookie and send it for download  
 */
app.post('/csv', function(request,response){
    // send download file

    let cubeObj = util.getObjectFromArray(request.cookies["userId"],cubeArray);

    // if the user object is found
    if(typeof(cubeObj) === "object"){
        // send the image associated with user
        response.download(path.join('csv',cubeObj.name.replace('.cub','.csv')),function(err){
            if(err){
                console.log('file was not sent successfully');
            }else{
                // file sent
                response.status(200);
                response.end();
            }
        });
    }else{
        response.redirect("/?alertCode=4");
    }
    
});

/**
 * GET '/csv'
 * 
 * sends the csv file of the users last upload if it is found
 */
app.get('/csv', function(request, response){
    console.log(request.path);

    let userId = request.cookies['userId'];

    if(userId === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');

    }else{
        // return the index if not found
        console.log('cookie found: its value is: ' + userId);
        let userObject = util.getObjectFromArray(userId,cubeArray);

        if(typeof(userObject)!=="number"){
            response.download(path.join('csv',userObject.name.replace('.cub','.csv')),function(err){
                if(err){
                    console.log('file was not sent successfully');
                }else{
                    // file sent
                    response.status(200);
                    response.end();
                }
            });
        }else{
            console.log("user doesnt have data on the server");
            response.redirect('/?alertCode=4');
        }
    }
});


/**
 * POST '/imageDownload'
 * 
 *  this post function is only for sending the raw image to the user as a download  
 */
app.post('/imageDownload', function(request,response){

    // get user id cookie
    let uid = request.cookies["userId"];

    let cubeObj = util.getObjectFromArray(uid, cubeArray);
    // if user instance found
    if(typeof(cubeObj) === "object"){
        // send download file
        response.download(path.join('images',cubeObj.name.replace('.cub','.png')),function(err){
            if(err){
                console.log('file was not sent successfully');
            }else{
                // file sent
                response.status(200);
                response.end();
            }
        });
    }else{
        response.redirect("/?alertCode=4");
        response.end();
    }
    
});

/**
 * GET '/imageDownload'
 * 
 * send the last image upload from the user instance if found
 */
app.get('/imageDownload', function(request, response){
    console.log(request.path);
    var uid = request.cookies['userId'];

    if(uid === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');
    }else{
        let cubeObj = util.getObjectFromArray(uid, cubeArray);
        if(typeof(cubeObj) === "object"){
            // send download file
            response.download(path.join('images',cubeObj.name.replace('.cub','.png')),function(err){
                if(err){
                    console.log('file was not sent successfully');
                }else{
                    // file sent
                    response.status(200);
                    response.end();
                }
            });
        }else{
            console.log("User instance was not found on server");
            response.redirect("/?alertCode=4");
        }
    }
});


/**
 * GET '/showImage'
 * 
 * renders the image data from the users latest upload
 */
app.get('/showImage', function(request, response){
    console.log(request.path);

    var userid= request.cookies['userId'];

    if(userid === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');

    }else{
        console.log('cookie found: its value is: ' + userid);

        let userObject = util.getObjectFromArray(userid,cubeArray),
            data = userObject.impData;

        if(typeof(userObject)==="object"){
            // get image name
            let image = util.getimagename(userObject.name, 'png');
            imagepath = 'images/' + image;
            var rawCube = util.getRawCube(userObject.name,userObject.userNum);

            var w,
                h;

            // get the hight and width of the image and render the page with all needed variables
            jimp.read(imagepath).then(function(img){
                w = img.bitmap.width;
                h = img.bitmap.height;
                // check and calculate user dimensions if needed
                if(userObject.userDim[0] === -1){
                    let factor = userObject.userDim[1]/h;

                    userObject.userDim = [w*factor,userObject.userDim[1]];
                }
                else if(userObject.userDim[1] === -1){
                    let factor = userObject.userDim[0]/w;

                    userObject.userDim = [userObject.userDim[0],h*factor];
                
                }
                var userDim = userObject.userDim;
                let resolution = util.getPixelResolution(userObject);

                // calculate image width in meters
                if(resolution !== -1){
                    // calculate the image width in meters using the px width and the meters/px value
                    var imageMeterWidth = util.calculateWidth(resolution, w);

                    console.log(imageMeterWidth + ' in meters\n');

                    console.log(imageMeterWidth/1000 + ' in Kilometers\n');

                    // if the imageWidth is non-false
                    if(imageMeterWidth > -1){
                        // get log base 10 of the image width (dividing by 2 because there is two sides to the scalebar)
                        let x = Math.log10(imageMeterWidth/2);
                        // get the whole value of the base
                        let a = Math.floor(x);
                        // get the decimal half of the base
                        let b = x - a;

                        // if the decimal is 75% or more closer to a whole 10 set the base to 5
                        // check if 35% or greater, set base 2
                        // if the value is very close to a whole base on the low side set base to 5 and decrement the 10 base
                        // (this is to keep text from leaving image)
                        // default to 1
                        if(b >= 0.75){
                            b = 5;
                        }else if(b >= 0.35){
                            b = 2;
                        }else if(b<.05){
                            a -= 1;
                            b = 5;
                        }else{
                            b = 1;
                        }

                        // get the width that the scalebar will display on both halves
                        var scalebarMeters = b*Math.pow(10,a);

                        var scalebarLength,
                            scalebarUnits="";
                        // if the length is less than 1KM return length in meters else return legth in km
                        if(imageMeterWidth/1000 < 1){
                            console.log(scalebarMeters + " would be the legth in meters that the scalebar represents\n");
                            scalebarLength = scalebarMeters;
                            var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)));
                            console.log(scalebarLength + " m");
                            scalebarUnits = "m";
                        }
                        else{
                            console.log(scalebarMeters/1000 + " would be the legth in km that the scalebar represents\n");
                            
                            scalebarLength = scalebarMeters/1000;
                            var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)/1000));
                            console.log(scalebarLength + " km");
                            scalebarUnits = "km";
                        }

                        // render image page with needed data
                        if(isWindows){ imagepath = imagepath.replace("\\","/");}
                        if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                            response.render("imagePage.ejs", {image:imagepath, tagField: data,displayCube:rawCube,
                                origW: w,origH: h, w: userDim[0], h: userDim[1],scalebarLength: scalebarLength,scalebarPx: scalebarPx, scalebarUnits: scalebarUnits});
                        }else{
                            response.render("imagePage.ejs", {image:imagepath, tagField: data,displayCube:rawCube,
                                w: w, h: h, origW: w,origH: h,scalebarLength: scalebarLength, scalebarPx: scalebarPx, scalebarUnits: scalebarUnits});
                        }

                    }else{
                        console.log("Image Width in Meters Failed to Calculate");
                    }
                }else{
                    console.log("Scalebar could not be generated from present data");

                    // render image page with needed data
                    if(isWindows){ imagepath = imagepath.replace("\\","/");}
                    if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                        response.render("imagePage.ejs", {image:imagepath, tagField: data,displayCube:rawCube,
                            origW: w, origH: h, w: userDim[0], h: userDim[1],scalebarLength: 'none',scalebarPx: 'none', scalebarUnits: scalebarUnits});
                    }else{
                        response.render("imagePage.ejs", {image:imagepath, tagField: data,displayCube:rawCube,
                            w: w, h: h, origW: w,origH: h,scalebarLength: 'none', scalebarPx: 'none',scalebarUnits: scalebarUnits});
                    }

                }
            });

        }else{
            response.redirect("/?alertCode=4");
            response.end();
        }
    }
});

/**
 * POST '/showImage'
 * 
 * renders the image page with needed data
 */
app.post('/showImage', function(request, response){
    console.log(request.path);

    // prepare variables 
    var uid = request.cookies['userId'],
        userObject;
    var imagepath;
    var data,
        resolution;

    if(uid !== undefined){
        // get image name and path
        userObject = util.getObjectFromArray(uid, cubeArray);


        let image = util.getimagename(userObject.name, 'png');
        imagepath = 'images/' + image;

    
        // if the data val is an error code then fail
        if(userObject < 1){
            console.log('Object Search Failed');
            data = 'NONE';
        }else{
           
            // get resolution value
            var resolution = util.getPixelResolution(userObject);

            // otherwise load the important data from the active object array into data variable
            data = userObject.impData;
        }
    }else{
        // image path could not be found
        imagepath = 'none';
    }

   if(imagepath === 'none'){
       response.redirect("/?alertCode=4");
   }
    var w,
        h;

    // get the hight and width of the image and render the page with all needed variables
    jimp.read(imagepath).then(function(img){
        w = img.bitmap.width;
        h = img.bitmap.height;
        // check and calculate user dimensions if needed
        if(userObject.userDim[0] === -1){
            let factor = userObject.userDim[1]/h;

            userObject.userDim = [w*factor,userObject.userDim[1]];
        }
        else if(userObject.userDim[1] === -1){
            let factor = userObject.userDim[0]/w;

            userObject.userDim = [userObject.userDim[0],h*factor];
        
        }

        var userDim = userObject.userDim;
        var rawCube = util.getRawCube(userObject.name,userObject.userNum);

        // calculate image width in meters
        if(resolution !== -1){
            var imageMeterWidth = util.calculateWidth(resolution, w);

            console.log(imageMeterWidth + ' in meters\n');

            console.log(imageMeterWidth/1000 + ' in Kilometers\n');

            if(imageMeterWidth > -1){
                // same as above for calculating scale bar
                let x = Math.log10(imageMeterWidth/2);
                let a = Math.floor(x);
                let b = x - a;

                // if the decimal is 75% or more closer to a whole 10 set the base to 5
                // check if 35% or greater, set base 2
                // if the value is very close to a whole base on the low side set base to 5 and decrement the 10 base
                // (this is to keep text from leaving image)
                // default to 1
                if(b >= 0.75){
                    b = 5;
                }else if(b >= 0.35){
                    b = 2;
                }else if(b<.05){
                    a -= 1;
                    b = 5;
                }else{
                    b=1;
                }

                var scalebarMeters = b*Math.pow(10,a);

                var scalebarLength,
                    scalebarUnits="";
                // if the length is less than 1KM return length in meters
                if(imageMeterWidth/1000 < 1){
                    console.log(scalebarMeters + " would be the legth in meters that the scalebar represents\n");
                    scalebarLength = scalebarMeters;
                    var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)));
                    console.log(scalebarLength + " m");
                    scalebarUnits = "m";
                }
                else{
                    console.log(scalebarMeters/1000 + " would be the legth in km that the scalebar represents\n");
                    
                    scalebarLength = scalebarMeters/1000;
                    var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)/1000));
                    console.log(scalebarLength + " km");
                    scalebarUnits = "km";
                }

                // render image page with needed data
                if(isWindows){ imagepath = imagepath.replace("\\","/");}
                if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                    response.render("imagePage.ejs", {image:imagepath, tagField: data,displayCube:rawCube,
                        origW: w,origH: h, w: userDim[0], h: userDim[1],scalebarLength: scalebarLength,scalebarPx: scalebarPx, scalebarUnits: scalebarUnits});
                }else{
                    response.render("imagePage.ejs", {image:imagepath, tagField: data, displayCube:rawCube,
                        w: w, h: h, origW: w,origH: h,scalebarLength: scalebarLength, scalebarPx: scalebarPx, scalebarUnits: scalebarUnits});
                }



            }else{
                console.log("Image Width in Meters Failed to Calculate");
            }
        }else{
            console.log("Scalebar could not be generated from present data");

            // render image page with needed data
            if(isWindows){ imagepath = imagepath.replace("\\","/");}
            if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                response.render("imagePage.ejs", {image:imagepath, tagField: data, displayCube:rawCube,
                    origW: w, origH: h, w: userDim[0], h: userDim[1],scalebarLength: 'none',scalebarPx: 'none', scalebarUnits: scalebarUnits});
            }else{
                response.render("imagePage.ejs", {image:imagepath, tagField: data, displayCube:rawCube,
                    w: w, h: h, origW: w,origH: h,scalebarLength: 'none', scalebarPx: 'none',scalebarUnits: scalebarUnits});
            }

        }
    });
});


/**
 * GET '/crop'
 * 
 * Undoes the previous cropped image by uniform naming and 
 * array parsing after recieveing ajax get request
 */

app.get('/crop',async function(request, response){
    console.log(request.url + 'from GET');

    var currentImage = request.query.currentImage;

    var uid = request.cookies['userId'];

    let cubeObj = util.getObjectFromArray(uid, cubeArray);


    if(uid !== undefined){
        var baseImg = util.findImageLocation(cubeObj.name.replace('.cub','.png'));
    }else if(currentImage === undefined || !uid){
        response.redirect("/?alertCode=4");
        response.end();
    }
    var newImage;

    console.log(baseImg + ' = baseimage and: ' + currentImage + ' IS THE CURRENT');
    
    // check return value for the function
    var data = (cubeObj === -1) ? 'None' : cubeObj.impData;

    // if spliting on _ equals legth 2
    if(currentImage.split('_').length === 2){
        // remove current file
        await fs.unlinkSync(currentImage.split('?')[0]);

        // get new Image b/c we know its a default
        newImage = util.findImageLocation(cubeObj.name);

        console.log("undo to : " + newImage);
        // render with variables
        var w;
        var h;
        // read in new image and dimensions
        jimp.read(newImage).then(function(img){
            w = img.bitmap.width;
            h = img.bitmap.height;
            // render image page with needed data
            if(isWindows){newImage = newImage.replace("\\","/");}
            response.render("imagePage.ejs", {image:newImage, tagField: data, w: w, h: h});
            response.end();
        }).catch(function(err){
            console.log(err);
        });
    }
    // if the legth is greater than 2
    else if(currentImage.split('_').length > 2){
        // check for base image and remove if not equal
        if(currentImage !== baseImg){
            console.log('current image is: ' + currentImage);
            await fs.unlinkSync(currentImage.split('?')[0]);
        }
        // remove the timestring query
        let imageLink = currentImage.split('?')[0];
        // split name on underscore
        let strArray = imageLink.split('_');

        // set second to last string equal to the last and rejoin after popping the end off
        strArray[strArray.length - 2] += '.' + strArray[strArray.length-1].split('.')[strArray[strArray.length-1].split('.').length - 1];
        strArray.pop();
        newImage = strArray.join('_');
        
        // check to see of the new image name is the base name
        if(newImage.split("/")[1] === cubeObj.name.replace('.cub','.png')){
            var w;
            var h;
            // if yes read the base image back in
            jimp.read(baseImg).then(function(img){
                w = img.bitmap.width;
                h = img.bitmap.height;
                // render image page with needed data
                if(isWindows){ baseImg = baseImg.replace("\\","/");}
                response.render("imagePage.ejs", {image:baseImg, tagField: data, w: w, h: h});
                response.end();
            }).catch(function(err){
                console.log('ERROR 1: ' + err);
            });
        }else{
            // else read the new image in
            var w;
            var h;
            // read heigth and width
            jimp.read(newImage).then(function(img){
                w = img.bitmap.width;
                h = img.bitmap.height;
                // render image page with needed data
                if(isWindows){ newImage = newImage.replace("\\","/");}
                response.render("imagePage.ejs", {image:newImage, tagField: data, w: w, h: h});
                response.end();
            }).catch(function(err){
                console.log('ERROR 2: ' + err);
            
            });
        }
    }
    else{
        console.log('should never run but is a catch all');
        var w;
        var h;
        jimp.read(cubeObj.name).then(function(img){
            w = img.bitmap.width;
            h = img.bitmap.height;
            // render image page with needed data
            if(isWindows){newImage = newImage.replace("\\","/");}
            response.render("imagePage.ejs", {image:cubeObj.name, tagField: data, w: w, h: h});
            response.end();
        }).catch(function(err){
            console.log('ERROR 3: ' + err);
        });
    }
});


/**
 * POST '/crop'
 * 
 * this handles the actual jimp crop functionality
 */

app.post('/crop', async function(request,response){
    console.log(request.url);

    // retrieve all parts from the request queries and cookie
    let arrayString = request.query.cropArray;

    let pxArray = arrayString.split(',');
    var croppedImage = request.query.currentImage.split('?')[0];
    var userid = request.cookies['userId'];

    let cubeObj = util.getObjectFromArray(userid, cubeArray);

    // if the data val is an error code then fail otherwise return important data string
    var data = (cubeObj < 1) ? 'NONE': cubeObj.impData;
    
    // set header to html
    response.setHeader("Content-Type", "text/html","charset=utf-8");

    // if the cropped image is the original image location
    if(userid !== undefined && croppedImage === util.findImageLocation(cubeObj.name)){
        // do the basic crop action
        var imageLocation = croppedImage;

        console.log('image location is: ' + imageLocation);
        // get the pixel crop locations by calculating width and height
        pxArray = util.calculateCrop(pxArray);
        // await on the jimp crop function
        await util.cropImage(imageLocation, pxArray).then( async function(newImage){
            // return the new image and its width and height
            if(isWindows){newImage = newImage.replace("\\","/");}
            response.render('imagePage.ejs',{image:newImage + '?t='+ performance.now() , tagField: data, h: pxArray[3], w: pxArray[2]});
        });

    }
    // we know the current image is already cropped before
    else{
        // calulate the crop array like before and get the image location from the queryString
        pxArray = util.calculateCrop(pxArray);
        imageLocation = util.parseQuery(croppedImage);

        // await on the crop function like before
        await util.cropImage(imageLocation, pxArray).then( async function(newImage){
            if(isWindows){newImage = newImage.replace("\\","/");}
            response.render('imagePage.ejs',{image:newImage + '?t='+ performance.now() , tagField: data, h: pxArray[3], w: pxArray[2]});
        });
    }
});



/**
 * '/*' catch all unknown routes
 * 
 * This is a 404 http catch all
 */
app.get("*",function(request, response){
    
    // render a 404 error in the header and send the 404 page
    response.status(404).render("404.ejs");
});



/* activate the server */

// listen on some port
// FOR TESTING ONLY!!! should be 'const PORT = process.env.PORT || 8080;'
const PORT = 8080 || process.env.PORT;
app.listen(PORT);

// tell console status and port #
console.log("Server is running and listen to port " + PORT);