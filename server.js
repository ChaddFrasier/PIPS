/**
 * @file server.js 
 * @alias server
 * @run node server 
 * 
 * @author Chadd Frasier 
 *      @link https://www.cefns.nau.edu/~cmf339/ChaddFrasier/
 * 
 * @version 3.7.2
 * @description This is the main handler for the PIP Server  by USGS.
 * 
 * @since 05/31/19
 * @updated 09/20/19
 *
 * 
 * @todo 8 log the isis returns to a file if the user wants that.
 * @todo 9 have a POST '/pow' link that calculates data and creates an image based 
 *         on preset defaults and a data file for input.
 * @todo 10 '/pow will need to set the log flag in the user instance
 * 
 * 
 * @requires ./util.js {this needs to be in root of application because of ISIS Commands}
 * @requires ./js/cubeObj.js
 * 
 * Note: This server is only capable of running on a linux or mac operating systems due to ISIS3 
 */

/** READ ME BEFORE EDITING
 * ----------------------------------------------------------------------------------------------------------
 * @summary  09/20/19           Planetary Image Publication Server
 *                             ------------------------------------
 * 
 *     Uploads can be in .cub or .tif and the server now has a more user friendly acceptance of dimensions
 *  by auto generating the size of the other dimensions when not given.
 * 
 *     Ex: If given a height OR a width and the other box is left blank, 
 *         the server now calculates the other dimension preserving the aspect ratio of the image.
 *         Uploading a 900 x 900 image with a desire width of 500 will auto calculate the height
 *         of 500 for the user.
 * 
 *     Or the user can specify an exact output size of the figures (width AND height).
 * 
 *     The user can now add icons with the proper rotation and invert any of the icons' color 
 *  using a check box. Scalebars are working and will be disabled if it's not possible to calculate.
 *  All addable icons are disabled when the data cannot be found. Icons, Text, and Outline Boxes all
 *  can be scaled using the corners of the icon by clicking when indicated and dragging the mouse in
 *  the directions of the mouse pointer.
 * 
 *     The pencil tool now allows the user to hit the escape key to undo a misplaced point on the pencil 
 *  tool. The pencil works off of a two click system right now and this may be changed to a drag later 
 *  if the users would prefer that method instead. 
 * 
 *     Sizes of UI are more friendly toward smaller screens. Changes include tighter spacing on the
 *  writer page, and better button placements. The user no longer has to scroll down to move to the photo
 *  editing page. The UI on the writer page now has a 'filter tags' function where the user can type 
 *  3 or more characters into the filter bar and results that contain that string will be displayed in 
 *  the tag section.
 *  
 *     Annotation and outline boxes have been added, the user can select a color for the text, outline
 *  boxes, and pencil tool independent of one another. 
 * 
 *     Padding can be added to the image on one of the 4 sides, it adds pixels to the image 
 *  not shrinks the image down and it will update the padding on any change of the value in the textbox. 
 * 
 *     A new id system has been created to allow users to keep a 23 character id for a month before losing
 *  it. This helps testing and prevents users from having identical ids when the server restarts 
 *  unexpectedly. 
 * 
 *     Exporting has change completly, instead of the user saving the inline svg from the browser, the
 *  export button now sends a request to the server with the svg data and the users filename for the download
 *  and the server uses the svg2img module to convert the image data from svg to the output type and
 *  sends the download directly to the user. This helps the download process by speeding up image processing
 *  and allowing chrome users to see a progress bar instead of having to wait for the download to finish.
 * 
 *      A progress bar has been added to the image editor for when users are downloading the figure.
 *  This is a better interface for users when a download is occuring rather than just a spinning animation.
 *  The progress bar guesses how long the download will take and it runs a css animation for that duration
 *  to show a rough estimate of how long the download will take.
 * 
 * ----------------------------------------------------------------------------------------------------------
*                                          Last Notes for Coders
*                                          ---------------------
 * 
 *     Comment your code and include an 'author' tag for any functions you write to the server. 
 * Try your best to follow commenting paradigms which includes using param, return, and desc tags for your
 * functions on the server's javascript files (not on the webpages).
 *  
 *     DO NOT remove functions if your version does not use them. Let the repository managers do that
 * during merging.(This is to prevent conflicts with any major branch changes.)
 * 
 *     Lastly, this server is built to simplify the figure creation process not to replace photo 
 *  editing software so keep that in mind when adding your own code.
 * ----------------------------------------------------------------------------------------------------------
 *                                   General Code Paradigms
 *                                   ----------------------
 *                1. Comment, comment, comment
 *                2. Document the 'author' and 'function' and 'description' for each javascript function
 *                                  (Use Javadoc format like in util.js)
 *                3. lines should not exceed 110 characters for server files and 120 for view files
 * 
*/

