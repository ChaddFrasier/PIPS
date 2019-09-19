/**
 * Utility JS for PIPS
 * 
 * @author Chadd Frasier
 * @since 06/03/19
 * @update 09/16/19
 * @version 2.5.1
 * @fileoverview 
 *      This is the utility file for The Planetary Image Publication Server  
 * 
 * @see {server.js} Read the header before editing
 * 
 * @todo file loging for isis calls
 */

//TODO: include fs here

// require dependencies
var spawn = require('child_process').spawn;
var path = require('path');
var jimp = require('jimp');
var Promises = require('bluebird');

// exportable functions
module.exports = {

    /**
     * 
     * @param {string} cubeName name of the file for analysis
     * @param {string} filepath the path to said file
     * @param {string} returnPath path to return the values from ISIS3
     * @param {string} imagePath path where the image should be saved
     * @param {boolean} logToFile true or false should the server log to a file
     * 
     * @returns {Promise}
     * 
     * @description calls the isis commands using promises to ensure the processes are finished
     */
    makeSystemCalls: function(cubeName, filepath, returnPath, imagePath, logToFile) {
        return new Promise(function(resolve,reject){
            // array of promises to resolve
            let promises = [];
            // call the isis commands
            promises.push(callIsis(cubeName, filepath, returnPath, imagePath,logToFile));
            
            // when all promises is the array are resolved run this
            Promises.all(promises).then(function(){
                console.log('isis calls finished successfully\n');
                resolve();
            }).catch(function(code){
                if(code === -1){
                    console.log("ISIS IS NOT RUNNING\n");
                    reject(-1);
                }else{
                    console.log('image extraction failed to create image\n');
                    reject();
                }
            });
        });
    },


    /**
     * 
     * @param {string} cubeName name of the cube to be analyzed
     * 
     * @returns {Promise} cube data from the pvl file
     * @returns {object} cubeObject data
     * 
     * @description takes the cube used and runs the pvl data extraction algorithm 
     */
    readPvltoStruct: function(cubeName) {
        return new Promise(function(resolve){
            var promises = [];
            
            // create a promise of the processFile function
            promises.push(processFile(path.join('pvl', cubeName.replace('.cub','.pvl'))));
    
            // this block will pass and run when all isis commands are finished
            Promise.all(promises).then(function(cubeData){
                // return the data
                resolve(cubeData);
            });
        });
    },


    /**
     * 
     * @param {object} cubeObj the current cube object being manipulated
     * 
     * @returns {number|string} returns the value of the pixel resolution values in the cube 
     *                          or -1 if not found
     * 
     * @description extracts the values used to calculate the scale of the image 
     */
    getPixelResolution: function(cubeObj){
        let jsonData = JSON.parse(cubeObj.data);
        
        let resolution = jsonData["IsisCube.Mapping.PixelResolution"];
        
        if(resolution === undefined){
            resolution = jsonData["GroundPoint.ObliquePixelResolution"];
        }

        if(resolution !== undefined){
            return resolution;
        }else{
            return -1;
        }
    },


    /**
     * 
     * @param {string} resStr the resolution of the image in meters/pixel 
     * @param {number} w width of the image to be displayed in pixels
     * 
     * @returns {number} the width of the image in meters
     * 
     * @description attempts to calculate the width of the iimage in pixels and catches failures
     */
    calculateWidth: function(resStr, w){
        let resFloat = parseFloat(resStr);
        if(resFloat){
            return resFloat * w;
        }else{
            return -1;
        }
    },


    /**
     * 
     * @param {number} lengthOfID the length of the output
     * 
     * @returns {string} random id string of length given
     * 
     * @description Produces a random user Id of the given length using [a-z,A-Z,0-9]
     */
    createUserID: function(lengthOfID){
        // all available characters
        let charString = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYXYZ';
        // return arr
        let idArr=[],
        // length of string
        charSetLength = charString.length;

        // for the amount of output characters
        for(i=lengthOfID; i>0; i--){
            // get a random index of a character in the string
            let char = Math.floor(Math.random()*charSetLength);
            // push the character into the array using the calculated index
            idArr.push(charString.charAt(char));
        }
        // once all charcters added 
        // join the array and return
        return idArr.join("");
    },


    /**
     * 
     * @todo log to file if needed else log to console
     * 
     * @param {string} tiffName name of the tiff to be converted to a .cub
     * @param {boolean} logToFile true or false should the server log to a file
     * 
     * @returns {Promise}
     * @returns {string} name of the cube that was converted
     * 
     * @description converts tiff to cube for later processing 
     * 
     * @todo this will need a log to file flag
     */
    tiffToCube: function(tiffName, logToFile) {
        return new Promise(function(resolve, reject){
            // variables for proper isis call
            var isisCall = 'std2isis';
            
            var cubeName = tiffName.replace(".tif",".cub");
         
            console.log('running std2isis\n');
            var std2isis = spawn(isisCall,['from=',tiffName,"to=",cubeName]);

            std2isis.stdout.on('data', function(data){
                console.log('stdout: ' + data.toString() + "\n");
            });


            std2isis.stderr.on('data', function(data){
                console.log(isisCall + ' Error: ' + data.toString() + "\n");
            });

            std2isis.on('exit',function(code){
                console.log(isisCall + ' Exited with code: ' + code + "\n");

                if(code === 0){
                    console.log('std2isis finised successfully \n');
                    resolve(cubeName);
                }
                else{
                    reject(isisCall + 'Error: ' + code.toString() + "\n");
                }
                
            });

            std2isis.on("error",function(err){
                console.log("std2isis Failed: -1\n");
                reject(-1);
            });
        });
    },


    /**
     * @function reduceCube
     * 
     * @param {string} cubeName the name of the cube file to reduce
     * @param {number} scaleFactor the factor to reduce by (4 = 1/4th actual size) 
     *
     * @description shrink the size of the cube file using isis3 reduce function 
     */
    reduceCube: function(cubeName, scaleFactor, logToFile){
        return new Promise(function(resolve, reject){
            console.log("Reduce the file: " + cubeName + " by a factor of " + scaleFactor);

            var isisCall = "reduce";
            var from = path.join(".","uploads",cubeName);
            var to = path.join(".","uploads",cubeName.replace("u-","r-"));

            var reduceCall = spawn(isisCall, ['from=',from,"to=",to,
                                            "sscale=",scaleFactor,"lscale=",scaleFactor]);


            reduceCall.stderr.on("data",function(data){
                console.log(isisCall + " Error: " + data.toString() + "\n");
            });


            reduceCall.stdout.on("data",function(data){
                console.log(isisCall + " stdout: " + data.toString() + "\n");
            });


            reduceCall.on("exit",function(code){
                console.log(isisCall + ' Exited with code: ' + code + "\n");

                if(code === 0){
                    resolve(cubeName.replace("u-","r-"));
                }
                else{
                    reject(isisCall + 'Error: ' + code.toString() + "\n");
                }
            });

            reduceCall.on("error",function(err){
                console.log("std2isis Failed: -1\n");
                reject(-1);
            });
        });
    },
    

    /**
     * 
     * @param {string} cubeName name of users cube 
     * @param {number} userNum the number given to the user by the server
     * 
     * @returns {string} the name of the cube the user uploaded
     * 
     * @description removed the added u-# tag based on the users' instance number
     */
    getRawCube: function(cubeName, userNum){
        if(cubeName.indexOf("u-" + userNum) > -1){
            return cubeName.split("u-" + userNum)[1]; 
        }else{
            return cubeName.split("r-" + userNum)[1]; 
        }
        
    },


    /**
     * 
     * @param {string} cubeData a string version of the raw cube data
     * 
     * @returns {boolean} true if the cube is map projected, false if not
     * 
     * @description looks for map projection group or Mapping group
     */
    isMapProjected: function(cubeData){
        var data = JSON.parse(cubeData);

        for(key in data){
            if(key === "IMAGE_MAP_PROJECTION" || key.indexOf("Mapping") > -1){
                return true;
            }
        }
        return false;
    },


    /**
     * 
     * @param {boolean} isProjected if the image is map projected 
     * @param {string} cubeData stringified cube data to parse if needed 
     * 
     * @returns {number} the rotation value if projected is true or 0 if false
     * 
     * @description this function is to find the offset of the north arrow depending
     *               on if the image is rotated or not
     */
    getRotationOffset: function(isProjected, cubeData){
        if(isProjected){
            let data = JSON.parse(cubeData);
            
            for(key in data){
                if(key.indexOf("MAP_PROJECTION_ROTATION") > -1){
                    return parseFloat(data[key]);
                }
            }
        }

        return 0;
    },


    /**
     * 
     * @param {string} cookieval this variable will be the cookie value of the user
     * 
     * @returns {string} the string path to the base image file
     * 
     * @description this function is used to create the path to the given cube file
     *               image in the images folder 
     */
    findImageLocation: function(cookieval){
        return path.join('images', cookieval.replace('.cub','.png'));
    },


    /**
     * 
     * @param {number array} cropArray click location of the user 
     * 
     * @returns {number array} the array of Numbers needed to crop the image using jimp js
     * 
     * @description this function calculates the height and width of the new image and store
     *              the x,y coordinates (index 0 and 1) and the height and width of the crop
     *              for the jimp function (2 and 3)
     */
    calculateCrop: function(cropArray){
        let start_x = Number(cropArray[0]);
        let start_y = Number(cropArray[1]);

        let width = Number(cropArray[2]) - start_x;
        let heigth = Number(cropArray[3]) - start_y;

        cropArray[2] = width;
        cropArray[3] = heigth;

        return cropArray;
    },


    /**
     * 
     * @param {string} imageLink the path to the image that jimp is going to be cropping
     * @param {number array} cropArray the array of the coordinate that jimp needs in order to crop
     *                       the given image 
     * 
     * @returns {string} the path to the newly created image
     * 
     * @description this function asyncrounously calls the crop function from jimp module and 
     *              awaits for its response befor passing the string back
     */
    cropImage: async function(imageLink,cropArray){
        const cubeImage = await jimp.read(imageLink);
        var returnImage;

        await cubeImage.crop(
                            parseInt(cropArray[0]),
                            parseInt(cropArray[1]),
                            parseInt(cropArray[2]),
                            parseInt(cropArray[3]),
                            function(err){
                                if(err) throw err;
                                returnImage = newImageName(imageLink);

                            }).write(returnImage);
        return returnImage;
    },


    /**
     * 
     * @param {string} newImage path to the image to be analyzed
     * 
     * @returns {number array} the width and height of the image as a Number array
     * 
     * @description uses the jimp module to pull out the width and height of the image in pxls 
     */
    getDimensions: async function(newImage){
        await jimp.read(newImage).then(function(img){
            console.log('fails after READ');
            var w = img.bitmap.width;
            var h = img.bitmap.height;

            console.log("wifdth: " + w + "And height" + h);
            return [w,h];
        });
    },


    /**
     * 
     * @param {object} cubeObj cube object to be added
     * @param {array} cubeArray array of cube objects.
     * 
     * @returns {object array} returns the new array with the value added for just the array 
     *                          if the value is already there
     * 
     * @description  scans through the array and adds the element if it is not already there
     */
    addCubeToArray: function(cubeObj, cubeArray){
        // if the array is empty add object to array
        if(cubeArray.length === 0){
            cubeArray.push(cubeObj);
            return cubeArray;
        }
        else{
            // otherwise check to see if the current cubeObj.name is already in the array
            for(var index = 0; index < cubeArray.length; index++){
                // if yes then just return the same array
                if(cubeObj.userId === cubeArray[index].userId){
                    return cubeArray;
                }
            }
            // cube name not found to add it to the array
            cubeArray.push(cubeObj);
            return cubeArray;
        }
    },


    /**
     * 
     * @param {string} userId user instance to be searched for
     * @param {object array} cubeArray array to be searched
     * 
     * @returns {number} 0 if array is empty
     * @returns {number} -1 if item not found
     * @returns {object}Cube Object that matches findObj
     * 
     * @description retrieves object that is being searched if it can; return 0 if array is empty,
     *              -1 if not found
     */
    getObjectFromArray: function(userId,cubeArray){
        // if the array is empty return 0
        if(cubeArray.length === 0){
            return 0;
        }
        else{
            // otherwise check to see if the findObj is already in the array
            for(var index = 0; index < cubeArray.length; index++){
                // if yes then just return the same array
                if(userId === cubeArray[index].userId){
                    return cubeArray[index];
                }
            }
            // cube name not found
            return -1;
        }
    },


    /**
     * 
     * @param {object string} cubeData the stringify'ed version of the data to be converted
     * 
     * @returns {string} the csv data string
     * 
     * @description converts data from JSON string to csv string
     */
    getCSV: function(cubeData){
        // parse the object for easy looping
        cubeData = JSON.parse(cubeData);
        let csvString = "";

        for(key in cubeData){
            // append the next key value pair to the csv
            csvString += key + ',' + '"' + cubeData[key] + '"' + '\n';
        }
        // return the string
        return csvString;
    },


    /**
     * 
     * @param {string} cfgString the whole config file string
     * 
     * @returns {string array} the important data tags
     * 
     * @description creates and returns an array of tags from the cfg file
     */
    configServer: function(cfgString){
        // break the file data by newline
        let tags = cfgString.split('\n');
        // init important tag array
        var importantTags = [];
        // parse each line of the file and check for <tag>
        for(var i = 0; i < tags.length; i++){
            if(tags[i].indexOf('<tag>') > -1){
                // save the name into the array by erasing the <tag> and trimming blank space
                importantTags.push(tags[i].replace('<tag>','').replace('</tag>','').trim());
            }
        }
        return importantTags;
    },


    /**
     * 
     * @param {object string} cubeFileData stringify'ed version of cube data
     * @param {array} importantTagArr important tags array that need to be filled
     * 
     * @returns {object string} the JSON string of the important data tags
     * 
     * @description takes important tag array and extracts data if it exists returns none otherwise
     */
    importantData: function(cubeFileData, importantTagArr){
        // prepare json object
        cubeFileData = JSON.parse(cubeFileData);
        var impJSON = {};
        // for each tag in the important tag array
        for(tag in importantTagArr){
            // test each data key
            for(key in cubeFileData){
                /* if tag is in key save it into the data object 
                 and break the loop to save time */
                if(key.indexOf(importantTagArr[tag]) > -1){
                    // add the important tags to the JSON element
                    impJSON[importantTagArr[tag]] = cubeFileData[key];
                    break;
                }
                // set none if key not found
                else{
                    impJSON[importantTagArr[tag]] = 'None';
                }
            }
        }
        // stringify the object
        return JSON.stringify(impJSON);
    },


    /**
     * 
     * @param {string} file the path to the file that should be converted into raw base64 data 
     * 
     * @returns {string} a string representing the raw base64 data of the image file
     * 
     * @requires fs
     * 
     * @description takes in a file and reads it using 
     * fileSystem and then uses a buffer to change it into a base64 string
     */
    base64_encode: function(file){
        var fs = require('fs');
        // read binary data
        var bitmap = fs.readFileSync(file);
        // convert binary data to base64 encoded string
        return Buffer.from(bitmap).toString('base64');
    },


    /**
     * 
     * @param {string} base64str the data that need to be written to file
     * @param {string} file the filename to write the data to
     * 
     * @returns {void} 
     * 
     * @requires fs
     * 
     * @description takes in a data string and writes it to the file that is given
     */
    base64_decode: function(base64str, file) {
        var fs = require('fs');
        // create buffer object from base64 encoded string, it is important to tell the
        // constructor that the string is base64 encoded
        var bitmap = Buffer.from(base64str, 'base64');
        // write buffer to file
        fs.writeFileSync(file, bitmap);
        console.log('******** File created from base64 encoded string ********');
    },


    /**
     * 
     * @param {string} cubeName name of the cube file
     * @param {string} format format that the image should be generated to
     *
     * @returns {string} the name of the image to be saved based on cube
     * 
     * @description  takes the file extension off of he cube file and makes it a png.
     */
    getimagename: function(cubeName, format){
        // get an array of peieces of the filename
        let namearr = cubeName.toString().split('.');
        // set the last element of the array to the format specified
        namearr[namearr.length - 1] = format;
        // return the combined new array
        return namearr.join('.');
    },


    /**
     * @param {string} the name of the string that is being parsed by the server
     * 
     * @returns {string} the image name with no time string query attached
     * 
     * @description if there is a query string remove it and return just the name,
     *              otherwise returns the same string
     */
    parseQuery: function(imageName){
        try{return imageName.split('?')[0];}
        catch(err){return imageName;}
    }
};

