/**
 * @file server.js 
 * @alias server
 * @run node server 
 * 
 * @author Chadd Frasier
 * @version 2.4.5
 * @description This is the driver for the Caption Writer server by USGS.
 * 
 * Date Created: 05/31/19
 * Last Modified: 07/25/19
 *
 * @todo 1 unit test all componets
 * 
 *     
 * @todo 4 get image page working again
 * 
 * TODO: simplify the object code
 * @requires ./util.js {this needs to be in root of application because of ISIS Commands}
 * @requires ./js/cubeObj.js
 * 
 * Note: This server is only capable of running on a linux or mac operating systems
 */

 /** READ ME BEFORE EDITING
  * @fileoverview   07/17/19 
  * 
  *       Promises were used to let the appication work in a Syncronous manner which javascript is not build for. The data
  *     extraction and object creation should not be changed for this reason. If it is changed then the functions could
  *     be processed in the improper order and using Promises allows for exec calls to be remerged.
  *     
  *       Cookies are used to keep track of user file uploads and subsequent data responses. The user will recieve
  *     live notifications when files fail to upload and it will inform user of the issue that the server 
  *     is facing from their attemped upload. Cookies are very important as that is how we will be able to find the correct
  *     data in the instance array.
  * 
  *       Instances of cubeObjects will be saved into an array that the server holds so when a user moves to another page they will recieve
  *     the correct data from the server.
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

/* app.use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
}); */
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


try{
    exec('rm ./images/*.pgw');
    exec('rm ./pvl/*.pvl');
    exec('rm ./csv/*.csv');
    exec('rm ./print.prt');    
}
catch{
    console.log('file not found');
}


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
    
    // TODO: windows can't use the exec call
        // maybe create an admin reset function that cleans the server
    
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
 * if no cookie can be found then fail
 */
