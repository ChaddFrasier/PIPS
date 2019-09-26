/**
 * @file writer.js
 * 
 * @author Chadd Frasier
 * 
 * @since 09/20/19
 * 
 * @requires Jquery 2.0.0
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
    output(getTemplate);
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
    }
    return key;
}

/**
 * @function replaceAll
 *
 * @author Brandon Kindrick
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
 * @function getCookie
 * 
 * @param {string} cname the name of the cookie value to find
 * 
 * @description reads all browser cookies and finds the cookie value with the given name
 * 
*/
function getCookie(cname){
    // atach the '=' to the name
    var name = cname + "=";
    // get the string version of the object
    var decodedCookie = decodeURIComponent(document.cookie);
    // get array of every cookie found
    var cookieArr = decodedCookie.split(';');
    // loop through the cookies and match the name
    for(var i = 0; i < cookieArr.length; i++){
        var cookie = cookieArr[i];
        // if the first character is a space, find the start of the cookie name
        while (cookie.charAt(0) == ' '){
            // get a substring of the cookie with the ' ' removed
            cookie = cookie.substring(1);
        }
        // if the cookie string contains the cname+'='
        if (cookie.indexOf(name) == 0){
            // return that cookie
            return cookie.substring(name.length, cookie.length);
        }
    }
    // not found
    return "";
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
 * @param {string} rawText the raw text of the output before data has been exchanged 
 * 
 * @description set the output of the template to the caption area
*/
function output(rawText){
    var outputArea = document.getElementById("template-text-output");

    // get both data objects
    var allMetaData = JSON.parse(document.getElementById("all-tag-text").value);
    var impData = JSON.parse(document.getElementById("metadata-text").value);

    // combine the JSONs into 1 object
    allMetaData = Object.assign(allMetaData, impData);
    
    for(key in allMetaData){
        if(rawText.indexOf(key.trim()) > -1){
            let val = getMetadataVal(key);
            if(hasUnits(val)){
                val = removeUnits(val);
            }
            rawText = rawText.replaceAll(key,val);
        }
    }

    //set the innerHTML for the last(output) textarea
    outputArea.innerHTML = rawText;

    //update the download link to the new text
    var finalResult = outputArea.value;
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


    fetch("/log/" + getCookie("userId"),{method:"GET"})
        .then(function(response){
            if(Number(response.status) !== 200){
                document.getElementById("logDownloadBtn").style.display = "none";  
            }
        }).catch(function(err){
            console.log(err);       
        });



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

    /** 
     * @function
     * 
     * @description
     */
    $("#template-text").keydown(function(e){
        if(e.keyCode === 9) { // tab was pressed
            // get caret position/selection
            var start = this.selectionStart;
                end = this.selectionEnd;
    
            var $this = $(this);
    
            // set textarea value to: text before caret + tab + text after caret
            $this.val($this.val().substring(0, start)
                        + "\t"
                        + $this.val().substring(end));
    
            // put caret at right position again
            this.selectionStart = this.selectionEnd = start + 1;
    
            // prevent the focus lose
            return false;
        }
    });

    $("#logDownloadBtn").mousedown(function(event){
        fetch("log/" + getCookie("userId"), {method:"GET"}).then(function(response){
            response.blob().then((blob) => {
                var a = document.createElement('a');

                a.download = getCookie("userId") + ".log";
                a.href = URL.createObjectURL(blob);
                a.target = "__blank";
                document.body.appendChild(a);

                a.click();
            });
        }).catch(function(err){
            if(err){
                console.log(err);
            }
        })
    })
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