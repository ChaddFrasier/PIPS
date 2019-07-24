/**
 * Utility JS for Caption Writer
 * 
 * Author: Chadd Frasier
 * Date Created: 06/03/19
 * Date Last Modified: 07/17/19
 * Version: 2.3.1
 * Description: 
 *      This is the utility file for The Planetary Image Caption Writer  
 * 
 * @todo image manipulation using jimp or other module
 * @todo refactor and clean unused variables in functions
 */


// require dependencies
var exec = require('child_process').exec;
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
     * 
     * @function calls the isis commands using promises to ensure the processes are finished
     */
    makeSystemCalls: function(cubeName, filepath, returnPath, imagePath) {
        return new Promise(function(resolve){
            // array of promises to resolve
            let promises = [];
            // call the isis commands
            promises.push(callIsis(cubeName, filepath, returnPath, imagePath));
            
            // when all promises is the array are resolved run this
            Promises.all(promises).then(function(){
                resolve();
            });
        });
    },


    /**
     * 
     * @param {string} cubeName name of the cube to be analyzed
     * 
     * @function takes the cube used and runs the pvl data extraction algorithm 
     */
    readPvltoStruct: function(cubeName) {
        return new Promise(function(resolve){
            var promises = [];

            // create a promise of the processFile function
            promises.push(processFile(path.join('pvl', cubeName.replace('.cub','.pvl'))));
    
            // this block will pass and run when all isis commands are finished
            Promise.all(promises).then(function(cubeData){
                console.log('extract finished');
                // return the data
                resolve(cubeData);
            });
        });
    },
    

    findImageLocation: function(cookieval){
        return path.join('images', cookieval.replace('.cub','.png'));
    },


    calculateCrop: function(cropArray){
        console.log(cropArray.toString());

        let start_x = Number(cropArray[0]);
        let start_y = Number(cropArray[1]);

        let width = Number(cropArray[2]) - start_x;
        let heigth = Number(cropArray[3]) - start_y;

        cropArray[2] = width;
        cropArray[3] = heigth;

        return cropArray;
    },


    cropImage: async function(imageLink,cropArray){
        const cubeImage = await jimp.read(imageLink);
        var returnImage;

        await cubeImage.crop(parseInt(cropArray[0]),parseInt(cropArray[1]),parseInt(cropArray[2]),parseInt(cropArray[3]),function(err){
            if(err) throw err;
            returnImage = newImageName(imageLink);

        })
        .write(returnImage);
        
        return returnImage;
    },

    getDimensions: async function(newImage){
        await jimp.read(newImage).then(function(img){
            console.log('fails after READ');
            var w = img.bitmap.width;
            var h = img.bitmap.height;

            console.log("wifdth: " + w + "And height" + h);
            return [w,h];
        });
    },



    superImposeIcon: async function(starterImage, iconPath, x, y){

        console.log('impose onto: ' + starterImage);
        console.log('impose this: ' + iconPath);

        starterImage = require(__filename).parseQuery(starterImage);
        

    
        var image = await jimp.read(starterImage);
        var icon = await jimp.read(iconPath);

        await icon.resize(.10 * image.bitmap.width, .10 * image.bitmap.height);

        var outputFile = getIconFilename(starterImage,iconPath);

        await image.composite(icon, x, y)
        .write(outputFile);

        return outputFile;
        
    },

    /**
     * 
     * @param {Cube Object} cubeObj cube object to be added
     * @param {array} cubeArray array of cube objects.
     * 
     * @function  scans through the array and adds the element if it is not already there
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
                if(cubeObj.name === cubeArray[index].name){
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
     * @param {string} findObj name of cube to be found in array
     * @param {Cube array} cubeArray array to be searched
     * 
     * @function retrieves object that is being searched if it can; return 0 if array is empty , -1 if not found
     * 
     * @returns {number} 0 if array is empty
     * @returns {number} -1 if item not found
     * @returns {Cube Object}Cube Object that matches findObj
     */
    getObjectFromArray: function(findObj,cubeArray){
        // if the array is empty return 0
        if(cubeArray.length === 0){
            return 0;
        }
        else{
            // otherwise check to see if the findObj is already in the array
            for(var index = 0; index < cubeArray.length; index++){
                // if yes then just return the same array
                if(findObj === cubeArray[index].name){
                    return cubeArray[index];
                }
            }
            // cube name not found
            return -1;
        }
    },



    /**
     * 
     * @param {JSON string} cubeData the stringify'ed version of the data to be converted
     * 
     * @function converts data from JSON string to csv string
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
     * @function creates and returns an array of tags from the cfg file
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
     * @param {JSON string} cubeFileData stringify'ed version of cube data
     * @param {array} importantTagArr important tags array that need to be filled
     * 
     * @function takes important tag array and extracts data if it exists returns none otherwise 
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
     * @param {string} cubeName name of the cube file
     * @param {string} format format that the image should be generated to
     *
     * @returns {string} the name of the image to be saved based on cube
     * 
     * @function  takes the file extension off of he cube file and makes it a png.
     */
    getimagename: function(cubeName, format){
        // get an array of peieces of the filename
        let namearr = cubeName.toString().split('.');
        // set the last element of the array to the format specified
        namearr[namearr.length - 1] = format;
        // return the combined new array
        return namearr.join('.');
    },

    // parses the query string off of the image link
    parseQuery: function(imageName){
    try{return imageName.split('?')[0];}
    catch{return imageName;}
}
};