app.get('/upload',function(request,response){
    console.log(request.path);

    var cookieval = request.cookies['cubeName'];

    if(cookieval === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=4');

    }else{
        console.log('cookie found: its value is: ' + cookieval);
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
            // throw the error if needed
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
    
    // for testing only
    console.log('=================== New Upload ========================');

    // cube file section
    try{
        if(request.files == null ){
            // if no files uploaded
            console.log('User Error Upload a Cube File to begin');
            // redirect the user & alert they need a .cub
            response.redirect('/?alertCode=3');
            // end the response
            response.end();
        }
        // cube (.cub) file regexp
        else if(/^.*\.(cub|CUB)$/gm.test(request.files.uploadFile.name)){
           
            // get the file from request
            var cubeFile = request.files.uploadFile;
            
            // create promises array for syncronous behavior
            let promises = [];


            // get correct cube object
            if(request.cookies['userId'] === undefined || cubeArray.length === 0){
                var cubeObj = new Cube('u-' + numUsers + cubeFile.name, numUsers++); 
                
            }else{
                for(i in cubeArray){
                    console.log(cubeArray[i]);
                    if(cubeArray[i].userId === parseInt(request.cookies['userId'])){
                        cubeArray[i].name = 'u-' + cubeArray[i].userId + cubeFile.name;
                        cubeObj = cubeArray[i];
                        break;
                    }
                }
            }


            // save the cube upload to upload folder
            cubeFile.mv('./uploads/' + cubeObj.name , function(err){
                // report error if it occurs
                if(err){
                    console.log('This Error could have been because "/uploads" folder does not exist');
                    return response.status(500).send(err);
                }
            });

            // create the cookie instance for the user
            response.cookie('cubeFile', cubeObj.name, {expires: new Date(Date.now() + 1000000), httpOnly: true});
            response.cookie('userId', cubeObj.userId, {expires: new Date(Date.now() + 1000000), httpOnly: true}); 



            // make promise on the isis function calls
            promises.push(util.makeSystemCalls(cubeObj.name,
                path.join('.','uploads',cubeObj.name),
                   path.join('.','pvl',cubeObj.name.replace('.cub','.pvl')),
                   'images'));
              
            
            // when isis is done read the pvl file
             Promise.all(promises).then(function(){
                //console.log('server heard back from ISIS');
                //reset promises array
                promises = [];

                // make new promise on the data extraction functions
                promises.push(util.readPvltoStruct(cubeObj.name));

                // when the readPvltoStructf function resolves create data instance
                Promise.all(promises).then(function(cubeData){
                    console.log('server got data: \n' + cubeObj);
                
                    // add the cube instance to the cube array if it does not already exist
                    cubeArray = util.addCubeToArray(cubeObj,cubeArray);

                    console.log(cubeArray);
                   
                    // save data to object using setter in class
                    cubeObj.data = JSON.parse(cubeData);
                    
                    // read the config file to get only important tags for webpage
                    let importantTagArr = util.configServer(fs.readFileSync(
                        path.join('.','cfg', 'config1.cnf'), {encoding: 'utf-8'}));

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

                    // get name of possible output
                    let txtFilename = cubeObj.name.replace('.cub','_Orion_caption.txt');

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
                    response.write('<html>HORRIBLE ERROR</html>');
                });
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
        console.log('Fatal Error Occured');
        console.log(err);
        // alert 4 which should never happen in a successful run
        response.redirect('/?alertCode=4');
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
    response.download(path.join('csv',request.cookies['cubeFile'].replace('.cub','.csv')),function(err){
        if(err){
            console.log('file was not sent successfully');
        }else{
            // file sent
            response.end();
        }
    });
});

/**
 * POST '/imageDownload'
 * 
 *  this post function is only for sending the basic image to the user as a download  
 */
app.post('/imageDownload', function(request,response){
    // send download file
    response.download(path.join('images',request.cookies['cubeFile'].replace('.cub','.png')),function(err){
        if(err){
            console.log('file was not sent successfully');
        }else{
            // file sent
            response.end();
        }
    });
});



/**
 * if no cookie can be found then fail
 */
app.get('/csv', function(request, response){
    console.log(request.path);

    var cookieval = request.cookies['cubeName'];

    if(cookieval === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=4');

    }else{
        console.log('cookie found: its value is: ' + cookieval);
    }
});


/**
 * if no cookie can be found then fail
 */
app.get('/imageDownload', function(request, response){
    console.log(request.path);

    var cookieval = request.cookies['cubeName'];

    if(cookieval === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=4');

    }else{
        console.log('cookie found: its value is: ' + cookieval);
    }
});


/**
 * if no cookie can be found then fail
 */
app.get('/showImage', function(request, response){
    console.log(request.path);

    var cookieval = request.cookies['cubeName'];

    if(cookieval === undefined){
        // send response w/ all variables
        response.redirect('/?alertCode=4');

    }else{
        console.log('cookie found: its value is: ' + cookieval);
    }
});



/**
 * POST '/showImage'
 * 
 * renders the image page with needed data
 */
app.post('/showImage', function(request, response){
    //TODO: image page
    console.log(request.path);

    // prepare variables 
    var cookieval = request.cookies['cubeFile'];
    var imagepath;
    var data;

    if(cookieval != undefined){
        // get image name and path
        let image = util.getimagename(cookieval, 'png');
        imagepath = 'images/' + image;

        // search for data in array given by user cookie
        data = util.getObjectFromArray(cookieval, cubeArray);

        // if the data val is an error code then fail
        if(data < 1){
            console.log('Object Serch Failed');
            data = 'NONE';
        }else{
            // otherwise load the important data from the active object array into data variable
            data = data.impData;
        }
    }else{
        // image path could not be found
        imagepath = 'none';
    }
    var w;
    var h;
    jimp.read(imagepath).then(function(img){
        w = img.bitmap.width;
        h = img.bitmap.height;
        // render image page with needed data
        if(isWindows){ imagepath = imagepath.replace("\\","/");}
        response.render("imagePage.ejs", {image:imagepath, tagField: data,
            w: w, h: h});
    }).catch(function(err){
        console.log(err);
    });
});



app.get('/crop',async function(request, response){
    console.log(request.url + 'from GET');

    var currentImage = request.query.currentImage;
    var cookieval = request.cookies['cubeFile'];
    var baseImg = util.findImageLocation(cookieval.replace('.cub','.png'));
    var newImage;

      // search for data in array given by user cookie
      data = util.getObjectFromArray(cookieval, cubeArray);

    if(currentImage.split('_').length === 2){
        // remove current file
        await fs.unlinkSync(currentImage.split('?')[0]);

        // get new Image b/c we know its a default
        newImage = util.findImageLocation(cookieval);

        console.log("undo to : " + newImage);
        // render with variables
        var w;
        var h;
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
    else if(currentImage.split('_').length > 2){
        if(currentImage !== baseImg){
            console.log('current image is: ' + currentImage);
            await fs.unlinkSync(currentImage.split('?')[0]);
        }
        
        let imageLink = currentImage.split('?')[0];
        // split name on underscore
        let strArray = imageLink.split('_');

        // second to last string
        strArray[strArray.length - 2] += '.' + strArray[strArray.length-1].split('.')[strArray[strArray.length-1].split('.').length - 1];
        strArray.pop();

        newImage = strArray.join('_');

        console.log(newImage + ' image after undo');
        
    
        if(newImage.split("/")[1] === cookieval.replace('.cub','.png')){
            var w;
            var h;
            jimp.read(baseImg).then(function(img){
                w = img.bitmap.width;
                h = img.bitmap.height;
                // render image page with needed data
                if(isWindows){ baseImg = baseImg.replace("\\","/");}
                response.render("imagePage.ejs", {image:baseImg, tagField: data, w: w, h: h});
                response.end();
            }).catch(function(err){
                console.log(err);
            });
        }else{
            var w;
            var h;
            jimp.read(newImage).then(function(img){
                w = img.bitmap.width;
                h = img.bitmap.height;
                // render image page with needed data
                if(isWindows){ newImage = newImage.replace("\\","/");}
                response.render("imagePage.ejs", {image:newImage, tagField: data, w: w, h: h});
                response.end();
            }).catch(function(err){
                console.log(err);
            });
        }
    }
    else{
        var w;
        var h;
        jimp.read(cookieval).then(function(img){
            w = img.bitmap.width;
            h = img.bitmap.height;
            // render image page with needed data
            if(isWindows){newImage = newImage.replace("\\","/");}
            response.render("imagePage.ejs", {image:cookieval, tagField: data, w: w, h: h});
            response.end();
        }).catch(function(err){
            console.log(err);
        });
    }
});


app.post('/crop', async function(request,response){
    console.log(request.url);

    let arrayString = request.query.cropArray;
    let pxArray = arrayString.split(',');
    var croppedImage = request.query.currentImage.split('?')[0];
    var cookieval = request.cookies['cubeFile'];

    // search for data in array given by user cookie
    var data = util.getObjectFromArray(cookieval, cubeArray);
    // if the data val is an error code then fail
    if(data < 1){
        console.log('Object Search Failed');
        data = 'NONE';
    }else{
        // otherwise load the important data from the active object array into data variable
        data = data.impData;
    }
    // set header to html
    response.setHeader("Content-Type", "text/html","charset=utf-8");

    if(croppedImage === util.findImageLocation(cookieval)){

        var imageLocation = croppedImage;

        console.log('image location is: ' + imageLocation);

        pxArray = util.calculateCrop(pxArray);

        await util.cropImage(imageLocation, pxArray).then( async function(newImage){
          
            if(isWindows){newImage = newImage.replace("\\","/");}
            response.render('imagePage.ejs',{image:newImage + '?t='+ performance.now() , tagField: data, h: pxArray[3], w: pxArray[2]});
        });

    }
    else{
        pxArray = util.calculateCrop(pxArray);
        imageLocation = util.parseQuery(croppedImage);

        
        await util.cropImage(imageLocation, pxArray).then( async function(newImage){
            if(isWindows){newImage = newImage.replace("\\","/");}
            response.render('imagePage.ejs',{image:newImage + '?t='+ performance.now() , tagField: data, h: pxArray[3], w: pxArray[2]});
        });

    }
});


//TODO this will change alot in the near future
app.post('/addIcon', async function(request,response){
    console.log(request.url);

    var imageUrl = request.query.imageLink;
    var coordinates = request.query.coordinates;
    var cookieval = request.cookies['cubeFile'];
    var baseImg = cookieval.replace('.cub','.png');

    console.log(baseImg);


    // search for data in array given by user cookie
    var data = util.getObjectFromArray(cookieval, cubeArray);
    // if the data val is an error code then fail
    if(data < 1){
        console.log('Object Search Failed');
        data = 'NONE';
    }else{
        // otherwise load the important data from the active object array into data variable
        data = data.impData;
    }

    // TESTING THE ICON FUNCTION USING A LINK SOLUTION
    console.log(imageUrl + ' at the coordanates -> ' + coordinates);

    var coorArray = coordinates.split(',');
    newImage = await util.superImposeIcon(imageUrl, 'images/north.png', parseInt(coorArray[0]), parseInt(coorArray[1]));

    await jimp.read(newImage).then(function(img){
        console.log(img);
        w = img.bitmap.width;
        h = img.bitmap.height;
        // render image page with needed data
        response.render("imagePage.ejs", {image:newImage, tagField: data, w: w, h: h});
        response.end();
    }).catch(function(err){
        console.log(err);
    });
});



/* activate the server */
// listen on some port
// FOR TESTING ONLY!!! should be 'const PORT = process.env.PORT || 8080;'
const PORT = 8080 || process.env.PORT;
app.listen(PORT);

// tell console status and port #
console.log("Server is running and listen to port " + PORT);
