/**
 * Utility JS for Caption Writer
 * 
 * Author: Chadd Frasier
 * Date Created: 06/03/19
 * Date Last Modified: 06/11/19
 * Version: 1.2.2
 * Description: 
 *      This is the utility file for The Planetary Image Caption Writer  
 */

// require dependencies
const exec = require('child_process').exec;
const lineReader = require('line-reader');
const path = require('path');

// local functions


/**
 * 
 * @param {string} testValue 
 * @description tests if the value is a header for the isis data
 */
var testHeader = function(testValue){
    let variablearray = ['Object','Group'];
    console.log(testValue);
    for(var i = 0; i< variablearray.length; i++){
        if(variablearray[i] == testValue){
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
    if(name == undefined){
        return str.toString().trim();
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
    var strarr = name.toString().trim().split('.');
    strarr.pop();
    return strarr.join('.');
}

// exportable functions
module.exports = {
    /**
     * 
     * @param {string} cubeName 
     * @param {string} filepath 
     * @param {string} returnPath 
     * @param {string} imagePath 
     * @returns {int} code
     * @description this function will make the system calls like before piping the output to append to return.pvl
     */
    makeSystemCalls: function(cubeName, filepath, returnPath, imagePath){
        // get image name 
        
        let imagename = this.getimagename(cubeName, 'png');
        // remove a pvl if it exists
        exec('rm ' + returnPath);
        // execute the campt function
        exec('campt from= ' + filepath
            + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                if(err){
                    // print error
                    console.log('Failed campt call');
                    //console.log(err);
                }
            });
        
        // execute the catlab function
        exec('catlab from= ' + filepath
            + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                if(err){
                    // print error
                    console.log('Failed catlab call');
                    //console.log(err);
                }
            });

        // execute the catoriglab function
        exec('catoriglab from= ' + filepath
            + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                if(err){
                    // log error to console
                    console.log('Failed catoriglab call');
                    //console.log(err);
                }
            });

        // execute the isis2std function
        exec('isis2std from= ' + filepath
            + " to= " + imagePath + '/' + imagename, function(err, stdout, stderr){
                if(err){
                    // log error
                    console.log('Failed isis2std call');
                    //console.log(err);
                    return 
                }
            });
        
        return 0;
    },

    /**
     * 
     * @param {string} cubeName 
     * @param {string} format 
     * @returns {string} image name
     * @description This function takes the file extension off of he cube file and makes it a png.
     */
    getimagename: function(cubeName, format){
        // get an array of peieces of the filename
        let namearr = cubeName.toString().split('.');
        // set the last element of the array to the format specified
        namearr[namearr.length - 1] = format;
        //console.log(namearr);
        // return the combined new array
        return namearr.join('.');
    },


    /**
     * 
     * @param {string} pvlFile 
     * @returns //TODO:
     * @description This function extracts data from the pvl file
     */

    //TODO: parse entire pvl file
    readPvltoStruct: function(pvlFile){
        var keyName = '';
        var value = '';
        // ready pvl file data into a Data structure of some kind
        lineReader.eachLine(path.join('pvl', 'return.pvl'), function(line){
            if(line.indexOf('=') > -1 && testHeader(line.split('=')[0].trim())){
                keyName = combineName(keyName,line.split('=')[1].trim());
                console.log('added: ' + keyName);
               // console.log(line);
            }else{

                if(line.split('=')[0].trim() == 'End_Object' || line.split('=')[0].trim() == 'End_Group'){
                    keyName = shortenName(keyName);
                    
                }
                // do nothing
            }
        });// end line loop

        /* console.log('\n========================\ntesting name here: ' 
        + combineName('IsisCube.Table','Camera') + '\n========================\n');

        console.log('\n========================\ntesting name here: ' 
        + shortenName('IsisCube.Table.Camera') + '\n========================\n');
 */
        return 'donezo';
    }


    // Another expoertable function
};
