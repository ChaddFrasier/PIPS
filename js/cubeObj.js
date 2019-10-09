/**
 * @author Chadd Frasier
 * 
 * @class ISIS3 Cubes 
 * @alias Cube
 * 
 * @since 07/30/2019
 * @updated 10/03/2019
 * 
 * @constructor cubeName, userId
 * 
 * @classdesc this will make PIPS much easier to manage with the help of client side cookies
 *              This class is basically just a data structure with gets and sets
 * 
 * @see {server.js} Read the header before editing
 */
/**
 * @class Cube This class is for the PIPS project. 
 *      The purpose is for this structure to serve as a memory block for instances of users
 */
module.exports = class Cube{
    /**
     * @constructor Cube()
     * 
     * @param {sting} cubeName name of the cube to be contructed into an object.
     * @param {string} userId the 23 character user id that was randomly generated
    */
    constructor(cubeName,userId){
        this._userId = userId;
        this._cubeName = cubeName;
        // user num is to track the user instance on the active server( shorter than the id)
        this._userNum;
        // init JSON elements
        this._data = {};
        this._impData = {};
        // init the image dimensions
        this._userDim = [0,0];
        // flag to tell if logging to file should occur
        this._logFlag = false;
    }


    /**
     * @function name
     * 
     * @param void
     * 
     * @returns {string} name of cube file
     * 
     * @description getter for cubeName.
    */
    get name(){
        return this._cubeName;
    }


    /**
     * @function name
     * 
     * @param {string} name of the file that the instance is working with
     * 
     * @description setter for name of the instance
    */
    set name(name){
        if(typeof(name) === "string"){
            this._cubeName = name;
        }
    }


    /**
     * @function userNum
     * 
     * @param void
     * 
     * @returns {number} user instance id
     * 
     * @description getter for userNum.
    */
    get userNum(){
        return this._userNum;
    }


    /**
     * @function userNum
     * 
     * @param {number} num the number to be set to the userNum
     * 
     * @description set the number that the user got when uploading
    */
    set userNum(num){
        this._userNum = Number(num);
    }


    /**
     * @function userID
     * 
     * @param void
     * 
     * @returns {number} user id
     * 
     * @description getter for userId.
    */
    get userId(){
        return this._userId;
    }


    /**
     * @function data
     * 
     * @param void 
     * 
     * @returns {JSON string} all data stringified
     * 
     * @description getter for data as stringify'ed JSON.
    */
    get data(){
        return JSON.stringify(this._data);    
    }


    /**
     * @function userDim
     * 
     * @param void
     * 
     * @returns {array} user dimensions of figure
     * 
     * @description return userDim array.
    */
    get userDim(){
        return this._userDim;
    }


    /**
     * @function userDim
     * 
     * @param {array} dimArray the dimension array to be set
     * 
     * @description set userDim array to the given array
    */
    set userDim(dimArray){
        this._userDim = dimArray;    
    }


    /**
     * @function data 
     * 
     * @param {JSON} data data to be set. 
     *  
     * @description set json object in this cube object.
    */
    set data(data){
        if(typeof(data) === 'object'){
            this._data = data;
        }
    }


    /**
     * @function logFlag
     * 
     * @param void 
     * 
     * @returns {Boolean}
     * 
     * @description get the log flag value
    */
    get logFlag(){
        return this._logFlag;    
    }


    /**
     * @function logFlag
     * 
     * @param {JSON} data data to be set. 
     *  
     * @description set boolean value if the user wants to log to a file
    */
    set logFlag(value){
        if(typeof(value) === 'boolean'){
            this._logFlag = value;
        }
    }


    /**
     * @function impData
     * 
     * @param void 
     * 
     * @returns {JSON String}
     * 
     * @description get important data as stringify'ed JSON.
    */
    get impData(){
        return JSON.stringify(this._impData);    
    }


    /**
     * @function impData
     * 
     * @param {JSON} data data to be set.
     *  
     * @description add important json object in this cube object.
    */
    set impData(data){
        if(typeof(data) === "object"){
            this._impData = data;
        }
    }


    /**
     * @function getCubeDimensions
     * 
     * @returns {promise} a promise for the lines and samples as an array
     * 
     * @description This function parses out the first 10th of the cube
     *      file header to read out the lines and sample of the image
    */
    getCubeDimensions(){
        var cubeObj = this;
        return new Promise(function(resolve,reject){
            var fs = require("fs"),
                path = require("path");

            fs.readFile(path.join("./uploads",cubeObj.name),(err, data)=>{
                if(err){
                    reject(err);
                }
                else{
                    // grab first tenth of the buffer
                    var bufferArray = data.subarray(0, data.length/10).toString().split("\n");

                    for(let index=0; index < bufferArray.length; index++){
                        // find the dimensions of the image group in the header
                        if(bufferArray[index].indexOf("Group = Dimensions") > -1){
                            // get lines and samples
                            var samples = Number(bufferArray[index + 1].split("=")[1]);
                            var lines = Number(bufferArray[index + 2].split("=")[1]);
                            // set the dimensions object and return as a string
                            var dim = {"w":samples, "h":lines};
                            resolve(JSON.stringify(dim));
                        }
                    }
                    reject();
                }
            });
        });
    }
}