/**
 * @file index.js
 * 
 * @author Chadd Frasier
 * @version 1.0
 * 
 * @since 09/17/2019
 * @updated 10/15/2019
 * 
 * @requires Jquery 2.0.0
 * 
 * @fileoverview this file will hold all the javascript used to submit the files for upload to the server
 *              from the index.ejs file
 * 
 * @see {server.js} Read the header before editing
 */

/** Variables  */
// get needed DOM element
var loader,
    // get the input doms for dimensions
    widthInputBox,
    heightInputBox,
    alertCode;

// get the ids of the different alert boxes
var InfoBox = 'info-alert',
    tplBox = 'tplAlert',
    failureBox = 'fail-alert',
    uploadFail = 'fail-upload',
    imageFail = 'fail-image',
    timeOut = "server-timeout",
    isisRun = "server-isis";

/** --------------------------------------------------- Functions ---------------------------------------- */
/**
 * @function codeToAlert
 * 
 * @description reads the alertCode and makes the proper alert visible on screen
*/
function codeToAlert(){
    if(alertCode == 1){
        var alert = document.getElementById(InfoBox);
        alert.style.visibility = 'visible';
    }
    else if(alertCode == 2){
        var alert = document.getElementById(tplBox);
        alert.style.visibility = 'visible';
    }
    else if(alertCode == 4){
        var alert = document.getElementById(failureBox);
        alert.style.visibility = 'visible';
    }
    else if(alertCode == 5){
        var alert = document.getElementById(uploadFail);
        alert.style.visibility = 'visible';
    }
    else if(alertCode == 6){
        var alert = document.getElementById(imageFail);
        alert.style.visibility = 'visible';
    }
    else if(alertCode == 7){
        var alert = document.getElementById(timeOut);
        alert.style.visibility = 'visible';
    }
    else if(alertCode == 8){
        var alert = document.getElementById(isisRun);
        alert.style.visibility = 'visible';
    }
    else if(alertCode != 0){
        var alert = document.getElementById(InfoBox);
        alert.style.visibility = 'visible';
        var alert2 = document.getElementById(tplBox);
        alert2.style.visibility = 'visible';

    }
}


/**
 * @function setNotVisible
 * 
 * @param {DOM element} element the element that has the x button in it
 * 
 * @description hides the alert boxes when any of their x buttons are clicked
*/
function setNotVisible(element){
    var hideElement = document.getElementById($(element).parent().attr('id'));
    hideElement.style.visibility = 'hidden';    
}


/**
 * @function loadInvisible
 * 
 * @description hide the loader gif
*/
function loadInvisible(){
    loader.style.visibility = 'hidden';
    var divs = document.querySelectorAll("div");   

    divs[divs.length - 1].remove();
}


/**
 * @function resetOtherButtons
 * 
 * @param {element} currentBtn the whole btn element that is being clicked 
 * @param {string} classofButton the string needed to query the correct buttons
 * 
 * @description reset the color using class objects
 */
function resetOtherButtons(currentBtn, classofButton){
    // get the button with the passed class
    var ButtonList = document.querySelectorAll("button." + classofButton);

    // for each button elemnt
    ButtonList.forEach( btn => {
        if(btn !== currentBtn){
            btn.classList.remove("btn-secondary");
        }
    });
}

/**
 * @function loaderActivate
 * 
 * @description show the loader gif
*/
function loaderActivate(){
    // ignore any call to the function if the form is submitted already
    if(document.uploadForm.onsubmit && !document.uploadForm.onsubmit()){
        return;
    }
    else{
        // otherwise show loader and submit the form based on input
        if(heightInputBox.value === "" && widthInputBox.value === ""){
            // 300dpi at 3 inches (300px/in)
            heightInputBox.value = 1500;
            widthInputBox.value = 1500;
            loader.style.visibility = 'visible';
            var div = document.createElement("div");
            div.style.background = "rgba(0,0,0,.5)";
            div.style.width = "100vw";
            div.style.height = "110%";
            div.style.position = "absolute";
            div.style.top = "0";
            document.body.insertBefore(div,this.firstChild);
            document.uploadForm.submit();
        }
        else{
            loader.style.visibility = 'visible';
            var div = document.createElement("div");
            div.style.background = "rgba(0,0,0,.5)";
            div.style.width = "100vw";
            div.style.height = "110%";
            div.style.position = "absolute";
            div.style.top = "0";
            document.body.insertBefore(div,this.firstChild);
            document.uploadForm.submit();
        }
    }
}


