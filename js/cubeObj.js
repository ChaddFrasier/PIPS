
module.exports = class Cube{
    /**
     * 
     * @param {sting} cubeName 
     */
    constructor(cubeName){
        this._cubeName = cubeName;
        
        // create JSON elements
        this._data = {};
        this._impData = {};
    }

    /**
     * @param void
     * 
     * get cubeName
     */
    get name(){
        return this._cubeName;
    }

    /**
     * 
     * @param void 
     */
    get data(){
        return JSON.stringify(this._data);    
    }

    /**
     * 
     * @param void 
     */
    get impData(){
        return JSON.stringify(this._impData);    
    }

    /**
     * @param {JSON} data     
     *  
     * append json object in this cube object
     */
    set data(data){
        this._data = data;
    }

     /**
     * @param {JSON} data     
     *  
     * append json object in this cube object
     */
    set impData(data){
        this._impData = data;
    }
}