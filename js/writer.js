/**
 * @file writer.js
 * 
 * @author Chadd Frasier
 * 
 * @since 09/17/19
 * 
 * @fileoverview This file is for all of the writer functionality in the writer.ejs file
 * 
 * @see {server.js} Read the header before editing
 */

/** Variables */

var outputName,
    loader;

// punctuation to be ignored
let unwantedPunc = ['.',',','-','?','!','%','#','@','$',':',';','"',"'","<",">"];


/** -------------------------------- Basic Functions ----------------------------------------------------- */

/**
 * @function filterTags
 * 
 * @description grab the filter section text and search for any values that contain that string in the tags
*/
function filterTags(){
    let filterValue = document.getElementById("filterInput").value;
    let dataTagField = (document.getElementById("button-more-tags").innerHTML === "Show All Tags")
                            ? document.getElementById("metadataTagArea").value 
                            : document.getElementById("allTagArea").value;

    // all lines of the visible tag section
    let dataLines = dataTagField.split("\n");

    // mak sure the filterValue is not 0 and the length of the string is at least 3 characters long
    if(filterValue !== "" && filterValue.length >= 2){
        var filteredArray = [];
        
        // for every line that contains the filtering string push the line into an array
        for(line in dataLines){
            if(dataLines[line].toLowerCase().indexOf(filterValue.toLowerCase()) > -1)
            {
                filteredArray.push(dataLines[line]);
            }
        }
        // set the tag field to he new filtered array
        document.getElementById("test").value = filteredArray.join("\n");   
    }
    else{
        // if not filtering the data just set the data to the default
        document.getElementById("test").value = dataTagField;
    }
}

/**
 * @function setOutput
 * 
 * @description sets the value of the output to the template and then calls output() 
 */
function setOutput(){
    let getTemplate = document.getElementById("template-text").value;
    document.getElementById("template-text-output").innerHTML = getTemplate;
    output();
}
            
/**
 * @function getMetadata
 * 
 * @description parse out the important tags and populate the tag area
*/
function getMetadata(){
    var metaDataString = document.getElementById("metadata-text").value;
    var metaDataArea = document.getElementById("metadataTagArea");
    metaDataArea.value = "";
    var jsonData = JSON.parse(metaDataString);
    
    //'StartTime': '1997-10-20T10:58:37.46'
    for(key in jsonData){
        //console.log('key: ' + key + ':val:' + jsonData[key]);
        if(key != undefined){  
            let str = keyToTag(key) + ": " + jsonData[key] + "\n";
            metaDataArea.value += str;
        }
    }

}

/**
 * @function getAllTags
 * 
 * @description retrieve all the tags from the passedTXT and populate the all tag area with tag format
*/
function getAllTags(){
    var metaData = document.getElementById("passedTXT").value;
    var metaDataArea = document.getElementById("allTagArea");
    metaDataArea.value = "";
    metaData = JSON.parse(metaData);
    for(key in metaData){
        let str = keyToTag(key) + ": " + metaData[key].toString().trim() + "\n";
        metaDataArea.value += str;
    }
}

/**
 * @function keyToTag
 * 
 * @param {string} the key value of the data to be converted
 * 
 * @description converts key balues into tags for display on the UI
*/
function keyToTag(key){
    var tag = "[[ " + key + " ]]";
    return tag;
}

/**
 * @function removePunctuation
 * 
 * @param {string} key the key value to remove the puncuation from
 * 
 * @description returns true if punctuation needs to be parsed out false if there is no punctuation  
 */ 
function removePunctuation(key){
    for(index in unwantedPunc){
        if(key[key.length - 1] === unwantedPunc[index] || key[0] === unwantedPunc[index]){
            return true;
        }
    }
    return false;
}

/**
 * @function exchangeData
 * 
 * @param {string} keyString complete string that needs to be parsed
 * 
 * @description parses out the data key and adds back the puctuation that was removed
*/
function exchangeData(keyString){
    let Farr =[],
        Barr = [],
        key;
    // parse front to back until non-punctuation value is found then stop
    for(let i = 0; i<keyString.length; i++){
        if(unwantedPunc.includes(keyString[i])){
            Farr.push(keyString[i]);
        }
        else{
            break;
        }
    }
    // parse back to front until non-punctuation value is found then stop
    for(let i = keyString.length-1; i>0; i++){
        if(unwantedPunc.includes(keyString[i])){
            Barr.push(keyString[i]);
        }
        else{
            break;
        }
    }
    // use the length of the arrays to substring out the key value
    key = keyString.substring(Farr.length,keyString.length - Barr.length);
    // get the actual value
    let val = getMetadataVal(key);

    // if the key is the same as val then it isn't a data value
    if(key !== val){
        if(hasUnits(val)){
            val = removeUnits(val);
        }
        // join arrays and add the new data value in between
        return Farr.join("") + val + Barr.join("");
    }
    else{
        // just return the string
        return keyString;
    }


}

/**
 * @function getMetadataVal
 * 
 * @param {string} key the key value in the metadata object
 * 
 * @description get a value out of the data that matches the key passed
*/
function getMetadataVal(key){
    // get both data objects
    var allMetaData = JSON.parse(document.getElementById("all-tag-text").value);
    var impData = JSON.parse(document.getElementById("metadata-text").value);

    // combine the JSONs into 1 object
    allMetaData = Object.assign(allMetaData,impData);
    // loop through all data 
    for(datakey in allMetaData){
        //if the key is found
        if(datakey === key){
            //trim the data and return the result
            return allMetaData[datakey].trim();
        } 
        // if the key has puncuation in it
        else if(removePunctuation(key)){
            // remove the punctuation from the ends and add it back after the data is added
            return exchangeData(key);
        }
    }
    return key;
}