// local functions
/**
 * 
 * @param {string} testValue  value to check if it a cube hearder keyword
 * 
 * @function tests if the value is a header for the isis data
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
 * @function combines tags to make keys for JSON object
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
 * @function removes last added element
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
 *
 *  @return {int} error codes
 * 
 * @function this function runs all isis commands and populates an array of 
 * promises to ensure the PVL file is full created before processing continues
 */
var callIsis = function(cubeName, filepath, returnPath, imagePath){
    return new Promise(function(resolve){
        // variables for proper isis calls
        var isisCalls = ['campt','catlab','catoriglab'];
        var promises = [];
        // get the filename from interior export 
        var imagename = require(__filename).getimagename(cubeName,'png');

        // run the isis commands
        for(var i=0;i<isisCalls.length;i++){
            // push command calls
            promises.push(makeIsisCall(filepath, returnPath, isisCalls[i]));
        }
        // call and push image command
        promises.push(imageExtraction(imagename,filepath,imagePath));                       

        // this block will pass and run when all isis commands are finished
        Promise.all(promises).then(function(){
            console.log('Isis call is finished');
            resolve();
        });
    });
 }


/**
 * 
 * @param {string} imagename name of the image
 * @param {string} filepath path to the cube file on the server
 * @param {string} imagePath path where image should be saved
 * 
 * @function calls the isis image conversion on the given cube
 */
var imageExtraction = function(imagename, filepath, imagePath){
    return new Promise(function(resolve){
        // execute the isis2std function
        exec('isis2std from= ' + filepath
        + " to= " + imagePath + '/' + imagename, function(err, stdout, stderr){
            if(err){
                // log error
                console.log('Failed isis2std call');
                //console.log(err);
            }
            resolve();
            });
        });
    }


/**
 * 
 * @param {string} cubeName name of cube file to run on
 * @param {string} filepath path to the cube file
 * @param {string} returnPath path to the return pvl
 * @param {string} isisCall isis command that is going to be run
 * 
 * @function makes the exec call to run isis commands
 */
var makeIsisCall = function(filepath, returnPath, isisCall){
    return new Promise(function(resolve){
        // execute the isis2std function
        exec( 
            isisCall + ' from= ' + filepath
            + " to= " + returnPath + ' append= true', function(err, stdout, stderr){
            if(err){
                // log error
                console.log('Failed isis2std call');
                //console.log(err);
            }
            resolve();
        });
    });
}

 

var getIconFilename = function(imagePath, iconPath){
    let imageArr = imagePath.split('/');
    let iconArr = iconPath.split('/');

    var imageName = imageArr[imageArr.length - 1];
    var iconName = iconArr[iconArr.length - 1];

    return 'jimp/' + imageName.replace('.png','_') + iconName;
}


/**
 * 
 * @param {string} nameString tag to be checked for End keywords
 * 
 * @function determines if the line is one of the End keywords
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
 * @param {string} cubeName just the name of the cube for getting the image output name more easily.
 * @requires fs, instream, outstream, and readline.
 * 
 * @function this function reads a file line by line, it will chnage into the data parser in later commits.
 */
var processFile = function(inputFile, cubeName){
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
                    //console.log('new tag is: ' + tagName);
                }
                // if comment ignore
                else if(line.trim().indexOf('/*') > -1 || line.trim() == ""){
                    //console.log('comment says: ' + line.trim());
                }
                else{
                    // `variable = data object` line
                    if(line.toString().trim().split('=')[1] != undefined || line.toString().trim().split('=')[1] == '.'){
                        val = line.toString().split('=')[1].trim();
                        let tmpTag = line.toString().split('=')[0].trim();

                        
                        // combine the tag name
                        tagName = combineName(tagName, tmpTag);
                        
                        // set data
                        //console.log(tagName +  '=' + val)

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
            //console.log(JSON.stringify(cubeData));
            resolve(JSON.stringify(cubeData));
        });    
    });
}

var newImageName = function(imageLink){
    let imagename = imageLink.split('/');

    imagename = imagename[imagename.length-1];

    let newImageName = imagename.replace('.png','_crop') + '.png';

    return path.join('jimp',newImageName);
}


// parses the query string off of the image link
var parseQuery = function(imageName){
    try{return imageName.split('?')[0];}
    catch{return imageName;}
}