// -------------------------------------- local functions ---------------------------------------------------
/**
 * 
 * @param {string} testValue  value to check if it a cube hearder keyword
 * 
 * @returns {boolean} true if testValue is a header group word
 * 
 * @description tests if the value is a header for the isis data
 */
var testHeader = function(testValue){
    // set the array of important tags
    let variablearray = ['Object','Group'];
    // test each value
    for(var i = 0; i< variablearray.length; i++){
        if(variablearray[i] == testValue.trim()){
            return true;
        }
    }
    return false;
}


/**
 * 
 * @param {string} name  name of the current tag
 * @param {string} str string to add to the tag
 * 
 * @returns {string} adds the new tag to the long string of tag values
 * 
 * @description combines tags to make keys for JSON object
 */
var combineName = function(name, str=undefined){
    // if str is not defined just return the name trimmed
    if(str == undefined){
        return name.toString().trim();
    }
    else if(name == ''){
        return str.replace(':','-');
    }
    else{
        return (name.toString().trim() + '.' + str.replace(':','-').trim());
    }
}


/**
 * 
 * @param {string} name current name to be shortened by 1 string
 * 
 * @returns {string} the new name of the tags for data parsing
 * 
 * @description removes last added element
 */
var shortenName = function(name){
    // splits the name strig into an array a parts 
    var strarr = name.toString().trim().split('.');

    // if the string has only 1 compenent set it to ''
    if( strarr.length > 1 ){
        // removes the last part of the string
        strarr.pop();
        // rejoin the remaining parts
        return strarr.join('.');
    }
    else{
        return '';
    }
}