/**
 * @function showHelp
 * 
 * @param {DOM element} btn the button that was clicked
 * 
 * @description show the help box when the button is clicked
*/
function showHelp(btn){
    document.getElementById("help-box").style.visibility = "visible";
    btn.className = btn.className.replace("btn-primary","btn-secondary disabled");
}
/** ------------------------------------------ End Functions --------------------------------------------- */

/** ------------------------------------------- Jquery --------------------------------------------------- */
/**
 * @function ready listener which runs after page load
 * 
 * @description after the document is loaded, grab the DOM elements that are needed for these functions
*/
$(document).ready(function(){
    // get needed DOM element
    loader = document.getElementById('loading');

    // get the input doms for dimensions
    widthInputBox = document.getElementById("widthInput");
    heightInputBox = document.getElementById("heightInput");

    var pageVariable = document.getElementById("pageVariable");

    for(let i=0;i<pageVariable.childElementCount;i++){
        if(pageVariable.children[i].id === 'alertCode'){
            alertCode = pageVariable.children[i].innerHTML;
        }
    }


    /**
     * @function helpBtn 'mousedown' event handler
     * 
     * @description hide the help box div
    */
    $("#hideBtn").mousedown(function(){
        // hide the help box
        document.getElementById("help-box").style.visibility = "hidden";
        document.getElementById("helpBtn").className = "btn btn-primary btn-lg";
    });

    /**
     * @function widthInput 'keyup' event listener
     * 
     * @description this is where the width box is fixed to 5000pxs 
     */
    $("#widthInput").keyup(function(event){
        try{
            var val = parseInt($(this).val());

            if(typeof(val) === "number" && val > 5000){
                $(this).val(5000);
            }
            else if(isNaN(val) && $(this).val() !== ""){
                alert("Must Input an integer");
                $(this).val("");
            }
        }
        catch(err){
            console.log(err);
        }
    });

    /**
     * @function heightInput 'keyup' event listener
     * 
     * @description this is where the width box is fixed to 5000pxs 
     */
    $("#heightInput").keyup(function(event){
        try{
            var val = parseInt($(this).val());

            if(typeof(val) === "number" && val > 5000){
                $(this).val(5000);
            }
            else if(isNaN(val) && $(this).val() !== ""){
                alert("Must Input an integer");
                $(this).val("");
            }
        }
        catch(err){
            console.log(err);
        }
    });


    /**
     * @function cubUpload 'change' event listener
     * 
     * @description checks to see if the new file that was added is a cub or tif file and show the otions box
    */
    $("#cubUpload").change(function(){
        var optionBox = document.getElementById("optionBox");
        if(this.value === "" || !/^.*\.(cub|CUB|tif|TIF)$/gm.test(this.value)){
            optionBox.style.display = "none";
        }
        else{
            optionBox.style.display = "flex";
        }
    });


    /**
     * @function tplUpload 'change' listener
     * 
     * @description change the color of the buttons when the file in the template upload input changes
     */
    $("#tplUpload").change(function(){
        resetOtherButtons("", "template");
    });

    /**
     * @function journalOption1 'mousedown' event listener
     * 
     * @description show and hide the button options base on which button is currently clicked
    */
    $("#journalOption1").mousedown(function(event){
        if(document.getElementById("j1Option1").style.visibility === "hidden"){
            document.getElementById("journalOption1").className = "btn btn-lg button btn-secondary";
            document.getElementById("j1Option1").style.visibility = "visible";
            document.getElementById("j1Option2").style.visibility = "visible";
            document.getElementById("j1Option3").style.visibility = "visible";
            if(document.getElementById("j2Option1").style.visibility === "visible"){
                document.getElementById("j2Option1").style.visibility = "hidden";
                document.getElementById("j2Option2").style.visibility = "hidden";
                document.getElementById("j2Option3").style.visibility = "hidden";
                document.getElementById("journalOption2").className = "btn btn-lg button";
            }
        }
        else{
            document.getElementById("j1Option1").style.visibility = "hidden";
            document.getElementById("j1Option2").style.visibility = "hidden";
            document.getElementById("j1Option3").style.visibility = "hidden";
            document.getElementById("journalOption1").className = "btn btn-lg button";
        }
        widthInputBox.value = "";
        heightInputBox.value = "";
    });


    /**
     * @function journalOption2 'mousedown' event listener
     * 
     * @description show and hide the button options base on which button is currently clicked
    */
    $("#journalOption2").mousedown(function(event){
        if(document.getElementById("j2Option1").style.visibility === "hidden"){
            document.getElementById("journalOption2").className = "btn btn-lg button btn-secondary";
            document.getElementById("j2Option1").style.visibility = "visible";
            document.getElementById("j2Option2").style.visibility = "visible";
            document.getElementById("j2Option3").style.visibility = "visible";
            if(document.getElementById("j1Option1").style.visibility === "visible"){
                document.getElementById("j1Option1").style.visibility = "hidden";
                document.getElementById("j1Option2").style.visibility = "hidden";
                document.getElementById("j1Option3").style.visibility = "hidden";
                document.getElementById("journalOption1").className = "btn btn-lg button";
            }
        }
        else{
            document.getElementById("j2Option1").style.visibility = "hidden";
            document.getElementById("j2Option2").style.visibility = "hidden";
            document.getElementById("j2Option3").style.visibility = "hidden";
            document.getElementById("journalOption2").className = "btn btn-lg button";
        }
        widthInputBox.value = "";
        heightInputBox.value = "";
    });


    /**
     * @function button.journal 'mousedown' event listener
     * 
     * @description change the default image output dimensions
    */
    $("button.journal").mousedown(function(event){
        switch($(this).html()){
            case "Single Column":
                widthInputBox.value = 1772;
                heightInputBox.value = 1772;
                break;

            case "1.5 Column":
                widthInputBox.value = 2756;
                heightInputBox.value = 2756;
                break;

            case "Double Column":
                widthInputBox.value = 3740;
                heightInputBox.value = 3740;
                break;

            case "1/4 Page":
                widthInputBox.value = 1870;
                heightInputBox.value = 2264;
                break;

            case "1/2 Page":
                widthInputBox.value = 1870;
                heightInputBox.value = 4528;
                break;

            case "Full Page":
                widthInputBox.value = 3740;
                heightInputBox.value = 4528;
                break;
        }
        
        $(this).addClass("btn-secondary");
        resetOtherButtons(this, "journal");
    });


    /**
     * @function button.template 'mousedown' event listener
     * 
     * @description change the default image output dimensions
    */
   $("button.template").mousedown(function(event){
        switch($(this).html()){
            case "Mosaic":
                document.getElementById("tplCode").value = 1;
                break;
            case "Map Projected":
                document.getElementById("tplCode").value = 2;
                break;
            case "Composite":
                document.getElementById("tplCode").value = 3;
                break;
            default:
                document.getElementById("tplCode").value = 0;
        }
        
        $("#tplUpload").val("");
        $(this).addClass("btn-secondary");
        resetOtherButtons(this, "template");
    });
});
/**
 * @function window 'pageshow' event handler
 * 
 * @description run the startup functions for the page's initial load
*/
$(window).bind("pageshow", function(event) {
    // check if the page was loaded from the cache
    if (event.originalEvent.persisted) {
        loadInvisible();
        codeToAlert(); 
    }
    else{
        codeToAlert();
    }   
});
/** ----------------------------------------- End Jquery ------------------------------------------------- */