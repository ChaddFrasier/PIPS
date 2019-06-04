/**
 * Utility JS for Caption Writer
 * 
 * Author: Chadd Frasier
 * Date: 06/03/19
 * Version: 1.1
 * Description: 
 *      This is the utility file for The Planetary Image Caption Writer  
 */

// require dependencies

const shell = require('shelljs');

module.exports = {
    // this function will make the system calls like before piping the output to append to return.pvl
    makeSystemCalls: function(file){

        shell.exec('echo this is how you make a system call');

        return "func  makeSystemCalls retuned";
    }

    // Another function

    // Another function
};