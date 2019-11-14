/**
 * @file server.js
 * @alias server
 * @run node server
 * 
 * @author Chadd Frasier
 *      @link https://www.cefns.nau.edu/~cmf339/ChaddFrasier/
 * 
 * @version 3.8.1
 * @description This is the main handler for the PIP Server  by USGS.
 * 
 * @since 05/31/2019
 * @updated 11/08/2019
 *
 * @todo 9 have a POST '/pow' link that calculates data and creates an image based
 *         on preset defaults and a data file for input.
 * @todo 10 '/pow will need to set the log flag in the user instance
 * 
 * @requires ./util.js {this needs to be in root of application because of ISIS Commands}
 * @requires ./js/cubeObj.js
 * 
 * Note: This server is only capable of running on a linux or mac operating systems due to ISIS3
 */

/** READ ME BEFORE EDITING
 * ----------------------------------------------------------------------------------------------------------
 * @summary  10/13/2019           Planetary Image Publication Server
 *                               ------------------------------------
 * 
 *     Uploads can be in .cub or .tif and the server now has a more user friendly acceptance of dimensions
 *  by auto generating the size of the other dimensions when not given.
 * 
 *     Ex: If given a height OR a width and the other box is left blank, 
 *         the server now calculates the other dimension preserving the aspect ratio of the image.
 *         Uploading a 1500 x 1500 image with a desire width of 500 will auto calculate the height
 *         of 500 for the user.
 * 
 *     Or the user can specify an exact output size of the figures (width AND height).
 * 
 *     Max Image dimension is 5000px. If the user uploads an image with default dimensions of
 *  1000 x 3000px, and the user wants an output dimension of 2000 px wide. That would make the height
 *  over 5000px in which case the server sends back an image that is (5000/3000)*1000 x 5000 px.
 *  This preserves the aspect ratio of the image and caps the largest dimensions of the image at 5000px.
 * 
 *     Now the index page allows users to choose which journal they will be publishing in and they can
 *  select a figure size based on the journal's accepted size formats. 
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
 *  and the server uses the sharp module to convert the image data from svg to the output type and
 *  sends the download directly to the user. This helps the download process by speeding up image processing
 *  and allowing chrome users to see a progress bar instead of having to wait for the download to finish.
 * 
 *                      ( Exporting can be done in png, jpeg, svg, or tiff )
 * 
 *      A progress bar has been added to the image editor for when users are downloading the figure.
 *  This is a better interface for users when a download is occuring rather than just a spinning animation.
 *  The progress bar guesses how long the download will take and it runs a css animation for that duration
 *  to show a rough estimate of how long the download will take.
 * 
 *      The Log system right now allows for a single log file for each user id. This could change to 
 *  having a long for each individual file, but for now I am appending the logs to one file. 
 *  It works by passing a flag and the file to write to. The ISIS spawn commands changed a bit. Instead
 *  of writing directly to a .pvl file from the shell stdout, I am forcing the function output to be on 
 *  command line and I'm capturing the output and then appending it to the pvl file. After it either
 *  logs to file or prints to console. The format of the log file was copy catted from the 
 *  U.S. Geological Survey's Processing Cloud return log. POW returns a similar format and I wanted
 *  consistency.  
 * 
 *      With a button on the writer page the user can download the ISIS3 Log file that explains all
 *  the functions run on the cube and their outputs either an error code and message or the std output
 *  of the spawn function. These logs could help new users better understand ISIS3 usage and experienced 
 *  ISIS users can better understand what goes ISIS programs go into creating the project.
 * 
 *      Hotkeys have been added to the Image Editor. The hotkeys can be found at this link(). The hotkeys
 *  were added after responses from the first rounds of user testing. There are hotkeys for adding each 
 *  object onto the image as well as removing it or toggling colors. Alt is the action key for all the
 *  commands and Shift + Alt is for the secondary command.
 * 
 * ----------------------------------------------------------------------------------------------------------
 *                                          Last Notes for Coders
 *                                          ---------------------
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
*/

// require dependencies
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const exec = require('child_process').exec;
const fs = require('fs');
const os = require('os');
const Promise = require('bluebird');
const cookieparser = require('cookie-parser');
const bodyParser = require("body-parser");
const sharp = require("sharp");