// require dependencies
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const exec = require('child_process').exec;
const fs = require('fs');
const Promise = require('bluebird');
const cookieparser = require('cookie-parser');
const bodyParser = require("body-parser");
const svg2img = require("svg2img");

// include custom utility functions
const util = require('./util.js');
const Cube = require('./js/cubeObj.js');

// start app env
var app = express();

// global instance array for cube objects
var cubeArray = [];
var numUsers = 0;

// use express middleware declarations
app.use(fileUpload());
app.use(cookieparser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

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
app.use("/pvl " , express.static("pvl"));


// start view engine
app.set('view engine', 'ejs');

// erase uneeded files before server startup
try{
    exec('rm ./images/*.pgw');
    exec('rm ./uploads/*');
    exec('rm ./pvl/*.pvl');
    exec('rm ./csv/*.csv');
    exec('rm ./print.prt');
    exec('rm ./tmp/*');
    
    // get the list of files in the images dir
    let fileArr = fs.readdirSync("./images");
    // loop throught then and delete the file if it matchest this regexp
    for(index in fileArr){
        // regexp uses negativelookbehind to ensure the image file is not one of the required file strings
        if(/^.*(?<!arrow|eye_symbol|north|pencil|pencilcursor|sun_symbol|usgsLogo)\.(png)$/gm
            .test(fileArr[index])){
            // remove the file
            fs.unlinkSync(path.join('images',fileArr[index]));
        }
    }
}
catch(err){
    console.log('File Error Occured: ' + err);
}

// read the config file to get only important tags for webpage
const importantTagArr = util.configServer(fs.readFileSync(
    path.join('.','cfg', 'config1.xml'), {encoding: 'utf-8'}));


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
        case "8":
            response.status(500);
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
 * Renders the basic page
 */ 
app.get('/tpl',function(request, response){
    // render the data
    response.render('tpl.ejs');
    
});


/**
 * GET '/captionWriter'
 * 
 * this occurs when a user types the '/captionWriter'
 * matches the last cube instance and returns that data
 * 
 * USER MUST POST TO UPLOAD A NEW FILE
 */
app.get('/captionWriter',function(request,response){
    console.log(request.path);

    var userid = request.cookies['userId'];

    if(userid === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');

    }else{
        //retrieve the last found file for the user if it is there
        // otherwise render index with an alert that the session timed out and they should upload again
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
 * POST '/captionWriter'
 * 
 * allows file upload and data extraction to take place when upload button is activated
 */
app.post('/captionWriter', async function(request, response){
    console.log(request.path);

    // prepare the variables for response to user
    var templateText = '';
    let isTiff = false;
    
    //============== for testing only =======================
    console.log('=================== New Upload ========================');
    //================================================

    // cube file section
    try{
        if(request.files === null || !request.files.uploadFile ){
            // if no files uploaded
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
                // set cookie for the given user id (expires in just over 1 month [2628100000 miliseconds]) 
                response.cookie('userId', uid, {expires: new Date(Date.now() + 2628100000), httpOnly: false});
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
                    // send the alert code and redirect
                    response.redirect('/?alertCode=2');
                    // end response
                    return response.end();
                }
            }catch(err){
                // tpl is null set default
                templateText = fs.readFileSync('tpl/default.tpl', 'utf-8');
            }
            
            //convert tiff to cube

            /** TODO: ---- WILL NEED TO TEST THIS LOG SYSTEM -------- */
            if(isTiff){
                promises.push(util.tiffToCube('uploads/' + cubeObj.name, cubeObj.logFlag));
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
                    cubeObj.userDim = [Number(request.body.desiredWidth),Number(request.body.desiredHeight)];
                }
            }else{
                // otherwise ignore and default
                cubeObj.userDim = [900,900];
            }
            
            // reset server tif val because conversion completed
            isTiff = false;

            // after conversion finished
            Promise.all(promises).then(function(cubeName){

                // if the return array legth is not 0 extract the new cubefile name
                if(cubeName.length > 0){
                    fs.unlinkSync(cubeName[0].replace(".cub",".tif"));
                    cubeObj.name = path.basename(cubeName[0]);

                }
                // reset the promises array
                promises = [];
                var lines,
                    samples,
                    scaleFactor;

                // get the original dimensions of the cube file just in case scaling is required
                fs.readFile(path.join("./uploads",cubeObj.name),(err, data)=>{
                    if(err){
                        console.log("READING ERROR: " + err);
                    }else{
                        console.log("gets here");
                        let bufferArray = data.subarray(0,data.length/10).toString().split("\n");
                        for(let index=0; index< bufferArray.length;index++){
                            if(bufferArray[index].indexOf("Group = Dimensions") > -1){
                            
                                samples = Number(bufferArray[index + 1].split("=")[1]);
                                lines = Number(bufferArray[index + 2].split("=")[1]);

                                console.log("This cube file is " + samples + " samples by " + lines + " lines");
                                // scaleFactor is the factor that it takes to shrink the lowest dimension to the new dimension
                                scaleFactor = (samples <= lines) ? lines/cubeObj.userDim[1] : samples/cubeObj.userDim[0];
                                break;
                            }
                        }

                        if(scaleFactor > 1){
                            promises.push(util.reduceCube(cubeObj.name, scaleFactor, cubeObj.logFlag));
                        }
                        
                        Promise.all(promises).then(function(cubeName){
                            
                            if(cubeName.length > 0){
                                cubeObj.name = cubeName[0];
                            }
                            
                            promises = [];

                            // TODO: this is where i can test the loging functions also this is the functions that
                            //  '/pow' will need to run
                            // make promise on the isis function calls

                            /** ========Testing log system ========
                             * 
                             * setting last input of function to true (hard coded)
                            */
                            promises.push(util.makeSystemCalls(cubeObj.name,
                                path.join('.','uploads',cubeObj.name),
                                path.join('.','pvl',cubeObj.name.replace('.cub','.pvl')),
                                'images',
                                cubeObj.logFlag));
                        
                        
                            // when isis is done read the pvl file
                            Promise.all(promises).then(function(){
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
                            }).catch(function(errcode){

                                if(errcode === -1){
                                    // alert 8 which happens when the server is no configured properly 
                                    // (ISIS is not running)
                                    response.redirect('/?alertCode=8');
                                    // end response
                                    response.end();
                                }else{
                                    // alert 6 which happens when isis failed to create an image form the cube
                                    response.redirect('/?alertCode=6');
                                    // end response
                                    response.end();
                                }                    
                            });    
                        }).catch(function(err){
                            if(err === -1){
                                // alert 8 because isis is not on
                                response.redirect('/?alertCode=8');
                                // end response
                                response.end();
                            }else{
                                console.log("Reduce ERROR: " + err)
                            }
                        });
                    }
                });      
            }).catch(function(err){
                if(err === -1){
                    // alert 8 because isis is not on
                    response.redirect('/?alertCode=8');
                    // end response
                    response.end();
                }else{
                    // alert 5 which happens when isis fails to convert a tif
                    response.redirect('/?alertCode=5');
                    // end response
                    response.end();
                }

            });
        }
        else{
            // wrong file type uploaded
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
            response.redirect('/?alertCode=4');
        }
    }
});

/**
 * GET '/imageEditor'
 * 
 * renders the image data from the users latest upload
 */
app.get('/imageEditor', function(request, response){
    console.log(request.path);

    var userid= request.cookies['userId'];

    if(userid === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');

    }else{
        let userObject = util.getObjectFromArray(userid,cubeArray),
            data = userObject.impData;

        if(typeof(userObject)==="object"){
            // get image name
            let image = util.getimagename(userObject.name, 'png');
            imagepath = 'images/' + image;
            var rawCube = util.getRawCube(userObject.name,userObject.userNum);

            var w,
                h;

            
            userObject.getCubeDimensions().then(dimensions => {
                dimensions = JSON.parse(dimensions);
                w = dimensions.w;
                h = dimensions.h;
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
                var isMapProjected = util.isMapProjected(userObject.data),
                    rotationOffset = util.getRotationOffset(isMapProjected, userObject.data);
    
                // calculate image width in meters
                if(resolution !== -1){
                    var imageMeterWidth = util.calculateWidth(resolution, w);
    
                    if(imageMeterWidth > -1){
                        // same as above for calculating scale bar
                        let x = Math.log10(imageMeterWidth/2);
                        let a = Math.floor(x);
                        let b = x - a;
    
                        // if the decimal is 75% or more closer to a whole 10 set the base to 5
                        // check if 35% or greater, set base 2
                        // if the value is very close to a whole base on the low side 
                        //      set base to 5 and decrement the 10 base
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
                            scalebarLength = scalebarMeters;
                            var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)));
                            console.log(scalebarLength + " m");
                            scalebarUnits = "m";
                        }
                        else{
                            
                            scalebarLength = scalebarMeters/1000;
                            var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)/1000));
                            console.log(scalebarLength + " km");
                            scalebarUnits = "km";
                        }
    
                        // render image page with needed data
                        if(isWindows){ imagepath = imagepath.replace("\\","/");}
                        if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                            response.render("imagePage.ejs", 
                            {
                                image:imagepath,
                                tagField: data,
                                displayCube:rawCube,
                                isMapProjected: isMapProjected,
                                rotationOffset:rotationOffset,
                                origW: w,origH: h, w: userDim[0], h: userDim[1],
                                scalebarLength: scalebarLength,
                                scalebarPx: scalebarPx, 
                                scalebarUnits: scalebarUnits
                            });
                        }else{
                            response.render("imagePage.ejs", 
                            {
                                image:imagepath,
                                tagField: data,
                                displayCube:rawCube,
                                isMapProjected: isMapProjected,
                                rotationOffset:rotationOffset,
                                w: w, h: h, origW: w,origH: h,
                                scalebarLength: scalebarLength,
                                scalebarPx: scalebarPx,
                                scalebarUnits: scalebarUnits
                            });
                        }
                    }else{
                        console.log("Image Width in Meters Failed to Calculate");
                    }
                }else{
                    // render image page with needed data
                    if(isWindows){ imagepath = imagepath.replace("\\","/");}
                    if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                        response.render("imagePage.ejs", 
                        {
                            image:imagepath,
                            tagField: data,
                            displayCube:rawCube,
                            isMapProjected: isMapProjected,
                            rotationOffset:rotationOffset,
                            origW: w, origH: h, w: userDim[0], h: userDim[1],
                            scalebarLength: 'none',
                            scalebarPx: 'none',
                            scalebarUnits: scalebarUnits
                        });
                    }else{
                        response.render("imagePage.ejs", 
                        {
                            image:imagepath,
                            tagField: data,
                            displayCube:rawCube,
                            isMapProjected: isMapProjected,
                            rotationOffset:rotationOffset,
                            w: w, h: h, origW: w,origH: h,
                            scalebarLength: 'none',
                            scalebarPx: 'none',
                            scalebarUnits: scalebarUnits
                        });
                    }
                }
            }).catch(err => {
                if(err){
                    console.log("ERROR: " + err);
                }
            });
        }else{
            response.redirect("/?alertCode=4");
            response.end();
        }
    }
});

