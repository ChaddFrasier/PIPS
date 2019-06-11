/**
 * Utility JS for Caption Writer
 * 
 * Author: Chadd Frasier
 * Date Created: 06/03/19
 * Date Last Modified: 06/04/19
 * Version: 1.1
 * Description: 
 *      This is the utility file for The Planetary Image Caption Writer  
 */

// require dependencies
const exec = require('child_process').exec;


// local functions
var getimagename = function(cubeName, format){
    let namearr = cubeName.split('.');

    namearr[namearr - 1] = format;
    return namearr.join('.');
}

// exportable functions
module.exports = {
    // this function will make the system calls like before piping the output to append to return.pvl
    makeSystemCalls: function(cubeName, filepath, returnPath, imagePath){
        
        let imagename = getimagename(cubeName, 'png');

        exec('rm ' + returnPath);

        // execute the campt function
        try{
            exec('campt from= ' + filepath
            + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                if(err){
                    console.log('Failed campt call');
                    console.log("Error: " + err);
                }
            });
        }catch(err){
            console.log('Error running ISIS command campt' + err);
        }
        

        // execute the catlab function
        try{
            exec('catlab from= ' + filepath
            + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                if(err){
                    console.log('Failed catlab call');
                    console.log("Error: " + err);
                }
            });
        }catch(err){
            console.log('Error running ISIS command catlab' + err);
        }

        // execute the catoriglab function
        try{
            exec('catoriglab from= ' + filepath
            + " to= " + returnPath + " append= true", function(err, stdout, stderr){
                if(err){
                    console.log('Failed catoriglab call');
                    console.log("Error: " + err);
                }
            });
        }catch(err){
            console.log('Error running ISIS command catoriglab' + err);
        }

        // execute the isis2std function
        try{
            exec('isis2std from= ' + filepath
            + " to= " + imagePath + '/' + imagename, function(err, stdout, stderr){
                if(err){
                    console.log('Failed isis2std call');
                    console.log("Error: " + err);
                }
            });
        }catch(err){
            console.log('Error running ISIS command catoriglab' + err);
        }
        

        return "func  makeSystemCalls retuned";
    }

    // Another function
    // TODO: extractImage

    // Another function
};