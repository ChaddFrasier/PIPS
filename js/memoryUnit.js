/**
 * @author Chadd Frasier
 * 
 * @class Memory Unit 
 * @alias Memory
 * 
 * @since 11/05/2019
 * @updated 11/07/2019
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
     * 
     * @param {string} id the user id of the user that is using this memory block
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
     * 
     * @param {number} date the date represented in milliseconds
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
        return;
    }

    /**
     * @function checkDate
     */
    checkDate(){
        const fs = require("fs"),
            path = require("path");
        let now = Date.now();

        if(compareDates(this.lastRequest, now) >= 12){
            
            try{
                fs.unlinkSync(path.join("log", this.userId + ".log"));
            }catch(err){ /* ignore */}

            let tmpArr = fs.readdirSync("./images");

            tmpArr = tmpArr.concat(fs.readdirSync("./uploads"), fs.readdirSync("./csv"), fs.readdirSync("./pvl"));

            tmpArr.forEach(file =>{
                // for each file in the directory
                if(/^.*(?<!pencilcursor|usgsLogo)\.(png|cub|csv|pgw|pvl|tif)/gm.test(file)){
                    var fileExt = file.split(".")[ file.split(".").length -1 ];

                    switch(fileExt){
                        case "png":
                            
                            if( file.startsWith("r-" + this.memId) || file.startsWith("u-" + this.memId) ){
                                fs.unlinkSync(path.join("images", file));
                            }
                            break;

                        case "pvl":
                                if( file.startsWith("r-" + this.memId) || file.startsWith("u-" + this.memId) ){
                                    fs.unlinkSync(path.join("pvl", file));
                                }
                                break;

                        case "csv":
                                if( file.startsWith("r-" + this.memId) || file.startsWith("u-" + this.memId) ){
                                    fs.unlinkSync(path.join("csv", file));
                                }
                                break;
                                
                        case "pgw":
                                fs.unlinkSync(path.join("images", file));
                                break;

                        case "cub":
                                if( file.startsWith("r-" + this.memId) || file.startsWith("u-" + this.memId) ){
                                    fs.unlinkSync(path.join("uploads", file));
                                }
                                break; 
                        case "tif":
                            if( file.startsWith("r-" + this.memId) || file.startsWith("u-" + this.memId) ){
                                fs.unlinkSync(path.join("uploads", file));
                            }
                            break;
                    }
                }
            });
            return this.memId;
        }
        else{
            return -1;
        }
    }

    /**
     * @function checkAllDate
     * 
     * @param {array} memArray the array that the server is using to store the memeory elements
     */
    checkAllDates( memArray ){
        var returnArr = [];
        memArray.forEach(memoryBlock => {
            if( memoryBlock.checkDate() >= 0 ){
                // do not add the object that was removed
                console.log("Memory Block " + memoryBlock.memId + " has been cleared from the server");
            }
            else{
                returnArr.push( memoryBlock );
                console.log("Memory Instance " + memoryBlock.memId + " preserved");
            }
        });
        return (memArray.length === returnArr.length) ? memArray : returnArr;
    }

    /**
     * @function updateDate
     */
    updateDate(){
        this.lastRequest = Date.now();
    }


    /**
     * @function checkMemInstances
     * 
     * @param {string} id the userId to match 
     * @param {array} array the array that the memory is in
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
     * @function accessMemory
     * 
     * @param {string} id the userId to match 
     * @param {array} array the array that the memory is in
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
 * @function compareDates
 * 
 * @param {Date} start 
 * @param {Date} end 
 * 
 * @returns hours from start to end
 * 
 */
function compareDates(start, end) {
    if(start === end){ return 0; }
    if(start < end){ 
        return parseFloat((end-start)/(3600000));
    }
}