/**
 * POST '/imageEditor'
 * 
 * renders the image page with needed data
 */
app.post('/imageEditor', function(request, response){
    console.log(request.path);

    // prepare variables 
    var uid = request.cookies['userId'],
        userObject,
        imagepath,
        data,
        resolution;

    if(uid !== undefined){
        // get image name and path
        userObject = util.getObjectFromArray(uid, cubeArray);

        if(typeof(userObject) === "object"){
            let image = util.getimagename(userObject.name, 'png');
            imagepath = 'images/' + image;
    
            // if the data val is an error code then fail
            if(userObject < 1){
                data = 'NONE';
            }else{
               
                // get resolution value
                var resolution = util.getPixelResolution(userObject);
    
                // otherwise load the important data from the active object array into data variable
                data = userObject.impData;
            }
        } 
    }else{
        // image path could not be found
        imagepath = 'none';
    }

   if(imagepath === 'none' || typeof(userObject)!== "object"){
       response.redirect("/?alertCode=4");
       return response.end();
   }else{
        var w,
            h;

        userObject.getCubeDimensions().then(dimensions => {
            dimensions = JSON.parse(dimensions);
            w = dimensions.w;
            h = dimensions.h;
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
            var isMapProjected = util.isMapProjected(userObject.data),
                rotationOffset = util.getRotationOffset(isMapProjected, userObject.data);

            // calculate image width in meters
            if(resolution !== -1){
                var imageMeterWidth = util.calculateWidth(resolution, w);

                if(imageMeterWidth > -1){
                    // same as above for calculating scale bar
                    let x = Math.log10(imageMeterWidth/2);
                    let a = Math.floor(x);
                    let b = x - a;

                    // if the decimal is 75% or more closer to a whole 10 set the base to 5
                    // check if 35% or greater, set base 2
                    // if the value is very close to a whole base on the low side 
                    //      set base to 5 and decrement the 10 base
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
                        scalebarLength = scalebarMeters;
                        var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)));
                        console.log(scalebarLength + " m");
                        scalebarUnits = "m";
                    }
                    else{
                        
                        scalebarLength = scalebarMeters/1000;
                        var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)/1000));
                        console.log(scalebarLength + " km");
                        scalebarUnits = "km";
                    }

                    // render image page with needed data
                    if(isWindows){ imagepath = imagepath.replace("\\","/");}
                    if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                        response.render("imagePage.ejs", 
                        {
                            image:imagepath,
                            tagField: data,
                            displayCube:rawCube,
                            isMapProjected: isMapProjected,
                            rotationOffset:rotationOffset,
                            origW: w,origH: h, w: userDim[0], h: userDim[1],
                            scalebarLength: scalebarLength,
                            scalebarPx: scalebarPx, 
                            scalebarUnits: scalebarUnits
                        });
                    }else{
                        response.render("imagePage.ejs", 
                        {
                            image:imagepath,
                            tagField: data,
                            displayCube:rawCube,
                            isMapProjected: isMapProjected,
                            rotationOffset:rotationOffset,
                            w: w, h: h, origW: w,origH: h,
                            scalebarLength: scalebarLength,
                            scalebarPx: scalebarPx,
                            scalebarUnits: scalebarUnits
                        });
                    }
                }else{
                    console.log("Image Width in Meters Failed to Calculate");
                }
            }else{
                // render image page with needed data
                if(isWindows){ imagepath = imagepath.replace("\\","/");}
                if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0){
                    response.render("imagePage.ejs", 
                    {
                        image:imagepath,
                        tagField: data,
                        displayCube:rawCube,
                        isMapProjected: isMapProjected,
                        rotationOffset:rotationOffset,
                        origW: w, origH: h, w: userDim[0], h: userDim[1],
                        scalebarLength: 'none',
                        scalebarPx: 'none',
                        scalebarUnits: scalebarUnits
                    });
                }else{
                    response.render("imagePage.ejs", 
                    {
                        image:imagepath,
                        tagField: data,
                        displayCube:rawCube,
                        isMapProjected: isMapProjected,
                        rotationOffset:rotationOffset,
                        w: w, h: h, origW: w,origH: h,
                        scalebarLength: 'none',
                        scalebarPx: 'none',
                        scalebarUnits: scalebarUnits
                    });
                }
            }
        }).catch(err => {
            if(err){
                console.log("ERROR: " + err);
            }
        });          
    }
});

