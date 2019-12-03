/**
 * @file writer.js
 * 
 * @author Chadd Frasier
 * @version 2.0
 * 
 * @since 09/20/2019
 * @updated 10/15/2019
 * 
 * @requires Jquery 2.0.0
 * 
 * @fileoverview This file is for all of the writer functionality in the writer.ejs file
 * 
 * @see {server.js} Read the header before editing
 */

/** Variables */
var outputName,
    loader,
    cursorLocation;

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
    let getTemplate = document.getElementById("template-text").innerText;
    output(getTemplate);
}
            
/**
 * @function getMetadata
 * 
 * @description parse out the important tags and populate the tag area
*/
function getMetadata(){
    var metaDataString = document.getElementById("metadata-text").innerText;
    var metaDataArea = document.getElementById("metadataTagArea");
    metaDataArea.value = "";
    var jsonData = JSON.parse(metaDataString);
    
    //'StartTime': '1997-10-20T10:58:37.46'
    for(const key of Object.keys(jsonData)){
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
    for(const key of Object.keys(metaData)){
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
    var impData = JSON.parse(document.getElementById("metadata-text").innerText);

    // combine the JSONs into 1 object
    allMetaData = Object.assign(allMetaData,impData);
    // loop through all data 
    for(datakey in allMetaData){
        //if the key is found
        if(datakey === key){
            //trim the data and return the result
            return allMetaData[ datakey ].trim();
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
 * @function Object.prototype.sort
 * 
 * @description sort the object in order of key length
 */
Object.prototype.sort = function(){
    
    let keys = Object.keys(this);

    keys.sort(function(a, b){
        return a.length < b.length;
    });
    var sortedObject = new Object();

    for(let index = 0; index < keys.length; index++){
        sortedObject[ String(keys[index]) ] = this[ String(keys[index]) ];
    }

    return sortedObject;
}


function string2Element(string, element){
    var element = document.createElement(element);
    element.innerHTML = string;
    return element;
}


// TODO: this fails when refreshing b/c the values in the elements have changed
// ||||
// VVVV
/** 
 * @function output
 * 
 * @param {string} rawText the raw text of the output before data has been exchanged 
 * 
 * @description set the output of the template to the caption area
*/
function output(rawText){
    var outputArea = document.getElementById("template-text-output"),
    download = rawText;

    // get both data objects
    var allMetaData = JSON.parse(document.getElementById("all-tag-text").value);
    var impData = JSON.parse(document.getElementById("metadata-text").innerText);

    // combine the JSONs into 1 object
    allMetaData = Object.assign(allMetaData, impData);

    rawText = rawText.replaceAll("\n", document.createElement("br").outerHTML);

    for( const key of Object.keys(allMetaData.sort()) ){
        if(rawText.indexOf(key.trim()) > -1) {
            let val = getMetadataVal(key);
            if(hasUnits(val)){
                val = removeUnits(val);
            }

            download = download.replaceAll(key, val.trim());

            // convert to red color parargraph element
            val = string2Element(val, "p");
            val.style.color = "red";
            val.style.padding = "0";
            val.style.margin = "0";
            val.style.width = "auto";
            val.style.display = "inline-flex";
            val.style.fontSize = "inherit";
            val.style.textAlign = "left";
            val.style.verticalAlign = "bottom";

            rawText = rawText.replaceAll(key,val.outerHTML);
        }
    }

    //set the innerHTML for the last(output) textarea
    outputArea.innerHTML = rawText;
    
    //update the download link to the new text
    var copyBox = document.getElementById("copyBtnText");
    copyBox.innerHTML = download;
    var tpl = document.getElementById("link");
    tpl.href = 'data:attachment/text,' + encodeURIComponent(download);
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
        // Switch to important tags
        val = "Show All Tags";
        document.getElementById("button-more-tags").innerHTML = val;
        document.getElementById("tagTitle").innerHTML = "Common Tags";
        textArea.value = metaTags.value;
    }
    else{
        //show all the tags
        val = "Show Important Tags";
        document.getElementById("button-more-tags").innerHTML = val;
        document.getElementById("tagTitle").innerHTML = "All Tags";
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

/**
 * @function hideAnimaton
 * 
 * @param {element} alert the element that needs to have the hide animation played
*/
function hideAnimaton(alert){
    alert.style.animation = "fadeOut 2s linear";
    alert.style.webkitAnimation = "fadeOut 2s linear";
    setTimeout(
        function(){
            alert.remove();
        }, 2000);
}


function boldenKeys(element){
    // save cursor
    var sel = rangy.saveSelection(element);
    
    var output = element.innerHTML.replaceAll("<b>", "").replaceAll("</b>", "");

    // get both data objects
    var allMetaData = JSON.parse(document.getElementById("all-tag-text").value);
    var impData = JSON.parse(document.getElementById("metadata-text").innerText);

    // combine the JSONs into 1 object
    allMetaData = Object.assign(allMetaData, impData);

    for( const key of Object.keys(allMetaData.sort()) ){
        if(output.indexOf(key) > -1 ){
            output = boldenEachString(key, output);
            output = removeDoubleBold(output);
        }
    }

    element.innerHTML = output;
    // set cursor
    rangy.restoreSelection(sel, true);
}

function removeDoubleBold( html ){
    while( html.indexOf("<b><b>") > -1 ){
        html = html.replaceAll("<b><b>", "<b>").replaceAll("</b></b>","</b>");
    }
    return html;
}


function boldenEachString(key, html){
    var wordArr = html.split("<br>");

    if(wordArr){
        for( var i = 0; i < wordArr.length; i++ ) {
            var word = wordArr[i].split(" ");
            for( var j = 0; j < word.length; j++ ) {
                if( word[j] === key ) {
                    html = html.replaceAll(key, string2Bold(key));
                }
                else if( word[j].indexOf(key) > -1){
                    html = html.replaceAll(key, string2Bold(key));
                }
            }
        }
    }

    return html;
}

/**
 * 
 * @param {*} string 
 */
function string2Bold(string) {
    var b = document.createElement("b");

    if(!string.indexOf("<b>") > -1){
        b.innerHTML = string;
    }
    return b.outerHTML;
}

/** ----------------------------------------- End Basic Functions ---------------------------------------- */
/** ----------------------------------------- Jquery Functions ------------------------------------------- */
// runs this code after the page is loaded
$(document).ready(function(){
    var varDiv = document.getElementById("pageVariables"),
        goForward = false;
    
    loader = document.getElementById('loading');

    // grab the variables from the server
    for(let i=0; i<varDiv.childElementCount;i++){
        if(varDiv.children[i].id === 'outputName'){
            outputName = varDiv.children[i].innerHTML;
        }
    }

    // try fetching the log file for the user and dont display if fetch fails to locate it
    fetch("/log/" + getCookie("puiv") + "?isTest=true",{method:"GET"})
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
     * @function imagePageBtn 'mousedown' event listener
     * 
     * @description this is to handle the switch back and forth from 
     *              the image page when the user was there last
    */
    $("#imagePageBtn").mousedown(function(){
        // if the image page is the last page
        if(document.referrer.indexOf("/imageEditor") > -1){
            window.history.back();
        }
        else if(goForward){
            // preserve chnages to image page when firefox is the browser
            window.history.forward();
        }
        else{
            // this line of code only works assuming the image button is the first form on the page
            let imageForm = document.getElementsByTagName("form")[0];
            goForward = true;
            imageForm.submit();
        }
    });

    /**
     * @function copyBtn 'mousedown' event handlers
     * 
     * @description copy the output box text to the clipboard
    */
    $("#copyBtn").on("mousedown",function(){
        // get the output field
        var output = document.getElementById("copyBtnText");

        output.value = output.innerHTML;
        output.style.visibility = "visible";
        // call the select function
        output.select();
        // select for touch screens
        output.setSelectionRange(0,99999);

        document.execCommand("copy");
        output.style.visibility = "hidden";
        // set up the alert to inform the user
        var alert = document.createElement("div");
        alert.className = "alert alert-success";
        alert.style.position = "absolute";
        alert.style.top = "25%";
        alert.style.width = "17%";
        alert.style.fontSize = "1.5rem";
        alert.style.left = "1%";
        alert.innerHTML = "Output has been copied to clipboard";
        alert.style.opacity = 1;

        // add the alert
        document.body.appendChild(alert);
        // set the fade timeout
        setTimeout(hideAnimaton, 2000, alert);
    });

    /**
     * @function specialCharactersBtn 'mousedown'
     * 
     * @description shows and removes the special characters buttons under the output box
     */
    $("#specialCharactersBtn").mousedown(function(){
        if($(this).hasClass("btn-secondary")){
            $(this).removeClass("btn-secondary");
            cursorLocation = null;
            document.getElementById("specialCharBox").style.display = "none";
        }
        else{
            $(this).addClass("btn-secondary");
            document.getElementById("specialCharBox").style.display = "block";
            cursorLocation = document.getElementById("template-text").selectionEnd;
            console.log(document.getElementById("template-text").selectionStart);
        }
    });


    /**
     * @function templateDownloadBtn 'mousedown'
     * 
     * @description template download functionality with naming convention
     */
    $("#templateDownloadBtn").mousedown( function(){
        var templateText = document.getElementById("template-text").value;
        var data = encodeURIComponent(templateText);
        
        var filename = prompt("Enter Template Name",outputName.replace("_PIPS_Caption.txt", ".tpl"));

        if(filename !== null && /^.*\.(tpl)$/gm.test(filename)){
            var a = document.createElement("a");
            a.href = "data:attachment/text," + data;
            a.target = "__blank";
            a.download = filename;
    
            a.click();
        }
        else if(filename !== null){
            $("#templateDownloadBtn").mousedown();
        } 
    });


    /**
     * @function addTagBtn 'click' handler
     * 
     * @description create a box to handle the input of a new tag
     */
    $("#addTagBtn").click( function() {
        // create the elements
        var div = document.createElement("div"),
            buttonBox = document.createElement("div"),
            title = document.createElement("h3"),
            tagInput = document.createElement("input"),
            tagLabel = document.createElement("label"),
            valInput = document.createElement("input"),
            valLabel = document.createElement("label"),
            cancelBtn = document.createElement("button"),
            submitBtn = document.createElement("button");

        // design the box for adding tags
        div.className = "shadowbox";
        div.style.position = "absolute";
        div.style.left = "38%";
        
        div.style.top = "50%";
        div.style.zIndex = "10";
        div.style.width = "18%";
        div.style.height = "18%";
        div.style.border = "2px solid black";

        tagLabel.style.position = "absolute";
        tagLabel.style.left = "10%";
        tagLabel.style.top = "36%";
        tagLabel.innerHTML = "New Tag: ";
        tagLabel.style.color = "black";

        buttonBox.style.width = "75%",
        buttonBox.style.background = "transparent",
        buttonBox.style.height = "100%";

        tagInput.style.position = "absolute";
        tagInput.style.left = "35%";
        tagInput.style.top = "35%";
        tagInput.placeholder = "New Tag";

        valLabel.style.position = "absolute";
        valLabel.style.left = "10%";
        valLabel.style.top = "54%";
        valLabel.innerHTML = "New Value: ";
        valLabel.style.color = "black";

        valInput.style.position = "absolute";
        valInput.style.left = "35%";
        valInput.style.top = "55%";
        valInput.placeholder = "New Value";

        title.innerHTML = "Create a New Tag";
        title.style.position = "absolute";
        title.style.color = "black";
        title.style.left = "19%";

        cancelBtn.className = "btn btn-sm btn-danger button";
        cancelBtn.innerHTML = "Cancel";
        cancelBtn.style.position = "absolute";
        cancelBtn.style.left = "10%";
        cancelBtn.style.top = "75%";

        // cancel listener
        cancelBtn.addEventListener("mousedown", (event) => {
            div.remove();
        });

        submitBtn.className = "btn btn-sm button";
        submitBtn.innerHTML = "Submit";
        submitBtn.style.position = "absolute";
        submitBtn.style.left = "70%";
        submitBtn.style.top = "75%";

        // submit listener
        submitBtn.addEventListener("mousedown", (event) => {
            // if both values are not empty
            if(tagInput.value !== "" && valInput.value !== ""){
                // trim extra spaces
                tagInput.value = tagInput.value.trim();
                valInput.value = valInput.value.trim();

                // add these values into the common tag section
                var metadata = document.getElementById("allTagArea").value,
                    metaDataText = JSON.parse(document.getElementById("all-tag-text").value),
                    tags = document.getElementById("metadataTagArea"),
                    impData = JSON.parse(document.getElementById("metadata-text").value),
                    newString = "[[ " + tagInput.value + " ]]: " + valInput.value;
                
                // temp array
                let tmpArr = metadata.split("\n");
                let impArr = tags.value.split("\n");

                // loop through the important data
                for( var i=0; i<impArr.length; i++ ) {
                    // if the tag value is the same as the input
                    if(impArr[i] && impArr[i].split(": ")[0].split(" ")[1].trim() === tagInput.value) {

                        // confirm that the user wants to change this value
                        var userChoice = confirm("Are you sure you would like to change the " + tagInput.value + " value?");

                        // if confirmed
                        if( userChoice ) {
                            // add the value to the array of tags
                            impArr[i] = impArr[i].split(": ")[0] + ": " + valInput.value;
                            impData[tagInput.value] = (!isNaN(parseFloat(valInput.value))) 
                                                                    ? parseFloat(valInput.value)
                                                                    : valInput.value;
                            // form data
                            var fd = new FormData();
                                headers = new Headers();
                            
                            // append data as a string to the form
                            fd.append("data", JSON.stringify(impData));

                            // update the common data
                            fetch("/impDataUpdate", 
                            {
                                method: 'POST',
                                body: fd,
                                headers: headers
                            }).then(response => {
                                response.blob().then( blob => {
                                    // read result
                                    var reader = new FileReader();
                                    reader.readAsText(blob);
    
                                    reader.onloadend = () => {
                                        console.log(reader.result);
                                    };
                                });
                            });
                        }
                    }
                }

                // join the array and save it to the element
                tags.value = impArr.join("\n");

                // add the tag to the data
                metaDataText[tagInput.value] = valInput.value;

                // push the new stirng
                tmpArr.push(newString);

                // update the data on the page
                document.getElementById("metadata-text").value = JSON.stringify(impData);
                document.getElementById("allTagArea").value = tmpArr.join("\n");
                document.getElementById("all-tag-text").value = JSON.stringify(metaDataText);
                // remove the tab we created
                div.remove();

                // update the tag section
                showMoreTags();
                showMoreTags();
            }
        });

        // add elements in order
        div.appendChild(title);
        buttonBox.appendChild(tagInput);
        buttonBox.appendChild(valInput);

        div.appendChild(valLabel);
        div.appendChild(tagLabel);
        div.appendChild(buttonBox);
    
        div.appendChild(submitBtn);
        div.appendChild(cancelBtn);
        document.body.insertBefore(div,document.body.firstChild);

        tagInput.focus();
    });

    /**
     * @function button[class=specChar] 'mousedown'
     * 
     * @description take the value in the button and add it to the textbox at the location of the cursor
     */
    $("button.specChar").mousedown(function(){
        // get needed data
        var symbol = String($(this).html()).trim(),
            templateText = document.getElementById("template-text").innerText,
            end = templateText.substring(cursorLocation, templateText.length),
            start = templateText.substring(0, cursorLocation++);

        // append the symbol to the start string
        start += symbol;

        // append the two halves
        document.getElementById("template-text").innerText =  String(start + end);
        setOutput();
    
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
     * @function template-text 'keydown' listener
     * 
     * @description this listener allows the user to insert tab characters into the form field without moving to the next field
    */
    $("#template-text").keyup( function(e){
        console.log("\n--------------INNERHTML: \n" + this.innerHTML + "\n-----------------------");
        console.log(e.keyCode);
        if(e.keyCode !== 37
            && e.keyCode !== 38
            && e.keyCode !== 39
            && e.keyCode !== 40 ){
            boldenKeys(this);
        }
        

        return false;
    });



    /**
     * testing
     
    $(document).keydown(function (e) {
        var thisKey = e.which;
      
        if (e.ctrlKey) {
          if (thisKey == 90) alert('Undo');
          else if (thisKey == 89) alert('Redo');
        }
      });

*/

    /**
     * @function logDownloadBtn 'mousedown' listener
     * 
     * @description fetch and download a file by passing the file back as a download 
     *          and then converting the file into to a blob
    */
    $("#logDownloadBtn").mousedown(function(event){
        fetch("log/" + getCookie("puiv"), {method:"GET"})
            .then(function(response){
                // convert response to blob
                response.blob()
                .then((blob) => {
                    // create the download link
                    var a = document.createElement('a');
                    // set the file name
                    a.download = getCookie("puiv") + ".log";
                    // set the href to the object url
                    a.href = URL.createObjectURL(blob);
                    a.target = "__blank";
                    // add the link
                    document.body.appendChild(a);
                    // start download
                    a.click();
                    // remove link
                    a.remove();
                });
        }).catch(function(err){
            if(err){
                console.log(err);
            }
        })
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

    // trim extra space off of template file
    document.getElementById("template-text").innerHTML =
        document.getElementById("template-text").innerHTML.replaceAll("\n", document.createElement("br").outerHTML);

    // start page actions
    loadInvisible();
    setOutput();
    getMetadata();
    getAllTags();
    initTags();
});
/** ----------------------------------------- End Jquery Functions --------------------------------------- */