/**
 * 
 * @param {string} cubeName name of the cube file 
 * @param {string} filepath path to the cube file on server
 * @param {string} returnPath path to return file on server
 * @param {string} imagePath path to image on server
 * @param {boolean} logToFile true or false should the server log to a file
 *
 * @returns {Promise}
 * @return {number} error codes
 * 
 * @description this function runs all isis commands and populates an array of 
 * promises to ensure the PVL file is full created before processing continues
 */
var callIsis = function(cubeName, filepath, returnPath, imagePath, logToFile){
    return new Promise(function(resolve,reject){
        // variables for proper isis calls
        var isisCalls = ['campt','catlab','catoriglab'];
        var promises = [];

        // TODO: test to see if the logfile for this cube already exists
        if(logToFile){
            createLogFile(cubeName);
        }
        
        // get the filename from interior export 
        var imagename = require(__filename).getimagename(cubeName,'png');

        // run the isis commands
        for(var i=0;i<isisCalls.length;i++){
            // push command calls
            console.log(isisCalls[i] + ' Starting Now\n');
            promises.push(makeIsisCall(filepath, returnPath, isisCalls[i], logToFile));
        }
        // call and push image command
        promises.push(imageExtraction(imagename,filepath,imagePath,logToFile));                       

        // this block will pass and run when all isis commands are finished
        Promise.all(promises).then(function(){
            resolve();
        }).catch(function(code){
            if(code === -1){
                reject(code);
            }else{
                reject();
            }

        });
    });
}