// include custom utility functions
const util = require('./util.js');
const Cube = require('./js/cubeObj.js');
const Memory = require("./js/memoryUnit.js");

// start app env
var app = express();

// global instance array for cube objects
var cubeArray = [],
    memArray = [];
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
app.use("/log" , express.static("log"));
app.use("/tpl" , express.static("tpl"));
app.use("/tmp" , express.static('tmp'));
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
    exec('rm ./log/*');

    // get the list of files in the images dir
    let fileArr = fs.readdirSync("./images");
    // loop throught then and delete the file if it matchest this regexp
    for(index in fileArr){
        // regexp uses negativelookbehind to ensure the image file is not one of the required file strings
        if(/^.*(?<!pencilcursor|usgsLogo)\.(png)$/gm
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

    try{
        Memory.prototype.accessMemory(id, memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }

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
    try{
        Memory.prototype.accessMemory(request.cookies["puiv"], memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }
    response.render('tpl.ejs');
});

/**
 * GET 'log/{anything}'
 * 
 * Checks to see if the file is currently on the server and sends the 
 * file for downloads it to the client
 */
app.get("/log/*",function(request, response) {
    console.log(request.url);

    let queryString = request.query.isTest;
    var id = request.url.split("/")[request.url.split("/").length -1];

    id = id.split("?")[0];

    try{
        Memory.prototype.accessMemory(id, memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }

    if(queryString === undefined){
    
        if(fs.existsSync(path.join("log", id+".log"))){
            response.download(path.join("log",id+".log"),function(err){
                if(err){
                    console.log("DOWNLOAD FAILED: " + err);
                    response.status(500).send("File Failed to Send").end();
                }
                else{
                    console.log("Download Sent");
                }
            });
        }
        else{
            response.status(403).send("File Not Found").end();
        }
    }
    else{
        // check to see if the file exists
        let exists = fs.existsSync(path.join(__dirname, "log", id + ".log"));

        if(exists){
            response.sendStatus(200);
        }   
        else{
            // file not found
            response.sendStatus(404);
        }
    }
    
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

    var userid = request.cookies['puiv'];

    try{
        Memory.prototype.accessMemory(userid, memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }
    
    if(userid === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');
    }
    else{
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
        }
        else{
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
    
    try {
        Memory.prototype.accessMemory(request.cookies["puiv"], memArray).updateDate();
    }
    catch(err) {
        // no instance was found or other error
    }

    //============== for testing only =======================
    console.log('=================== New Upload ========================');
    //=======================================================

    // cube file section
    try{
        if( request.files === null || !request.files.uploadFile ){
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
            var uid = request.cookies['puiv'];
            
            // create promises array for syncronous behavior
            var promises = [];

            // set tiff flag
            if(cubeFile.name.indexOf('.tif') !== -1){
                isTiff = true;
            }
            else{
                isTiff = false;
            }

            // make sure string only contains digets and it is a proper length
            // if no user id is found 
            if(uid === undefined || !(/[\S\d]{23}/gm.test(uid) && uid.length === 23)){
                // create a random 23 character user id
                uid = util.createUserID(23);
                // set cookie for the given user id (expires in just over 1 month [2628100000 miliseconds]) 
                response.cookie('puiv', uid, {expires: new Date(Date.now() + 2628100000), httpOnly: false});
            }

            // if the cubeArray is empty
            if(cubeArray.length === 0){
                // create new instance
                var cubeObj = new Cube('u-' + numUsers + cubeFile.name, uid);
                cubeObj.userNum = numUsers++;
            }
            else{
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

            // remove the file that was uploaded to allow for a clean file read from the fs module
            try{fs.unlinkSync('./uploads/' + cubeObj.name);}
            catch(err){/* Catch file error if file is not on server*/}
            
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
                switch(Number(request.body.tplCode)){
                    //check the code and set the proper tpl
                    case 1:
                        templateText = fs.readFileSync('tpl/mosaicDefault.tpl', 'utf-8');
                        break;
                    case 2:
                        templateText = fs.readFileSync('tpl/mapDefault.tpl', 'utf-8');
                        break;
                    case 3:
                        templateText = fs.readFileSync('tpl/compositeDefault.tpl', 'utf-8');
                        break;
        
                    default:
                        // tpl is null set default
                        templateText = fs.readFileSync('tpl/default.tpl', 'utf-8');
                        break;
                }
            }

            // check to see if the log flag is true and set outcome
            if(request.body.logToFile){
                cubeObj.logFlag = true;
            }
            else{
                cubeObj.logFlag = false;
            }

            // create the log file if needed
            if(cubeObj.logFlag){
                let result = util.createLogFile(cubeObj.userId + ".log");
                if(result >= 0){ // check for bad createLogFile return
                    // if it already exists then append a new file upload line
                    fs.appendFileSync(path.join("log",cubeObj.userId + ".log"),"FILE_UPLOAD:\n\n");
                }
            }
            
            //convert tiff to cube
            if(isTiff){
                // promise on the tiff conversion
                let logCubeName = util.getRawCube(cubeObj.name, cubeObj.userNum);
                promises.push(util.tiff2Cube(
                        'uploads/' + cubeObj.name,
                        cubeObj.logFlag,
                        cubeObj.userId + ".log",
                        logCubeName));
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
            }
            else{
                // otherwise ignore and default
                cubeObj.userDim = [1500,1500];
            }
            
            // reset server tif val because conversion completed
            isTiff = false;

            // after conversion finished
            Promise.all(promises).then(function(cubeName){
                // if the return array legth is not 0 extract the new cubefile name
                if(cubeName.length > 0){
                    // remove the tif file that was uploaded
                    fs.unlinkSync(cubeName[0].replace(".cub",".tif"));
                    // get cube file name
                    cubeObj.name = path.basename(cubeName[0]);
                }

                // reset the promises array
                promises = [];

                // vars for reducing
                var lines,
                    samples,
                    scaleFactor;
   
                // get the original dimensions of the cube file just in case scaling is required
                fs.readFile(path.join("./uploads",cubeObj.name),(err, data)=>{
                    if(err){
                        console.log("READING ERROR: " + err);
                    }
                    else{
                        // get an array of the first 10% and the data (where the lines and sample data is located)
                        let bufferArray = data.subarray(0,data.length/10).toString().split("\n");
                        // for each thing in the array
                        for(let index=0; index< bufferArray.length;index++){
                            // if the array index is the start of the dimensions group
                            if(bufferArray[index].indexOf("Group = Dimensions") > -1){
                                // capture the next lines which are lines and samples 
                                samples = Number(bufferArray[index + 1].split("=")[1]); // width of image
                                lines = Number(bufferArray[index + 2].split("=")[1]); // height of image

                                // scaleFactor is the factor that it takes to 
                                // shrink the lowest dimension to the new dimension
                                scaleFactor = (samples <= lines) ? lines/cubeObj.userDim[1]:samples/cubeObj.userDim[0];
                                break;
                            }
                        }

                        // promise on the reduce call
                        var rawCube = util.getRawCube(cubeObj.name,cubeObj.userNum),
                            max = 2725;

                        // image is bigger than the desired figure size
                        if(scaleFactor > 1){
                            // if the new dimensions is less than the minimum and image is larger than new dimensions
                            if(cubeObj.userDim[0] * cubeObj.userDim[1] <= 7579000){
                                promises.push(util.reduceCube(rawCube, cubeObj.name, scaleFactor,
                                    cubeObj.logFlag, cubeObj.userId + ".log"));
                            }
                            else{
                                // new figure size is large than max
                                if(lines * samples > 7579000){
                                    scaleFactor = (samples > lines) ? samples/max : lines/max;
                                    promises.push(util.reduceCube(rawCube, cubeObj.name, scaleFactor,
                                        cubeObj.logFlag, cubeObj.userId + ".log"));
                                }
                                else{
                                    // render at full res
                                    promises.push(util.reduceCube(rawCube, cubeObj.name, 1,
                                        cubeObj.logFlag, cubeObj.userId + ".log"));
                                }
                            }
                            
                        }
                        else{
                            // image is smaller than desired figure size
                            // if the new dimensions is less than the max
                            if(lines * samples <= 7579000){
                                // render image at full res
                                promises.push(util.reduceCube(rawCube, cubeObj.name, 1,
                                    cubeObj.logFlag,cubeObj.userId + ".log"));
                            }
                            // if the new dimensions is more than the max dimensions
                            else{
                                // render image at max res
                                // cast the image into the max res
                                if(lines * samples > 7579000){
                                    scaleFactor = (samples > lines) ? samples/max : lines/max;
                                    promises.push(util.reduceCube(rawCube, cubeObj.name, scaleFactor,
                                        cubeObj.logFlag, cubeObj.userId + ".log"));
                                }
                                else{
                                    // render at full res
                                    promises.push(util.reduceCube(rawCube, cubeObj.name, 1,
                                        cubeObj.logFlag,cubeObj.userId + ".log"));
                                }
                            }
                        }
                        
                        Promise.all(promises).then(function(cubeName){
                            // if function resolved with a return
                            if(cubeName.length > 0){
                                // set the name to the returning cube
                                cubeObj.name = cubeName[0];
                            }
                            // reset promise array
                            promises = [];

                            // get the cube name with no loading tag
                            var logCubeName = util.getRawCube(cubeObj.name, cubeObj.userNum);
                            
                            // make promise on the isis function call
                            promises.push(util.makeSystemCalls(cubeObj.name,
                                path.join('.','uploads',cubeObj.name),
                                path.join('.','pvl',cubeObj.name.replace('.cub','.pvl')),
                                'images',
                                cubeObj.logFlag,
                                cubeObj.userId + ".log",
                                logCubeName)
                            );
                        
                            // when isis is done read the pvl file
                            Promise.all(promises).then( function(){
                                //reset promises array
                                promises = [];
                                // if the log flag is true log the end of the ISIS calls
                                if(cubeObj.logFlag){
                                    util.endProcessRun(cubeObj.userId + ".log");
                                }
                                
                                // make new promise on the data extraction functions
                                promises.push(util.readPvltoStruct(cubeObj.name));

                                // when the readPvltoStructf function resolves create data instance
                                Promise.all(promises).then(function(cubeData){
                                
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

                                    // create or update data instance
                                    if(memArray.length === 0){
                                        // create the new instance and add it to the array
                                        var newMem = new Memory(cubeObj.userNum);

                                        newMem.userId = cubeObj.userId;
                                        newMem.lastRequest = Date.now();

                                        memArray.push(newMem);
                                    }
                                    else{
                                        // add memory instance if user id is not in the array already
                                        if( Memory.prototype.checkMemInstances( cubeObj.userId, memArray)){
                                            Memory.prototype.accessMemory(cubeObj.userId, memArray).updateDate();
                                        }
                                        else{
                                            // create the new instance and add it to the array
                                            var newMem = new Memory(cubeObj.userNum);

                                            newMem.userId = cubeObj.userId;
                                            newMem.lastRequest = Date.now();

                                            memArray.push(newMem);
                                        }
                                    }

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
                                }
                                else{
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
                            }
                            else{
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
                }
                else{
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
    let cubeObj = util.getObjectFromArray(request.cookies['puiv'],cubeArray);

    try{
        Memory.prototype.accessMemory(request.cookies["puiv"], memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }

    // if the user object is found
    if(typeof(cubeObj) === "object"){
        // send the image associated with user
        response.download(path.join('csv',cubeObj.name.replace('.cub','.csv')),function(err){
            if(err){
                console.log('file was not sent');
            }
            else{
                // file sent
                response.status(200);
                response.end();
            }
        });
    }
    else{
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

    let userId = request.cookies['puiv'];

    try{
        Memory.prototype.accessMemory(userId, memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }

    if(userId === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');
    }
    else{
        // return the index if not found
        let userObject = util.getObjectFromArray(userId,cubeArray);

        if(typeof(userObject)!=="number"){
            response.download(path.join('csv',userObject.name.replace('.cub','.csv')),function(err){
                if(err){
                    console.log('file was not sent');
                }
                else{
                    // file sent
                    response.status(200);
                    response.end();
                }
            });
        }
        else{
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

    var userid= request.cookies['puiv'];

    try{
        Memory.prototype.accessMemory(userid, memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }

    if(userid === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=7');
    }
    else{
        // get the user instance
        let userObject = util.getObjectFromArray(userid,cubeArray),
            data = userObject.impData;

        // if no error code
        if(typeof(userObject)==="object"){
            // get image name
            let image = util.getimagename(userObject.name, 'png');
            imagepath = 'images/' + image;
            

            // get resolution value
            var resolution = util.getPixelResolution(userObject);

            var w,
                h;
            // get the cube dimensions 
            userObject.getCubeDimensions()
            .then(dimensions => {
                // capture dimensions in local vars
                dimensions = JSON.parse(dimensions);

                w = dimensions.w;
                h = dimensions.h;

                // check and calculate user dimensions if needed
                if(userObject.userDim[0] === -1){
                    // if dimension needs to be auto generated
                    // calculate the scale factor
                    let factor = userObject.userDim[1]/h;
                    // set the output dimensions
                    userObject.userDim = [w*factor,userObject.userDim[1]];
                }
                else if(userObject.userDim[1] === -1){
                    // get scale factor
                    let factor = userObject.userDim[0]/w;
                    // set output dimensions
                    userObject.userDim = [userObject.userDim[0],h*factor];
                }
    
                // set render variables
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
                        }
                        else if(b >= 0.35){
                            b = 2;
                        }
                        else if(b<.05){
                            a -= 1;
                            b = 5;
                        }
                        else{
                            b=1;
                        }
    
                        var scalebarMeters = b*Math.pow(10,a);
    
                        var scalebarLength,
                            scalebarUnits="";
                        // if the length is less than 1KM return length in meters
                        if(imageMeterWidth/1000 < 1){
                            scalebarLength = scalebarMeters;
                            var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)));
                            scalebarUnits = "m";
                        }
                        else{
                            scalebarLength = scalebarMeters/1000;
                            var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)/1000));
                            scalebarUnits = "km";
                        }
    
                        // render image page with needed data
                        if(isWindows){ imagepath = imagepath.replace("\\","/"); }

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
                        }
                        else{
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
                    }
                    else{
                        console.log("Image Width in Meters Failed to Calculate");
                    }
                }
                else{
                    // render image page with needed data
                    if(isWindows){ imagepath = imagepath.replace("\\","/");}
                    if(userDim!== undefined && userDim[0] !== 0 && userDim[1] !== 0) {
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
                    }
                    else{
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
        else{
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
    var uid = request.cookies['puiv'],
        userObject,
        imagepath,
        data,
        resolution;

    try{
        Memory.prototype.accessMemory(uid, memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }
    
    if(uid !== undefined){
        // get image name and path
        userObject = util.getObjectFromArray(uid, cubeArray);

        if(typeof(userObject) === "object"){
            let image = util.getimagename(userObject.name, 'png');
            imagepath = 'images/' + image;
    
            // if the data val is an error code then fail
            if(userObject < 1){
                data = 'NONE';
            }
            else{
                // get resolution value
                var resolution = util.getPixelResolution(userObject);
    
                // otherwise load the important data from the active object array into data variable
                data = userObject.impData;
            }
        } 
    }
    else{
        // image path could not be found
        imagepath = 'none';
    }

   if(imagepath === 'none' || typeof(userObject)!== "object"){
       response.redirect("/?alertCode=4");
       return response.end();
   }
   else{
        var w,
            h;
        
        // get user dimensions of cube
        userObject.getCubeDimensions()
        .then(dimensions => {
            // save dimensions into local variables
            dimensions = JSON.parse(dimensions);
            w = dimensions.w;
            h = dimensions.h;

            // check and calculate user dimensions if needed
            userObject.userDim = util.setImageDimensions([w,h],userObject.userDim);

            // set variables for ejs rendering
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
                    }
                    else if(b >= 0.35){
                        b = 2;
                    }
                    else if(b<.05){
                        a -= 1;
                        b = 5;
                    }
                    else{
                        b=1;
                    }

                    var scalebarMeters = b*Math.pow(10,a);

                    var scalebarLength,
                        scalebarUnits="";
                    // if the length is less than 1KM return length in meters
                    if(Number(imageMeterWidth)/1000 < 1.5){
                        scalebarLength = scalebarMeters;
                        var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)));
                        scalebarUnits = "m";
                    }
                    else{
                        scalebarLength = scalebarMeters/1000;
                        var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)/1000));
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
                    }
                    else{
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
                }
                else{
                    console.log("Image Width in Meters Failed to Calculate");
                }
            }
            else{
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
                }
                else{
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

/**
 * This will be the link where the pow pipeline can be implimented
 */
app.post("/pow",function(request, response){
    // TODO: POW connection link
    var id = request.cookies["puiv"];

    // recieve a file that tells what to do:
        // what file to use
        // include icons? (T or F)
        // icon locations
        // output type of image
        // log output (T or F)
});


/**
 * POST '/impDataUpdate' handler
 * 
 * changes the impData of the user instance
 */
app.post("/impDataUpdate", function(request, response){
    console.log(request.url);

    var newData = JSON.parse(request.body.data),
        userObject = util.getObjectFromArray(request.cookies["puiv"], cubeArray);

    if(newData !== userObject.impData){
        userObject.impData = newData;
    }

    response.send("SUCCESSFULLY UPDATED").status(200);
});


/**
 * GET "/getData" handler
 * 
 * send that important data to the client
 */
app.get("/getData", function( request, response){
    console.log(request.url);
    var id = request.cookies["puiv"],
        userObject = util.getObjectFromArray(id, cubeArray);

    response.send(JSON.parse(userObject.impData));
});


/**
 * GET '/figureDownload 
 * 
 * handler for downloading a tiff, jpg, jpeg or png image from the server
 */
app.post("/figureDownload", async function(request, response){
    console.log(request.url);
    // get the filename that the user entered
    var filename = request.body.downloadName,
        fileExt = filename.split(".")[filename.split(".").length - 1];
    
    try{
        Memory.prototype.accessMemory(request.cookies["puiv"], memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }
    // set response header
    response.header("Cache-Control", "max-age=0");

    // save the file in the form data to the server so it can be read
    request.files.upl.mv("./tmp/" + request.files.upl.name,
    async (err) => {
        if(err){
            console.log("Conversion Error: " + err);
        }
        else{
            if(fileExt === "png" || fileExt === "jpg" || fileExt === "jpeg"){
                // use sharp Module to convert to png from data buffer
                await sharp(fs.readFileSync("./tmp/" + request.files.upl.name))
                .png()
                .toFile(path.join("tmp",filename),function(err, info){
                    if(err){
                        console.log("Sharp Error: " + err);
                    }
                    else{
                        response.download(path.join("tmp",filename),function(err){
                            if(err){
                                console.log("Download Error: " + err);
                            }
                            else{
                                // remove the files from temp
                                fs.unlinkSync(path.join("tmp",request.files.upl.name));
                                fs.unlinkSync(path.join("tmp",filename));
                            }
                        });
                    }
                }).end();
            }
            else{
                // Otherwise it will be a tiff
                // use sharp Module to convert to tiff from data buffer
                await sharp(fs.readFileSync("./tmp/" + request.files.upl.name))
                .tiff()
                .toFile(path.join("tmp",filename),function(err, info){
                    if(err){
                        console.log("Sharp Error: " + err);
                    }
                    else{
                        response.download(path.join("tmp",filename),function(err){
                            if(err){
                                console.log("Download Error: " + err);
                            }
                            else{
                                // remove files from tmp
                                fs.unlinkSync(path.join("tmp",request.files.upl.name));
                                fs.unlinkSync(path.join("tmp",filename));
                            }
                        });
                    }
                }).end();
            }
        }
    });    
});

/**
 * '/resizeFigure' handler
 * 
 * resize cubes and return them to the imageEditor
 */
app.post("/resizeFigure",function(request, response){
    console.log(request.url);

    // user id, and the new figure width and height
    var id = String(request.body.id),
        newWidth = parseInt(request.body.w),
        newHeight = parseInt(request.body.h),
        promises = [],
        origCube,
        max = 2725;

    var userObject = util.getObjectFromArray(id, cubeArray);
    var rawCube = util.getRawCube(userObject.name,userObject.userNum);

    try{
        Memory.prototype.accessMemory(id, memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }

    // make sure string only contains digets and it is a proper length
    if(/[\S\d]{23}$/gm.test(id) && id.length === 23){
        // if the user object is found
        if(typeof(userObject) === "object"){
            let workingCube = userObject.name.replace("r-", "u-");

            if(workingCube !== userObject.name){
                origCube = userObject.name;
                userObject.name = workingCube;
            }

            // get the origional cube dimensions
            userObject.getCubeDimensions().then((dimensions) => {
                dimensions = JSON.parse(dimensions);

                var rawW = dimensions.w,
                    rawH = dimensions.h;


                // scaleFactor is the factor that it takes to shrink the lowest dimension to the new dimension
                scaleFactor = (rawW <= rawH) ? rawH/newHeight : rawW/newWidth;

                // image is bigger than the desired figure size
                if(scaleFactor > 1){
                    // if the new dimensions is less than the minimum and image is larger than new dimensions
                    if(newWidth * newHeight <= 7579000){
                        promises.push(util.reduceCube(rawCube, userObject.name, scaleFactor,
                            userObject.logFlag,userObject.userId + ".log"));
                    }
                    else{
                        // new figure size is large than max
                        if(rawH * rawW > 7579000){
                            scaleFactor = (rawW > rawH) ? rawW/max : rawH/max;
                            promises.push(util.reduceCube(rawCube, userObject.name, scaleFactor,
                                userObject.logFlag,userObject.userId + ".log"));
                        }
                        else{
                            // render at full res
                            promises.push(util.reduceCube(rawCube, userObject.name, 1,
                                userObject.logFlag,userObject.userId + ".log"));
                        }
                    }
                    
                }
                else{
                    // image is smaller than desired figure size
                    // if the new dimensions is less than the max
                    if(rawH * rawW <= 7579000){
                        // render image at full res
                        promises.push(util.reduceCube(rawCube, userObject.name, 1,
                            userObject.logFlag,userObject.userId + ".log"));
                    }
                    // if the new dimensions is more than the max dimensions
                    else{
                        // render image at max res
                        // cast the image into the max res
                        if(rawH * rawW > 7579000){
                            scaleFactor = (rawW > rawH) ? rawW/max : rawH/max;
                            promises.push(util.reduceCube(rawCube, userObject.name, scaleFactor,
                                userObject.logFlag,userObject.userId + ".log"));
                        }
                        else{
                            // render at full res
                            promises.push(util.reduceCube(rawCube, userObject.name, 1,
                                userObject.logFlag,userObject.userId + ".log"));
                        }
                    }
                }

                if(promises){
                    Promise.all(promises).then(() =>{
                        // change name back
                        if(origCube){
                            userObject.name = origCube;
                        }
                        promises = [];

                        // get the cube name with no loading tag
                        var logCubeName = util.getRawCube(userObject.name, userObject.userNum);

                        // make promise on the isis function call
                        promises.push(util.makeSystemCalls(userObject.name,
                            path.join('.','uploads', userObject.name),
                            path.join('.','pvl',userObject.name.replace('.cub','.pvl')),
                            'images',
                            userObject.logFlag,
                            userObject.userId + ".log",
                            logCubeName));

                        // when isis is done read the pvl file
                        Promise.all(promises).then(function(){
                            //reset promises array
                            promises = [];
                            // if the log flag is true log the end of the ISIS calls
                            if(userObject.logFlag){
                                util.endProcessRun(userObject.userId + ".log");
                            }
                            
                            // make new promise on the data extraction functions
                            promises.push(util.readPvltoStruct(userObject.name));

                            // when the readPvltoStructf function resolves create data instance
                            Promise.all(promises).then(function(cubeData){
                            
                                // add the cube instance to the cube array if it does not already exist
                                cubeArray = util.addCubeToArray(userObject,cubeArray);
                            
                                // save data to object using setter in class
                                userObject.data = JSON.parse(cubeData);
                                
                                // obtain the data for the important tags
                                var impDataString = util.importantData(userObject.data, importantTagArr);

                                // save the important data values to object using setter
                                userObject.impData = JSON.parse(impDataString);
                                
                                // get the csv string
                                let csv = util.getCSV(userObject.data);

                                // get name of csv and write it to the csv folder
                                let csvFilename = userObject.name.replace('.cub','.csv');

                                // write the csv data to the file
                                fs.writeFileSync(path.join('csv',csvFilename),csv,'utf-8');
                
                                // send response
                                response.sendFile(
                                        path.join(__dirname, "images", util.getimagename(userObject.name, "png"))
                                    );
                            
                            }).catch(err => {
                                console.log(err);
                            });
                            
                        }).catch((err)=>{
                            console.log("Error Here: " + err);
                        });
                    });
                }
            });
        }
        else{
            // user object was not found on server
            console.log("userobject not found");
        }  
    }
});


/**
 * "/evalScalebar" post handler
 * 
 * check and update the scalebar dimensions when requested
 */
app.post("/evalScalebar", function(request, response){
    console.log(request.url);

    var userObject = util.getObjectFromArray(request.body.id, cubeArray),
        w,
        h;
    
    // get resolution value
    resolution = util.getPixelResolution(userObject);

    userObject.getCubeDimensions().then(dimensions => {
        // save dimensions into local variables
        dimensions = JSON.parse(dimensions);
        w = dimensions.w;
        h = dimensions.h;

        // check and calculate user dimensions if needed
        userObject.userDim = util.setImageDimensions([w,h],userObject.userDim);

        // set variables for ejs rendering
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
                }
                else if(b >= 0.35){
                    b = 2;
                }
                else if(b < .05){
                    a -= 1;
                    b = 5;
                }
                else{
                    b = 1;
                }

                var scalebarMeters = b*Math.pow(10,a);

                var scalebarLength,
                    scalebarUnits="";
                // if the length is less than 1KM return length in meters
                if(Number(imageMeterWidth)/1000 < 1.5){
                    scalebarLength = scalebarMeters;
                    var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)));
                    scalebarUnits = "m";
                }
                else{
                    scalebarLength = scalebarMeters/1000;
                    var scalebarPx = parseInt(scalebarLength / (parseFloat(resolution)/1000));
                    scalebarUnits = "km";
                }
            }
        }

        // send response to the server as data to handle in the callback
        if(scalebarLength){
            response.send(
                {
                    scalebarLength: scalebarLength,
                    scalebarPX: scalebarPx,
                    scalebarUnits: scalebarUnits,
                    origW: w,
                    origH: h,
                    isMapProjected: isMapProjected,
                    rotationOffset: rotationOffset
                }).status(200);
        }
        else{
            response.send(
                {
                    scalebarLength: 'none',
                    scalebarPX: 'none',
                    scalebarUnits: scalebarUnits,
                    origW: w,
                    origH: h,
                    isMapProjected: isMapProjected,
                    rotationOffset: rotationOffset
                }).status(200);
        }
    });

});


/**
 * '/*' catch all unknown routes
 * 
 * This is a 404 http catch all
 */
app.get("*",function(request, response){
    
    try{
        Memory.prototype.accessMemory(request.cookies["puiv"], memArray).updateDate();
    }
    catch(err){
        // no instance was found
    }
    // render a 404 error in the header and send the 404 page
    response.status(404).render("404.ejs");
});


/* activate the server */
// listen on some port
// FOR TESTING ONLY!!! should be 'const PORT = process.env.PORT || 8080;'
const PORT = 8080 || process.env.PORT;

// localhost listening on 8000
app.listen(8000);
// serving machines on either open or closed network
app.listen(PORT,"0.0.0.0");

// interval function to check and erase memory from the server that has not been accessed in 8 hours
var interval = function() {
    console.log("\nMemory Analysis Running");

    // check al dates at once
    memArray = Memory.prototype.checkAllDates(memArray);

    // if the array is empty
    if(memArray.length === 0){
        // reset the cube array
        cubeArray = [];
    }
    else{
        // otherwise parse through both arrays checking each cube against all memory instances
        for(var i = 0; i < cubeArray.length; i++){
            for( var j = 0; j < memArray.length; j++){
                if(cubeArray[i].userId === memArray[j].userId){
                    // do nothing
                    break;
                }
                else{
                    // remove the cube data if it is not found
                    if(j === memArray.length - 1){
                        cubeArray.slice(i, 1);
                    }
                }
            }
        }
    }
    console.log("End Memory Analysis\n");
}
// set the memory managment system to check instances every 8 hours
setInterval(interval, 28800000);

// tell console status and port #
console.log("Server is running and listen for outer connections on port " 
+ PORT + "\n http://" + os.hostname() + ":8080/");
console.log("Server is running and listen locally on port " + 8000 + "\n http://localhost:8000/");