app.post("/pow",function(request, response){
    // TODO: POW connection link
});


/**
 * 
 * 
 * 
 */
app.post("/figureDownload", async function(request, response){
    console.log(request.url);
    // get the filename that the user entered
    var filename = request.body.downloadName,
        fileExt = filename.split(".")[filename.split(".").length - 1];

    // save the file in the formdata to the server so it can be read
    await request.files.upl.mv("./tmp/" + request.files.upl.name, function(err){
        if(err){
            // log any errors
            console.log("Server Error on saving");
        }else{
            console.log("saved successfully");

            if(fileExt === "png"){
                svg2img("./tmp/"+request.files.upl.name,function(err,buffer){
                    if(err){
                        console.log(err);
                    }else{
                        fs.writeFileSync("./tmp/" + filename,buffer);
                        response.download("./tmp/" + filename,filename,function(err){
                            if(err){
                                console.log(err);
                            }else{
                                console.log("download sent");
                            }
                        });
                    }
                });
            }else{
                svg2img("./tmp/"+request.files.upl.name, {format:'jpg'}, function(err,buffer){
                    if(err){
                        console.log(err);
                    }else{
                        fs.writeFileSync("./tmp/" + filename,buffer);
                        response.download("./tmp/" + filename,filename,function(err){
                            if(err){
                                console.log(err);
                            }else{
                                console.log("download sent");
                                fs.unlinkSync("./tmp/" + filename);
                            }
                        });
                    }
                });
            }
        }
    });
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