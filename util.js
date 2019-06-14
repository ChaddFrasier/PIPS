/**
 * Utility JS for Caption Writer
 * 
 * Author: Chadd Frasier
 * Date Created: 06/03/19
 * Date Last Modified: 06/13/19
 * Version: 2.1
 * Description: 
 *      This is the utility file for The Planetary Image Caption Writer  
 */

// require dependencies
const exec = require('child_process').exec;
const path = require('path');
const Promises = require('bluebird');

// local functions
/**
 * 
 * @param {string} testValue 
 * @description tests if the value is a header for the isis data
 */
var testHeader = function(testValue){
    console.log('printted from testHeader function');
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
        var promises = [];
        var imagename = this.getimagename(cubeName,'png');

        promises.push(this.callIsis1(cubeName,filepath,returnPath));
        promises.push(this.callIsis2(cubeName,filepath,returnPath));    
        promises.push(this.callIsis3(cubeName,filepath,returnPath));    
        promises.push(this.callIsis4(imagename,filepath,imagePath));                       

        
        Promise.all(promises).then(function(){
            console.log('Isis call is finished');
            require(__filename).readPvltoStruct();
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
    readPvltoStruct: function(){
        var keyName = '';
        var value = '';
          
        /* fs.readFile('./pvl/return.pvl', function read(err, data) {
            if (err) {
                throw err;
            }
            console.log(data.toString());
        }); */  

        try{
            processFile('./pvl/return.pvl');
        }
        catch(err){
            console.log(err);
        }
        
        // remove a pvl if it exists
        //      FOR NOW: exec('rm ' + returnPath);
    
        // ready pvl file data into a Data structure of some kind
        // think about const in a functionn here should this be used?
        
        // set read environment
        return 'finsihed';
        
    },

    callIsis1: function(cubeName, filepath, returnPath){
        return new Promise(function(resolve){
                            
            // execute the campt function
            exec('campt from= ' + filepath
                + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                    if(err){
                        // print error
                        console.log('Failed campt call');
                        //console.log(err);
                    }
                    resolve();
                });
                
            });
        },

    callIsis2: function(cubeName, filepath, returnPath){
                return new Promise(function(resolve){           
                // execute the campt function
                exec('catlab from= ' + filepath
                    + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                        if(err){
                            // print error
                            console.log('Failed campt call');
                            //console.log(err);
                        }
                        resolve();
                    });
                    
                });
            },

        callIsis3: function(cubeName, filepath, returnPath){
                    return new Promise(function(resolve){
                                        
                        // execute the campt function
                        exec('catoriglab from= ' + filepath
                            + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                                if(err){
                                    // print error
                                    console.log('Failed campt call');
                                    //console.log(err);
                                }
                                resolve();
                            });
                        
                        });
                    },
    
                    

        callIsis4: function(imagename, filepath, imagePath){
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
    
    // Another expoertable function
};


function processFile(inputFile) {
    var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    rl.on('line', function (line) {
        console.log(line);
    });
    
    rl.on('close', function (line) {
        console.log(line);
        console.log('done reading file.');
    });
    
}
