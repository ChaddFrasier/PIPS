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

const shell = require('shelljs');

module.exports = {
    // this function will make the system calls like before piping the output to append to return.pvl
    makeSystemCalls: function(file){
        var returnFile = 'return.pvl';

        // execute the campt function
        try{
            shell.exec('campt from=' + '../uploads/' + file
            + " to=" + '../pvl/' + returnFile + " append=True");
        }catch(err){
            console.log('Error running ISIS command campt' + err);
        }
        

        // execute the catlab function
        try{
            shell.exec('catlab from=' + '../uploads/' + file
            + " to=" + '../pvl/' + returnFile + " append=True");
        }catch(err){
            console.log('Error running ISIS command catlab' + err);
        }

        // execute the catoriglab function
        try{
            shell.exec('catoriglab from=' + '../uploads/' + file
            + " to=" + '../pvl/' + returnFile + " append=True");
        }catch(err){
            console.log('Error running ISIS command catoriglab' + err);
        }

        // execute the catoriglab function
        try{
            shell.exec('isis2std from=' + '../uploads/' + file + " to="
            + '../images/' + file  + " format= png");
        }catch(err){
            console.log('Error running ISIS command catoriglab' + err);
        }
        

        return "func  makeSystemCalls retuned";
    }

    // Another function
    // TODO: extractImage

    // Another function
};