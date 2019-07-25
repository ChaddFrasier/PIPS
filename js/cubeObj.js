/**
 * @author Chadd Frasier
 * 
 * @class lass if for ISIS3 Cubes 
 * 
 * @constructor cubeName
 * 
 * @description this will make the Orion Writer much easier to manage with the help of client side cookies
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
     * 
     * @param void 
     * 
     * @function get important data as stringify'ed JSON.
     */
    get impData(){
        return JSON.stringify(this._impData);    
    }

    /**
     * @param {JSON} data data to be set. 
     *  
     * @function set json object in this cube object.
     */
    set data(data){
        this._data = data;
    }

    set name(name){
        this._cubeName = name;
    }

     /**
     * @param {JSON} data data to be set.
     *  
     * @function add important json object in this cube object.
     */
    set impData(data){
        this._impData = data;
    }
}