/**
 *  
 * @param {string} cubeName 
 * 
 * @returns {string} the name of the log file
 * 
 * @description this function is meant to initialize a log file using the given cube name
 */
var createLogFile = function(cubeName){

    let logFileName = cubeName.replace(".cub",".log");

     console.log("LOG FUNCTION GOT: " + logFileName);

}


/**
 * 
 * @todo log to output file
 * 
 * 
 * @param {string} imagename name of the image
 * @param {string} filepath path to the cube file on the server
 * @param {string} imagePath path where image should be saved
 * @param {boolean} logToFile true or false should the server log to a file
 * 
 * @returns {Promise}
 * 
 * @description calls the isis image conversion on the given cube
 */
var imageExtraction = function(imagename, filepath, imagePath, logToFile){
    console.log('Running isis2std for image now \n');
    return new Promise(function(resolve,reject){
        // execute the isis2std function
        
        var isis2std = spawn('isis2std',['from=', filepath, "to=", path.join(imagePath,imagename)]);


        isis2std.stdout.on('data', function(data){
            console.log('isis2std stdout: ' + data.toString() + "\n");
        });


        isis2std.stderr.on('data', function(data){
            console.log('isis2std Error: ' + data.toString() + "\n");
        });

        isis2std.on('exit',function(code){
            console.log('isis2std Exited with code: ' + code + "\n");
            if(code === 0){
                resolve();
            }else{
                reject('isis2std Error: ' + code.toString + "\n");
            }
        });

        isis2std.on("error",function(err){
            reject(-1);
        });
        
    });
}


