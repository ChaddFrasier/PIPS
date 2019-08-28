/**
 * @author Chadd Frasier
 * 
 * @class ISIS3 Cubes 
 * @alias Cube
 * 
 * @update 08/26/19
 * 
 * @constructor cubeName, userId
 * 
 * @classdesc this will make PIPS much easier to manage with the help of client side cookies
 *              This class is basically just a data structure with gets and sets
 */
module.exports = class Cube{
    /**
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
     * @param void
     * 
     * @function return cubeName.
     */
    get name(){
        return this._cubeName;
    }

    /**
     * @param {string} name of the file that the instance is working with
     * 
     * @function set the name of the instance
     */
    set name(name){
        if(typeof(name) === "string"){
            this._cubeName = name;
        }
    }

    /**
     * @param void
     * 
     * @function return userNum.
     */
    get userNum(){
        return this._userNum;
    }

    /**
     * @param {number} num the number to be set to the userNum
     * 
     * @function set the number that the user got when uploading
     */
    set userNum(num){
        this._userNum = Number(num);
    }

     /**
     * @param void
     * 
     * @function return userId.
     */
    get userId(){
        return this._userId;
    }

    /**
     * 
     * @param void 
     * @function get data as stringify'ed JSON.
     */
    get data(){
        return JSON.stringify(this._data);    
    }

     /**
     * @param void
     * 
     * @function return userDim array.
     */
    get userDim(){
        return this._userDim;
    }

    /**
     * 
     * @param {array} dimArray the dimension array to be set
     * @function set userDim array to the given array
     */
    set userDim(dimArray){
        this._userDim = dimArray;    
    }

    /**
     * @param {JSON} data data to be set. 
     *  
     * @function set json object in this cube object.
     */
    set data(data){
        if(typeof(data) === 'object'){
            this._data = data;
        }
    }

    /**
     * 
     * @param void 
     * @returns {Boolean}
     * 
     * @function get the log flag value
     */
    get logFlag(){
        return this._logFlag;    
    }

    /**
     * @param {JSON} data data to be set. 
     *  
     * @function set boolean value if the user wants to log to a file
     */
    set logFlag(value){
        if(typeof(value) === 'boolean'){
            this._logFlag = value;
        }
        
    }

    /**
     * 
     * @param void 
     * @returns {JSON String}
     * 
     * @function get important data as stringify'ed JSON.
     */
    get impData(){
        return JSON.stringify(this._impData);    
    }

     /**
     * @param {JSON} data data to be set.
     *  
     * @function add important json object in this cube object.
     */
    set impData(data){
        if(typeof(data) === "object"){
            this._impData = data;
    
        }
    }
}