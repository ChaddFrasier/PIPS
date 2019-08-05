/**
 * @author Chadd Frasier
 * 
 * @class ISIS3 Cubes 
 * 
 * @constructor cubeName, userId
 * 
 * @description this will make PIPS much easier to manage with the help of client side cookies
 */
module.exports = class Cube{
    /**
     * 
     * @param {sting} cubeName name of the cube to be contructed into an object.
     */
    constructor(cubeName,userId){
        this._userId = userId;
        this._cubeName = cubeName;
        // init JSON elements
        this._data = {};
        this._impData = {};
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
     * @function return userID.
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