/**
 * 
 * @todo log stdour stderr to log file
 * @todo this will need a log to file flag
 * 
 * @param {string} filepath path to the cube file
 * @param {string} returnPath path to the return pvl
 * @param {string} isisCall isis command that is going to be run
 * @param {boolean} logToFile true or false should the server log to a file
 * 
 * @returns {Promise}
 * 
 * @description makes the exec call to run isis commands
 */
var makeIsisCall = function(filepath, returnPath, isisCall, logToFile){
    return new Promise(function(resolve,reject){
        // execute the isis2std function
        
        var isisSpawn = spawn(isisCall,['from=', filepath,"to=",returnPath,"append=",'true']);
        
        isisSpawn.stdout.on('data', function(data){
            console.log(isisCall + ' stdout: ' + data.toString() + "\n");
        });


        isisSpawn.stderr.on('data', function(data){
            console.log(isisCall + ' Error: ' + data.toString() + "\n");
        });

        isisSpawn.on('exit',function(code){
            console.log(isisCall + ' Exited with code: ' + code + "\n");    
            resolve();
        });


        isisSpawn.on('error',function(code){
            console.log(isisCall + " Failed: -1\n");
            reject(-1);
        });
        
    });
}


/**
 * 
 * @param {string} nameString tag to be checked for End keywords
 * 
 * @returns {boolean} if name string is end of an object or not
 * 
 * @description determines if the line is one of the End keywords
 */
