/**
 * Utility JS for Caption Writer
 * 
 * Author: Chadd Frasier
 * Date Created: 06/03/19
 * Date Last Modified: 06/16/19
 * Version: 2.2
 * Description: 
 *      This is the utility file for The Planetary Image Caption Writer  
 */

// require dependencies
var exec = require('child_process').exec;
var path = require('path');
var Promises = require('bluebird');

// exportable functions

module.exports = {
    makeSystemCalls: function(cubeName, filepath, returnPath, imagePath) {
        // call the isis commands
        callIsis(cubeName, filepath, returnPath, imagePath);
    },

    readPvltoStruct: function() {
        var keyName = '';
        var value = '';
        /* fs.readFile('./pvl/return.pvl', function read(err, data) {
            if (err) {
                throw err;
            }
            console.log(data.toString());
        }); */
        try {
            // extract data
            processFile('./pvl/return.pvl');
        }
        catch (err) {
            console.log(err);
        }
        // set read environment
        return 'finsihed';
    }
};

// local functions
/**
 * 
 * @param {string} testValue 
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
 * @param {string} name 
 * @param {string} str 
 * @description returns the name combined in the proper object order
 */
var combineName = function(name, str=undefined){
    // if str is not defined just return the name trimmed
    if(str == undefined){
        return name.toString().trim();
    }else{
        return (name.toString().trim() + '.' + str.trim());
    }
}

/**
 * 
 * @param {string} name  
 * @description returns the name with the last added element replaced
 */
var shortenName = function(name){
    // splits the name strig into an array a parts 
    var strarr = name.toString().trim().split('.');
    // removes the last part of the string
    strarr.pop();
    // rejoin the remaining parts
    return strarr.join('.');
}

/**
 * 
 * @param {string} cubeName 
 * @param {string} format 
 * @returns {string} image name
 * @description This function takes the file extension off of he cube file and makes it a png.
 */
var getimagename = function(cubeName, format){
    // get an array of peieces of the filename
    let namearr = cubeName.toString().split('.');
    // set the last element of the array to the format specified
    namearr[namearr.length - 1] = format;
    //console.log(namearr);
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
 * @description this function runs all isis commands and populates an array of 
 * promises to ensure the PVL file is full created before processing continues
 */
var callIsis = function(cubeName, filepath, returnPath, imagePath){
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
        require(__filename).readPvltoStruct();
        });

    return 0;
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
 * @description makes the exec call to run isis commands
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
 * @description determins true false if the 
 * line is in the end object group
 */
var endTag = function(nameString){
    let arr = ['End_Object','End_Group'];

    for(let i = 0; i<arr.length;i++){
        if(nameString == arr[i]){
            return true;
        }
    }

    return false;
}


/**
 * 
 * @param {string} inputFile 
 * @description this function reads a file line by line, it will chnage into the data parser in later commits
 */
var processFile = function(inputFile){
    // open the fs with necessary imports for streaming file data
    var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);


    var tagName= '';
    // read line by line
    rl.on('line', function (line) {

        // name header line
        if(testHeader(line.toString().trim().split('=')[0])){
            if(tagName == ''){
                tagName = combineName(line.toString().trim().split('=')[1]);
                console.log('new tag is: ' + tagName);
            }
            // some other type of data line
            else{
                tagName = combineName(tagName, line.toString().trim().split('=')[1].trim());
                console.log('new tag is: ' + tagName);     
            }

        }
         // if not header line 
        else{
            // check for end tag
            if(endTag(line.trim())){
                // shorten if true
                tagName = shortenName(tagName);
                console.log('new tag is: ' + tagName);
            }
            else{
                // `variable = data object` line
                if(line.toString().trim().split('=')[1] != undefined){
                    console.log(tagName.concat('.' + line.toString().trim().split('=')[0]) + ' = ' + line.toString().trim().split('=')[1]);
                }
                else{
                    // empty line
                    console.log(line.trim());
                }
            }
            // TODO: do stuff with data
        }



    });
    
    // this runs on last line of the file
    rl.on('close', function (line) {
        console.log('last line call: ' + line);
        console.log('done reading file.');
    });  
}
