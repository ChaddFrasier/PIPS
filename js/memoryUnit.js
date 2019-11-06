/**
 * @author Chadd Frasier
 * 
 * @class Memory Unit 
 * @alias Memory
 * 
 * @since 10/05/2019
 * @updated 10/05/2019
 * 
 * @constructor void
 * 
 * @classdesc this will make PIPS much easier to manage with the help of client side cookies
 *              This class is basically just a data structure with gets and sets
 * 
 * @see {server.js} Read the header before editing
*/

/**
 * @class Memory Unit 
 *      The purpose is to control all the files on the server and clear the files that are no longer needed
 */
module.exports = class Memory{

    /**
     * @constructor Memory()
     * 
     * @param {number} memId this is the memory id that will represent the unique memory entry
     */
    constructor( memId ){
        this._memId = memId;
        this._userId;
        this._lastRequest;
    }


    /**
     * @function userId set
     */
    set userId(id) {
        if(typeof(id) !== "string"){
            // wrong type
            throw TypeError;
        }
        else{
            this._userId = id;
        }
    }

    /** 
     * @function userId get
     */
    get userId() {
        return this._userId;
    }

    /**
     * @function lastRequest set
     */
    set lastRequest(date) {
        if(typeof(date) !== "number"){
            // wrong type
            throw TypeError;
        }
        else{
            this._lastRequest = date;
        }
    }

    /** 
     * @function lastRequest get
     */
    get lastRequest() {
        return this._lastRequest;
    }

    /** 
     * @function memId get
     */
    get memId() {
        return this._memId;
    }

    /**
     * @function print
     * 
     * @description Print out this memory element
     */
    print() {
        console.log("Memory ID: " + this.memId);
        console.log("Memory User ID: " + this.userId);
        console.log("Memory Last Request: " + this.lastRequest);
    }

    /**
     * @function checkDate
     */
    checkDate(){
        let now = (new Date(Date.now() + 28800000));

        if(compareDates(this.lastRequest, now) >= 8){
            console.log("User Has not been active in 8+ hours");
        }
    }

    /**
     * @function updateDate
     */
    updateDate(){
        this.lastRequest = Date.now();
    }


    /**
     * 
     * @param {*} id 
     * @param {*} array 
     */
    checkMemInstances(id, array){
        if(array.length === 0){ return false; }
        
        for(var i = 0; i < array.length; i++){
            if(array[i].userId === id){
                return true;
            }
        }

        return false;
    }

    /**
     * 
     * @param {*} id 
     * @param {*} array 
     */
    accessMemory(id, array){
        if(array.length === 0){ return undefined; }
        
        for(var i = 0; i < array.length; i++){
            if(array[i].userId === id){
                return array[i];
            }
        }

        return undefined;
    }
}

/**
 * @function arraysEqual
 * 
 * @param {array} arr1 
 * @param {array} arr2 
 * 
 * @returns bool
 * 
 * @description checks to see if the arrays are exactly equal
 */
function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i] !== arr2[i])
            return false;
    }

    return true;
}


/**
 * @function compareDates
 * 
 * @param {Date} start 
 * @param {Date} end 
 * 
 * @returns hours from start to end
 */
function compareDates(start, end) {
    if(start === end){ return 0; }
    if(start < end){ 
        return parseFloat((end-start)/(3600000));
    }
    

}