var endTag = function(nameString){
    let arr = ['End_Object','End_Group'];

    for(let i = 0; i < arr.length; i++){
        if(nameString == arr[i]){
            return true;
        }
    }
    return false;
}


/**
 * 
 * @param {string} inputFile string value representing a link to cube file to open.
 * 
 * @returns {Promise}
 * @returns {object string} JSON string of the data from pvl
 * 
 * @requires fs, instream, outstream, and readline.
 * 
 * @description this function reads a file line by line parseing into a JSON format.
 */
var processFile = function(inputFile){
    return new Promise(function(resolve){
        // execute the isis2std function
        // open the fs with necessary imports for streaming file data
        var fs = require('fs'),
            readline = require('readline'),
            instream = fs.createReadStream(inputFile),
            outstream = new (require('stream'))(),
            rl = readline.createInterface(instream, outstream);
        
        // declare needed variables
        var cubeData = {};
        var tagName = "";
        var lastTag = "";

        // read line by line
        rl.on('line', function (line) {
            // variables
            let val = "";

            // found name header line
            if(testHeader(line.toString().trim().split('=')[0])){
                if(tagName == ""){
                    tagName = combineName(line.toString().trim().split('=')[1]);
                }
                // some other type of data line
                else{
                    tagName = combineName(tagName, line.toString().trim().split('=')[1].trim());   
                }
            }
            // if not header line 
            else{
                // check for end tag of outer objects
                if(endTag(line.trim())){
                    // shorten if true
                    tagName = shortenName(tagName);
                    
                }
                // if comment ignore
                else if(line.trim().indexOf('/*') > -1 || line.trim() == ""){
                    // this is a comment line in the file
                    // ignore for now maybe do something later
                }
                else{
                    // `variable = data object` line
                    if(line.toString().trim().split('=')[1] != undefined 
                        || line.toString().trim().split('=')[1] == '.'){
                        val = line.toString().split('=')[1].trim();
                        let tmpTag = line.toString().split('=')[0].trim();

                        
                        // combine the tag name
                        tagName = combineName(tagName, tmpTag);
                        
                        // set data
                        cubeData[tagName] = val;
                        // set last seen var
                        lastTag = tagName;
                        // shorten current tag
                        tagName = shortenName(tagName);
                    }
                    else{
                        // if not EOF
                        if(line.trim() != "End"){
                            cubeData[lastTag] = String(cubeData[lastTag]).trim().concat( ' ' + line.trim());
                        }
                        else{
                            // End was seen but could be in middle of file
                            tagName = '';
                        }
                    }
                }
            }
        });
        // this runs on last line of the file
        rl.on('close', function (line) { 
            // replace all instances of " and '\n'
            for(key in cubeData){
                cubeData[key] = cubeData[key].replace(/\"/g,"").replace(/\n/g,"");
            }
            resolve(JSON.stringify(cubeData));
        });    
    });
}

/**
 * 
 * @param {string} imageLink link to the image file
 * 
 * @returns {string} string to new jimp/ path of the image 
 * 
 * @description created the url for the new jimp image
 */
var newImageName = function(imageLink){
    let imagename = imageLink.split('/');
    imagename = imagename[imagename.length-1];
    let newImageName = imagename.replace('.png','_crop') + '.png';
    return path.join('jimp',newImageName);
}