/**
 * TODO: this function might be able to be used instead of parsing out the punctiation in loops
 * @function replaceAll
 *
 * @param {string} find the substring to replace
 * @param {string} replace the value to replace the substring with
 * 
 * @description prototype string function that replaces every occurance of a string with another given value
*/ 
String.prototype.replaceAll = function(find, replace){
    var str = this;
    return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
}

/**
 * @function hasUnits
 * 
 * @param {string} str the string to test for unit format
 * 
 * @description return true if the data value has units in it, false if not
*/
function hasUnits(str){
    if(str.indexOf("<") > -1 && str.indexOf(">") > -1){
        return true;
    }
    else{
        return false;
    }
}

/**
 * @function removeUnits
 * 
 * @param {string} str the string to be parsed for units
 * 
 * @description remove the units string out of the value leaving only the important parts
*/
function removeUnits(str){
    let tmpArr = str.split(" "),
        unitsFound = false;

    for(index in tmpArr){
        if(tmpArr[index].indexOf("<") > -1 || tmpArr[index].indexOf(">") > -1 && !unitsFound){
            // remove this index and everything after
            tmpArr[index] = "";
            unitsFound = true;
        }
        else if(unitsFound){
            tmpArr[index] = "";
        }
    }

    return tmpArr.join("");
}

/**
 * @function output
 * 
 * @description set the output of the template to the caption area
*/
function output(){
    var tempText = document.getElementById("template-text").value;

    //Find values of keys one by one, replace "[[...]]" with their value
    var tempArr = tempText.split(' ');
    for(var i=0; i<tempArr.length; i++){

        
        // get the val of the tag
        tempArr[i] = getMetadataVal(tempArr[i].trim());
        
        if(hasUnits(tempArr[i])){
            tempArr[i] = removeUnits(tempArr[i]);
        }
        
    }
    
    tempText = tempArr.join(' ');
    
    //set the innerHTML for the last(output) textarea
    var output = document.getElementById("template-text-output").innerHTML = tempText;

    //update the download link to the new text
    var finalResult = output;
    var tpl = document.getElementById("link");
    tpl.href = 'data:attachment/text,' + encodeURIComponent(finalResult);
    tpl.target = '_blank';
    tpl.download = outputName;
}

/**
 * @function showMoreTags
 * 
 * @description display the all tags in the live div or display the important tags if it already is showing all
*/
function showMoreTags(){
    var val = document.getElementById("button-more-tags").innerHTML;
    var textArea = document.getElementById("test");
    var metaTags = document.getElementById("metadataTagArea");
    var importantTags = document.getElementById("allTagArea");
    val = val.toString();
    if(val === "Show Important Tags"){
        val = "Show All Tags";
        document.getElementById("button-more-tags").innerHTML = val;
        textArea.value = metaTags.value;
    }
    else{
        val = "Show Important Tags";
        document.getElementById("button-more-tags").innerHTML = val;
        textArea.value = importantTags.value;
    }

    if(document.getElementById("filterInput").value !== ""){
        filterTags();
    }
}

/**
 * @function loadInvisible
 * 
 * @description hide the loader gif
*/
function loadInvisible(){
    loader.style.visibility = 'hidden';    
}

/**
 * #@function loaderActivate
 * 
 * @description show the loader gif
*/
function loaderActivate(){
    loader.style.visibility = 'visible';
}

/**
 * @function initTags
 * 
 * @description sets up the UI by calling the showMoreTags function to populate the tag area
 */
function initTags(){
    // write default to tag section
    showMoreTags();
}
/** ----------------------------------------- End Basic Functions ---------------------------------------- */

/** ----------------------------------------- Jquery Functions ------------------------------------------- */
// runs this code after the page is loaded
$(document).ready(function(){
    var varDiv = document.getElementById("pageVariables");
    loader = document.getElementById('loading');

    // grab the variables from the server
    for(let i=0; i<varDiv.childElementCount;i++){
        if(varDiv.children[i].id === 'outputName'){
            outputName = varDiv.children[i].innerHTML;
        }
    }

    /**
     * @function helpBtn 'mousedown' event handler
     * 
     * @description show the help box div
    */
    $("#helpBtn").on("mousedown",function(){
        // show the help box
        document.getElementById("help-box").style.visibility = "visible";
    });

    /**
     * @function helpBtn 'mousedown' event handler
     * 
     * @description hide the help box div
    */
    $("#hideBtn").on("mousedown",function(){
        // hide the help box
        document.getElementById("help-box").style.visibility = "hidden";
    });

    /**
     * @function template-text 'keyup' event handler
     * 
     * @description set the new output value whenever a new character is added to the template
    */
    $("#template-text").keyup(function(){
        setOutput();
    });

    /**
     * @function filterInput 'keyup' event handler
     * 
     * @description set the tag section to the fitered version by calling the filterTags()
    */
    $("#filterInput").keyup(function(){
        filterTags();
    });
}); // end document ready

/**
 * @function window 'pageshow' event handler
 * 
 * @description run the logic to start the page
*/
$(window).bind('pageshow', function(event){
    // if this page was rendered from the cache hide the loader
    if(event.originalEvent.persisted){
        loadInvisible();
    }

    // start page actions
    loadInvisible();
    setOutput();
    getMetadata();
    getAllTags();
    initTags();
});
/** ----------------------------------------- End Jquery Functions --------------------------------------- */