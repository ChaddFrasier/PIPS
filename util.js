/**
 * Utility JS for Caption Writer
 * 
 * Author: Chadd Frasier
 * Date Created: 06/03/19
 * Date Last Modified: 06/20/19
 * Version: 2.2.1
 * Description: 
 *      This is the utility file for The Planetary Image Caption Writer  
 */

 // TODO: parse new data strings into the table tag format in the writer.ejs file
 // TODO: image manipulation using jimp or other module
 // TODO: refactor and clean unused variables in functions


// require dependencies
var exec = require('child_process').exec;
var path = require('path');
var Promises = require('bluebird');

// exportable functions
module.exports = {
    /**
     * 
     * @param {string} cubeName 
     * @param {string} filepath 
     * @param {string} returnPath 
     * @param {string} imagePath 
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
     * @param {string} cubeName
     * 
     * @function takes the cube used and runs the pvl data extraction algorithm 
     */
    readPvltoStruct: function(cubeName) {
        return new Promise(function(resolve){
            var promises = [];
            // create a promise of the processFile function
            promises.push(processFile('./pvl/return.pvl', cubeName));
    
            // this block will pass and run when all isis commands are finished
            Promise.all(promises).then(function(cubeData){
                console.log('extract finished');
                // return the data
                resolve(cubeData);
            });
        });
    },
    

    // TODO: clean data better
    /**
     * 
     * @param {string} cubeData 
     * 
     * @function converts a cube file data from string format to csv
     */
    getCsv: function(cubeData){
        return new Promise(function(resolve){
            // get each line
            var dataArr = cubeData.split('\n');
            // init csvString
            var csvString = '';

            for(var i = 0; i < dataArr.length; i++){
                // this loop goes over each key val pair with the line as a string
                // if the right side has : build it peice by peice otherwise use fast method
                if(dataArr[i].split(':').length === 2){
                    csvString += dataArr[i].trim().split(':').join(',') + '\n';
                }else{
                    // get the tempArray by splitting on ':'
                    let tmpArr = dataArr[i].split(':');
                    // save the first part as the name
                    csvString += tmpArr[0] + ',';
                    // remove the name from the array
                    tmpArr.shift();
                    // rejoin the array on the same symbol to keep the data
                    csvString += tmpArr.join(':') + '\n';    
                }  
            }
            // slice the EOF comma and \n
            csvString = csvString.slice(0, csvString.length - 3 );
            // return csvString
            resolve(csvString);
        });
    }
};


// local functions
/**
 * 
 * @param {string} testValue 
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
 * @param {string} name 
 * @param {string} str 
 * @function returns the name combined in the proper object order
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
 * @param {string} name  
 * @function returns the name with the last added element replaced
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
 * @param {string} cubeName 
 * @param {string} format 
 * @returns {string} image name
 * @function This function takes the file extension off of he cube file and makes it a png.
 */
var getimagename = function(cubeName, format){
    // get an array of peieces of the filename
    let namearr = cubeName.toString().split('.');
    // set the last element of the array to the format specified
    namearr[namearr.length - 1] = format;
    // return the combined new array
    return namearr.join('.');
}


/**
 * 
 * @param {string} cubeName 
 * @param {string} filepath 
 * @param {string} returnPath 
 * @param {string} imagePath 
 * @return {int} error codes
 * @function this function runs all isis commands and populates an array of 
 * promises to ensure the PVL file is full created before processing continues
 */
var callIsis = function(cubeName, filepath, returnPath, imagePath){
    return new Promise(function(resolve){
        // variables for proper isis calls
        var isisCalls = ['campt','catlab','catoriglab'];
        var promises = [];
        var imagename = getimagename(cubeName,'png');

        // run the isis commands
        for(var i=0;i<isisCalls.length;i++){
            // push command calls
            promises.push(makeIsisCall(cubeName, filepath, returnPath, isisCalls[i]));
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
 * @param {string} imagename 
 * @param {string} filepath 
 * @param {string} imagePath 
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
 * @param {string} cubeName 
 * @param {string} filepath 
 * @param {string} returnPath 
 * @param {string} isisCall 
 * @function makes the exec call to run isis commands
 */
var makeIsisCall = function(cubeName, filepath, returnPath, isisCall){
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

 
/**
 * 
 * @param {string} nameString 
 * @function determins true false if the 
 * line is in the end object group
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

            // name header line
            if(testHeader(line.toString().trim().split('=')[0])){
                if(tagName == ""){
                    tagName = combineName(line.toString().trim().split('=')[1]);
                    //console.log('new tag is: ' + tagName);
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
                        val = line.toString().split('=')[1];
                        let tmpTag = line.toString().split('=')[0];

                        // get rid of extra " " at front and back of strings
                        tmpTag = tmpTag.slice(1,tmpTag.length-1);

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
                            cubeData[lastTag] = String(cubeData[lastTag]).concat( ' ' + line.trim());
                        }
                        else{
                            // End was seen but could be in middle of file
                            tagName = ''
                        }
                    }
                }
            }
        });
        // this runs on last line of the file
        rl.on('close', function (line) {  
            resolve(JSON.stringify(cubeData));
        });    
    });
}
