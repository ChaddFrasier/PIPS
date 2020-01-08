/**
 * @file imageEditor.js
 * 
 * @author Chadd Frasier
 * @version 2.2
 * 
 * @since 09/20/2019
 * @updated 12/12/2019
 * 
 * @requires Jquery 2.0.0
 * 
 * @fileoverview This file houses all of the functions and logic that gives life to the image editor page.
 *      The imagePage.ejs page was getting too big and this is easier to read.
 * 
 * @see {server.js} Read the header before editing
 */

/** ---------------------------------------- DOM Variables ----------------------------------------------- */
var loader,
    svg,
    textSize,
    w,
    h,
    isMapProjected,
    // toggle colors tracker
    toggleScalebar = true,
    userTextColor,
    // declare the drawing flag
    drawFlag = false,
    // save the elements to dynamically add and remove them with a single line of code
    sunImage,
    northImage,
    outlineBox,
    eyeImage,
    eyeArrow,
    scaleBarIcon,
    bg,
    layerId = 0,
    objectIds = 0;

//create arrays
var clickArray = [],
    lineArr = [], 
    keys = [],
    // array for removing text
    textBoxArray = [];

// set values for calculating outline box size 
var mouseX,
    mouseY,
    startX,
    startY,
    // degree variables
    northDegree,
    sunDegree,
    observerDegree;

// create an enumerated object for setting the scaling boxes
var placeEnum = new Object({
        "top-left": 1,
        "top-right": 2,
        "bottom-right": 3,
        "bottom-left": 4
        });

/** ---------------------------------------- End DOM Variables ------------------------------------------- */

/** ---------------------------- Draggable Function ------------------------------------------------------ */

/**
 * @function makeDraggable
 * 
 * @param {event} event the svg element that we want to be able to drag around on top of
 * 
 * @description This function initializes all the draggable elements in the svg element.
 *  It adds all the event listener functions for manipulating the icons that need to be changed.
 * 
 *  Note: This function needs to be called whenever any object is added to the inline svg or the 
 * size of the svg changes otherwise the functions will not find the new icons or the icons
 * will not register the bpoundry of the svg sapce.
 * 
*/
function makeDraggable(event){
        
    // get svg element
    var svg = event;

    // adds event functions to the whole svg element
    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup', endDrag);
    svg.addEventListener('mouseleave', endDrag);
    
    // decrale all global function variables for dragging
    var selectedElement, offset, transform,
        bbox, minX, maxX, minY, maxY, confined,elementOver;
    // & for resizing
    var resizing = false,
        dragging = false,
        currentScale,
        startH,
        startW,
        minNorth = .2439026,
        maxNorth = 2.439026,
        minSun = .3125,
        maxSun = 3.125,
        minEye = 1.18,
        maxEye = 11.8,
        maxText = textSize*10,
        minText = textSize,
        iconMin,
        iconMax,
        outlineMin = .125,
        scale;
    
    // sets boundries for draggable objects when confined based on the view box
    // minX = x of viewbox
    var boundaryX1 = Number(svg.getAttribute('viewBox').split(" ")[0]);
    // maxX = the width of the viewbox - the absolute value of the x value
    var boundaryX2 = Number(svg.getAttribute('viewBox').split(" ")[2]) - 
                    Math.abs(Number(svg.getAttribute('viewBox').split(" ")[0]));
    // minY = y of the viewBox
    var boundaryY1 = Number(svg.getAttribute('viewBox').split(" ")[1]);
    // maxY = the height of the viewbox - the absolute value of the  y of the view box
    var boundaryY2 = Number(svg.getAttribute('viewBox').split(" ")[3]) -
                        Math.abs(Number(svg.getAttribute('viewBox').split(" ")[1]));

    /**
     * @function getMousePosition
     * 
     * @description gets mouse x y coordinates based on the tranform of the svg element
     * 
    */
    function getMousePosition(event){
        // get transform matrix in relation to svg
        var CTM = svg.getScreenCTM();
        // Note: calculations where found on a blog post
        // return the calculated x and y coordinates of the mouse
        return{
            x: (event.clientX - CTM.e) / CTM.a,
            y: (event.clientY - CTM.f) / CTM.d
        };
    }


    /**
     * @function startDrag
     * 
     * @param {event} event the click event
     * 
     * @description this runs whenever the mousedown in registered
     *      This function retrieves the transform variables, and sets the draggable boundry 
     *      as well as setting the scale limits for which ever icon is clicked on,
     *      also sets flags for scaling
     * 
    */
    function startDrag(event){
        // get the mouseX and mouseY on the client
        mX = event.clientX, mY = event.clientY;
        // prevent all other mousedown events
        event.preventDefault();
        // find what element the event is on
        elementOver = document.elementFromPoint(mX,mY);
        // get the element that needs to be dragged or scaled
        selectedElement = event.target.parentNode;

        // if the event.target.parentNode is the svg element set it back to the target
        if(selectedElement === svg){
            selectedElement = event.target;
        }

        // grab the limits scale value for whichever icon is selected
        // functions find min if passed true and find max if passed false
        if(selectedElement){
            iconMin = findLimit(selectedElement,true);
            iconMax = findLimit(selectedElement, false);
        }

        // get the bounding box of the group element
        try{
            bbox = selectedElement.getBBox();
        }
        catch(err){
            return;
        }
        // Make sure the first transform on the element is a translate transform
        var transforms = selectedElement.transform.baseVal;

        
        // if the element that the mousedown happened over is a resize block 
        //      and the function is not currently resizing,
        // start resize logic
        if(elementOver.classList.contains('resize') && !resizing){
            // set resizing flag
            resizing = true;
        
            // get scale data
            scale = transforms.getItem(transforms.length -1);

            // get the coordinates where the click happend inside the svg box
            offset = getMousePosition(event);
            
            // extract the scale value as a number
            currentScale = scale.matrix.a;

            // get translate data
            transform = transforms.getItem(0);

        }
        // if the event click happened on a draggable element start drag logic
        else if(selectedElement.classList.contains('draggable')){
            // set dragging flag
            dragging = true;
            // get the offset value for the translation
            offset = getMousePosition(event);
            // get scale data
            scale = transforms.getItem(transforms.length -1);

            // make sure that the first element of the tranform object is the translate 
            //  and create one if it isnt there
            if (transforms.length === 0 
                || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE){
                // sets current transform position to 0,0 to make moving item easier
                var translate = svg.createSVGTransform();
                translate.setTranslate(0, 0);
                selectedElement.transform.baseVal.insertItemBefore(translate, 0);
            }

            // Get initial translation in relation to the current mouse position (offset)
            transform = transforms.getItem(0);

            // calculate the transform location in relation to the svg element
            offset.x -= transform.matrix.e;
            offset.y -= transform.matrix.f;

            // is the selected item confined?
            confined = selectedElement.classList.contains('confine');

            // if true
            if(confined){
                let rotateVal = transforms.getItem(1).angle;
                if(rotateVal > 360){ rotateVal-= 360; }

                // get the current scale of the icon
                let scaleFactor = scale.matrix.a;
                bbox = selectedElement.getBBox();

                // if no rotate has occured
                if(rotateVal ===0 || rotateVal === 360 ){
                    // set the new boundry values based on the view box 
                    // and the width/height of the icons (dim * scale = dim of icon)
                    minX = boundaryX1 - bbox.x;
                    maxX = boundaryX2 - bbox.x - bbox.width * scaleFactor;
                    minY = boundaryY1 - bbox.y;
                    maxY = boundaryY2 - bbox.y - bbox.height * scaleFactor;
                }
                else{ // rotate has been applied
                    // calculate the degree of the rotation in radians
                    var trigInput = rotateVal * Math.PI/180;
                    var trigInput2 = (rotateVal-90) * Math.PI/180;
                    var trigInput3 = (rotateVal-180) * Math.PI/180;
                    var trigInput4 = (rotateVal-270) * Math.PI/180;

                    // check for easy angle calculations, this save processing time 
                    // iff the angle makes, 45 45 90 triangle, 30 60 90 triangle,
                    //  or a interval of 90 degrees
                    if(rotateVal === 180){
                        // set the new boundry values based on the view box 
                        // and the width/height of the icons
                        minX = boundaryX1 - bbox.x+ bbox.width * scaleFactor;
                        maxX = boundaryX2 - bbox.x;
                        minY = boundaryY1 - bbox.y + bbox.height * scaleFactor;
                        maxY = boundaryY2 - bbox.y;
                    }
                    else if(rotateVal === 90){
                        // set the new boundry values based on the view box 
                        // and the width/height of the icons
                        minX = boundaryX1 - bbox.x + bbox.height * scaleFactor;
                        maxX = boundaryX2 - bbox.x;
                        minY = boundaryY1 - bbox.y;
                        maxY = boundaryY2 - bbox.y - bbox.width * scaleFactor;
                    }
                    else if(rotateVal === 270){
                        // set the new boundry values based on the view box 
                        // and the width/height of the icons
                        minX = boundaryX1 - bbox.x;
                        maxX = boundaryX2 - bbox.x - bbox.height * scaleFactor;
                        minY = boundaryY1 - bbox.y + bbox.width * scaleFactor;
                        maxY = boundaryY2 - bbox.y;
                    }
                    else if(rotateVal === 45){
                        // set the new boundry values based on the view box 
                        // and the width/height of the icons
                        minX = boundaryX1 - bbox.x + (bbox.height * scaleFactor/Math.sqrt(2));
                        maxX = boundaryX2 - bbox.x - (bbox.width * scaleFactor)/Math.sqrt(2);
                        minY = boundaryY1 - bbox.y;
                        maxY = boundaryY2 - bbox.y - (bbox.width * scaleFactor)/Math.sqrt(2) - 
                                                        (bbox.height * scaleFactor)/Math.sqrt(2);
                    }
                    else if(rotateVal === 135){
                        // set the new boundry values based on the view box 
                        // and the width/height of the icons
                        minX = boundaryX1 - bbox.x + (bbox.height * scaleFactor/Math.sqrt(2) + 
                                                        (bbox.width * scaleFactor/Math.sqrt(2)));
                        maxX = boundaryX2 - bbox.x;
                        minY = boundaryY1 - bbox.y + (bbox.height * scaleFactor)/Math.sqrt(2);
                        maxY = boundaryY2 - bbox.y - (bbox.width * scaleFactor)/Math.sqrt(2);            
                    }
                    else if(rotateVal === 225){
                        // set the new boundry values based on the view box 
                        // and the width/height of the icons
                        minX = boundaryX1 - bbox.x + (bbox.width * scaleFactor/Math.sqrt(2));
                        maxX = boundaryX2 - bbox.x - bbox.height * scaleFactor/Math.sqrt(2);
                        minY = boundaryY1 - bbox.y + (bbox.height * scaleFactor)/Math.sqrt(2) +
                                                        (bbox.width * scaleFactor)/Math.sqrt(2);
                        maxY = boundaryY2 - bbox.y;
                    }
                    else if(rotateVal === 315){
                        // set the new boundry values based on the view box 
                        // and the width/height of the icons
                        minX = boundaryX1 - bbox.x;
                        maxX = boundaryX2 - bbox.x  - bbox.height * scaleFactor/Math.sqrt(2) -
                                                        bbox.width * scaleFactor/Math.sqrt(2);
                        minY = boundaryY1 - bbox.y  + (bbox.width * scaleFactor)/Math.sqrt(2);
                        maxY = boundaryY2 - bbox.y - (bbox.height * scaleFactor)/Math.sqrt(2);
                    }
                    // if less than 90 calculate using trig using the first trig radian value
                    // the triangles caculated are based on the top left of the original icon 
                    // so we need 4 different checks
                    else if(rotateVal < 90){
                        minX = boundaryX1 - bbox.x  + Math.sin(trigInput)* (bbox.height*scaleFactor);
                        maxX = boundaryX2 - bbox.x - Math.cos(trigInput)* (bbox.width*scaleFactor);
                        minY = boundaryY1 - bbox.y;
                        maxY = boundaryY2 - bbox.y - (Math.cos(trigInput)* (bbox.height*scaleFactor)+
                                                        Math.sin(trigInput)* (bbox.width*scaleFactor));
                    }
                    else if(rotateVal < 180){
                        // calculate with 2nd radian value
                        minX = boundaryX1 - bbox.x + Math.sin(trigInput2)* (bbox.width*scaleFactor)+
                                                        Math.cos(trigInput2)*(bbox.height*scaleFactor);
                        maxX = boundaryX2 - bbox.x;
                        minY = boundaryY1 - bbox.y + Math.sin(trigInput2)*(bbox.height*scaleFactor);
                        maxY = boundaryY2 - bbox.y - (Math.cos(trigInput2)*(bbox.width*scaleFactor));
                    }
                    else if(rotateVal < 270){
                        //calculate with 3rd radian value
                        minX = boundaryX1 - bbox.x + Math.cos(trigInput3)* (bbox.width*scaleFactor);
                        maxX = boundaryX2 - bbox.x - Math.sin(trigInput3)* (bbox.height*scaleFactor);
                        minY = boundaryY1 - bbox.y + Math.cos(trigInput3)* (bbox.height*scaleFactor)+
                                                        Math.sin(trigInput3)* (bbox.width*scaleFactor);
                        maxY = boundaryY2 - bbox.y;
                    }
                    else if(rotateVal < 360){
                        // calculate with 4th radian value     
                        minX = boundaryX1 - bbox.x;
                        maxX = boundaryX2 - bbox.x - Math.cos(trigInput4)* (bbox.height*scaleFactor)-
                                                        Math.sin(trigInput4)* (bbox.width*scaleFactor);
                        minY = boundaryY1 - bbox.y + Math.cos(trigInput4)* (bbox.width*scaleFactor);
                        maxY = boundaryY2 - bbox.y - Math.sin(trigInput4)* (bbox.height*scaleFactor);
                    }
                }
            }
        }
    }

    // set flags for rescale
    var bottomL = false,
        bottomR = false,
        topR = false,
        topL = false;
   
    /**
     * @function drag
     * 
     * @param {event} event the click event that started the function
     * 
     * @description This runs when the mousemove event occurs
     *      This functions performs the actual icon manipulation
     *      This functions will scale icons up and down in size based on mouse motion.
     *      It also moves icons around the screen when the dragging event is occuring      
    */
    function drag(event) {
        // get the mouse x and y based on client
        mX = event.clientX, mY = event.clientY;

        // set the factor at which the resize happens
        let growingFactor = .02;

        // reset growing factor if needed
        if( elementOver && elementOver.parentElement 
            && elementOver.parentElement.classList.contains("textbox")){
            growingFactor *= 5;
        }
        else if(selectedElement && selectedElement.id.indexOf("eye") > -1){
            growingFactor *=2.5;
        }
        
        // if the selectedElement is non false then check if its an outline
        if(selectedElement){
            var isOutline = selectedElement.classList.contains("outline");
        }
        
        // prevent all other mousemove events
        event.preventDefault();
        
        // if the selectedElement is not null and resizing is true and dragging is false
        if(selectedElement && resizing && !dragging){
    
            // get new mouse position in svg space
            var coord = getMousePosition(event);

            // calculate icon size using bbox height and width times the scale 
            startH = bbox.height * currentScale;
            startW = bbox.width * currentScale;

            // first make sure there are no other flags active and
            // either the top right element is moused over or the top right is being moved
            if((!topL && !bottomL && !bottomR) 
                && (elementOver.classList.contains('top-right') || topR)){
                //set the flag just incase it isn't
                topR = true;
                // if the new x is less  & the new y is greater than the old position then shrink
                if(coord.x < offset.x && coord.y > offset.y){
                    // decrement by the growing factor
                    currentScale -= growingFactor;
                    // check for the min
                    if(currentScale < iconMin){ currentScale = iconMin; }

                    // translate the icon 0 in the x direction and by the difference 
                    //      in the positive y direction
                    dx = parseInt(transform.matrix.e);
                    dy = parseInt(transform.matrix.f + 
                            Math.abs(startH - bbox.height * currentScale)/4);
                }
                // if the old x is greater and the new y is smaller then we are growing
                else if(coord.x > offset.x && coord.y < offset.y){
                    // increment by the factor
                    currentScale += growingFactor;

                    // check for max size
                    if(currentScale > iconMax){ currentScale = iconMax; }
                    if(!isOutline && bbox.height * currentScale > parseInt(h)/3){
                        currentScale -= growingFactor
                    }
                    
                    // translate the icon 0 in the x direction and by the difference 
                    //      in the negative y direction        
                    dx = parseInt(transform.matrix.e);
                    dy = parseInt(transform.matrix.f -
                            Math.abs(startH - bbox.height * currentScale)/4);
                }

                // set scale using svg data method
                scale.setScale(currentScale,currentScale);

                // if parse it returns a true value for both
                /* if(dx && dy){
                    // set the new translate
                    transform.setTranslate(dx,dy);
                } */
                // set the new mouse position as the old so we can scale up and down
                offset = coord;
            }
            // using the same logic for other corners of the scale
            else if((!topR && !bottomL && !bottomR) 
                    && (elementOver.classList.contains('top-left') || topL)){
                topL = true;
                // if new x is greater than the old & the new y is greater than the old
                // shrink the scale
                if(coord.x > offset.x && coord.y > offset.y){
                    currentScale -= growingFactor;
                    // check for min
                    if(currentScale < iconMin){ currentScale = iconMin; }

                    // transform the icon by the positive difference in the sizes                        
                    dx = parseInt(transform.matrix.e +
                            Math.abs(startW - bbox.width * currentScale)/4);
                    dy = parseInt(transform.matrix.f +
                            Math.abs(startH - bbox.height * currentScale)/4);
                }
                // if the new x and new y are both less than the old position, grow
                else if(coord.x < offset.x && coord.y < offset.y){
                    currentScale += growingFactor;

                    // check for max size
                    if(currentScale > iconMax){ currentScale = iconMax; }
                    if(!isOutline && (bbox.height * currentScale > parseInt(h)/3
                        || bbox.width * currentScale > parseInt(w)/3)){
                        currentScale -= growingFactor
                    }

                    // transform the icon by the negative difference in the sizes
                    dx = parseInt(transform.matrix.e -
                            Math.abs(startW - bbox.width * currentScale)/4);
                    dy = parseInt(transform.matrix.f -
                            Math.abs(startH - bbox.height * currentScale)/4);
                }

                // set scale using svg data method
                scale.setScale(currentScale,currentScale);

                // if parse it returns a true value for both
                /* if(dx && dy){
                    // set the new translate
                    transform.setTranslate(dx,dy);
                } */

                // set new mouse position
                offset = coord;
            }
            // same logic as other corners
            else if((!bottomR && !topR && !topL) 
                    && (elementOver.classList.contains('bottom-left') || bottomL)){
                bottomL = true;
                // if new x is greater and new y is less
                // shrink
                if(coord.x > offset.x && coord.y < offset.y){
                    currentScale -= growingFactor;
                    // check for min
                    if(currentScale < iconMin){  currentScale =iconMin; }
                    
                    // transform the icon by the negative difference in the sizes keep y the same
                    dx = parseInt(transform.matrix.e +
                            Math.abs(startW - bbox.width * currentScale)/4);
                    dy = parseInt(transform.matrix.f);
                }
                // of the new x is less and the new y is greater
                // grow the icon
                else if(coord.x < offset.x && coord.y > offset.y){
                    currentScale += growingFactor;

                    // check for max size
                    if(currentScale > iconMax){currentScale = iconMax;}
                    if(!isOutline && bbox.height * currentScale > parseInt(h)/3){
                        currentScale -= growingFactor
                    }
                    
                    // transform the icon by the negative difference in the sizes keep y the same
                    dx = parseInt(transform.matrix.e -
                            Math.abs(startW - bbox.width * currentScale)/4);
                    dy = parseInt(transform.matrix.f);
                }
                
                // set scale using svg data method
                scale.setScale(currentScale,currentScale);

                // if parse it returns a true value for both
                /* if(dx && dy){
                    // set the new translate
                    transform.setTranslate(dx,dy);
                } */

                // set new mouse position
                offset = coord;
            }
            // same logic as other corners 
            else if((!topL && !topR && !bottomL) 
                    && (elementOver.classList.contains('bottom-right') || bottomR)){
                bottomR = true;
                // if the new x is less and the new y is also less
                // shrink
                if(coord.x < offset.x && coord.y < offset.y){
                    currentScale -= growingFactor;
                    // check min bound
                    if(currentScale < iconMin){currentScale = iconMin;}
                }
                // if the new x is greater than the old and the new y is greater
                // grow
                else if(coord.x > offset.x && coord.y > offset.y){
                    currentScale += growingFactor;

                    //check for max size
                    if(currentScale > iconMax){currentScale = iconMax;}
                    if(!isOutline && bbox.height * currentScale > parseInt(h)/3){
                        currentScale -= growingFactor
                    }
                }
                // set scale using svg data method
                scale.setScale(currentScale,currentScale);
                // no need to translate for bottom right corner
                // set new mouse position
                offset = coord;
            }

            // if the element is an outline then reset the stroke to the proper size
            // removing the current scale and applying the base scale
            if(isOutline){
                // calculate and set the stroke-width
                selectedElement.style.strokeWidth = 
                            (parseInt(selectedElement.getAttribute("stroke-width"))/currentScale)*.5;
            }
            if(isOutline || selectedElement.classList.contains("textbox")){
                if(dx && dy){
                    // set the new translate
                    transform.setTranslate(parseInt(dx),parseInt(dy));
                }
            }
                
        }
        // if the selected element is not null and the dragging flag is true
        else if (selectedElement && dragging) {
        
            // get mouse coordinates
            var coord = getMousePosition(event);
            // calculate the difference in the two
            var dx = parseInt(coord.x - offset.x);
            var dy = parseInt(coord.y - offset.y);

            // if the icon is confined check for boundry values
            if(confined){
                if(dx < minX){ dx = minX; }
                else if(dx > maxX){ dx = maxX; }
                if(dy < minY){ dy = minY; }
                else if(dy > maxY){ dy = maxY; }
            }
            // set the transform
            transform.setTranslate(dx,dy);
        }
    }


    /**
     * @function endDrag
     * 
     * @param {event} the mouse event that called the function
     * 
     * @description This function runs when the mouse leaves the gragging area 
     *          or when the user lift their finger off the mouse
     * 
     * This function just resets the variables and erases the currently selected element
     * 
    */
    function endDrag(event){

        if(selectedElement){
            drag(event);
            resizing = false,
            dragging = false,
            bottomL = false,
            bottomR = false,
            topL = false,
            topR = false;
        }
        selectedElement = null;
    }


    /**
     * @function findLimit
     * 
     * @param {DOM element} selectedElement the element that is currently being manipulated
     * @param {boolean} isMin true if the value being looked for is a minimum false for max value
     * 
     * @description given an icon element returns the min or max scale value for each icon
     * 
    */
    function findLimit(selectedElement, isMin){
        if(selectedElement && selectedElement !== 'null'){
            if(isMin){
                if(selectedElement.id.indexOf('north') !== -1){
                    return minNorth;
                }
                else if(selectedElement.id.indexOf('sun') !== -1){
                    return minSun;
                }
                else if(selectedElement.id.indexOf('eye') !== -1){
                    return minEye;
                }
                else if(selectedElement.id.indexOf('attension') !== -1){
                    return outlineMin;
                }
                else if(selectedElement.getAttribute("class") 
                    && selectedElement.getAttribute("class").indexOf('text') !== -1){
                    return minText;
                }
                else{
                    return .05;
                }
            }
            else{
                if(selectedElement.id.indexOf('north') !== -1){
                    return maxNorth;
                }
                else if(selectedElement.id.indexOf('sun') !== -1){
                    return maxSun;
                }
                else if(selectedElement.id.indexOf('eye') !== -1){
                    return maxEye;
                }
                else if(selectedElement.getAttribute("class") 
                    && selectedElement.getAttribute("class").indexOf('text') !== -1){
                    return maxText;
                }
                else{
                    return 5;
                }
            }
        }
    }        
}
// make div draggable
function dragElement(elmnt) {
    var pos2 = 0, pos4 = 0;
    if (elmnt) {
      /* if present, the header is where you move the DIV from:*/
      elmnt.onmousedown = dragMouseDown;
    }
  
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }
  
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos2 = pos4 - e.clientY;

        // set the element's new position:
        if(pos2 < -63){
            pos4 = e.clientY;
          // mouse is moving downward
            moveChoiceTo(elmnt,-1);
            return dragElement(elmnt);
        }
        // set the element's new position:
        else if(pos2 > 63){
            pos4 = e.clientY;
            // mouse is moving downward
            moveChoiceTo(elmnt,1);
            return dragElement(elmnt);
        }
    }
  
    function closeDragElement() {
        /* stop moving when mouse button is released:*/
        document.onmouseup = null;
        document.onmousemove = null;
    }

    // TODO:
    function moveSvgTo(id, direction) {
        var elem_choice = document.getElementById(id.split("layer")[1]);
        
        if(elem_choice.nodeName !== "g" || elem_choice.nodeName !== "line" ){
            if(id.split("layer")[1].indexOf("sun")  > -1 ){
                elem_choice = sunImage;
            }
            else if(id.split("layer")[1].indexOf("eye")  > -1 ){
                elem_choice = eyeImage;
            }
            else if(id.split("layer")[1].indexOf("north")  > -1 ){
                elem_choice = northImage;
            }
            else if(id.split("layer")[1].indexOf("scalebar")  > -1 ){
                elem_choice = scaleBarIcon;
            }
        }

        if(elem_choice){
            // move index of element by one either up or down
            if (direction === -1 && elem_choice.previousSibling) {
                svg.insertBefore(elem_choice, elem_choice.previousSibling);
                
            } else if (direction === 1 && elem_choice.nextSibling) {
                svg.insertBefore(elem_choice, elem_choice.nextSibling.nextSibling);
            }
        }
    }


    // TODO:
    function moveChoiceTo(elem_choice, direction) {

        var parent = elem_choice.parentNode;
        // move index of element by one either up or down
        if (direction === 1 && elem_choice.previousSibling) {
            let code = parent.insertBefore(elem_choice, elem_choice.previousSibling);
            
            if(code === elem_choice){
                moveSvgTo( elem_choice.getAttribute("id"), direction);
            }
        } else if (direction === -1 && elem_choice.nextSibling) {
            let code = parent.insertBefore(elem_choice, elem_choice.nextSibling.nextSibling);
            
            if(code === elem_choice){
                moveSvgTo( elem_choice.getAttribute("id"), direction);
            }
        }
    }
  }

/** ------------------------------------- End Draggable Function ----------------------------------------- */

/** ------------------------------------------ Helper Function ------------------------------------------- */
/**
 * @function setSvgClickDetection
 * 
 * @param {DOM element} svg the outer svg element
 * @param {string} mouseDetect the value to set the mouse detection to
 * 
 * @description this function takes in a whole svg element and a mouse detection value
 *              It then parses through all the children of the svg and subchildren to set the mouse detection
 *              for every single element. Used for the drawing functionality
*/
function setSvgClickDetection(svg, mouseDetect){
    let svgElements = svg.childNodes;
    
    // for every child
    for(index in svgElements){
        // if the group is draggable
        if(svgElements[index].classList && svgElements[index].classList.contains("draggable")){
            // reset the pointer events
            svgElements[index].style.pointerEvents = mouseDetect;
            // add if that element has child nodes
            if(svgElements[index].childNodes){
                // do the same with its children
                for(index2 in svgElements[index].childNodes){
                    if(svgElements[index].childNodes[index2].classList 
                        && svgElements[index].childNodes[index2].classList.contains("resize")){
                        svgElements[index].childNodes[index2].style.pointerEvents = mouseDetect;

                        // TODO: undo the border settings
                        if(mouseDetect === "none"){
                            svgElements[index].childNodes[index2].style.visibility = "hidden";
                        }
                        else{
                            svgElements[index].childNodes[index2].style.visibility = "visible";
                        }
                        
                    }
                }
            }
        }
    }
}


/**
 * @function captionHandler
 * 
 * @description checks the caller page to see if it was the captionWriter, 
 *      goes back if true, otherwise calls an open to the server to get the page
 * 
*/
function captionHandler(){
    // if the last window seen was captionWriter then go back to preserve changes
    if(document.referrer.indexOf("/captionWriter") > -1){
        window.history.back();
    }
    else{
        // else reload the page
        window.open('/captionWriter','_self');
    }
}


/**
 * @function growProgress
 * 
 * @param {number} duration the amount of time in seconds that the animation should last
 * 
 * @description grow the progress bar using animations up to the width over duration seconds
 * 
*/
function growProgress(progressBar){
    progressBar.firstElementChild.classList.add('startAnimation');
}


/**
 * @function showProgress
 * 
 * @description creates a brand new progress bar and returns the element
 * 
*/
function showProgress(){
    // get parent div and create paieces for scalebar
    var parent = document.getElementById("progressBarBox");
    var outerBar = document.createElement("div"),
        innerBar = document.createElement("div");

    // set the ids for css and append elements
    outerBar.id = "progressBar",
    innerBar.id = "mainBar",
    outerBar.appendChild(innerBar),
    parent.appendChild(outerBar);
    // return the progressBar elements
    return outerBar;
}


/**
 * @function hideProgress
 * 
 * @description sets the visibility of the progressBar div to hidden and resets the animations
 * 
*/
// hide the progress bar for download
function hideProgress(progressBar){
    progressBar.remove();
}


/**
 * @function loadInvisible
 * 
 * @description hides the loader gif
 * 
*/
function loadInvisible(){
    loader.style.visibility = 'hidden';    
}


/**
 * @function loaderActivate
 * 
 * @description shows the loader gif
 * 
*/
function loaderActivate(){
    loader.style.visibility = 'visible';
}


/**
 * @function setOpposite
 * 
 * @param {string} colorString white or black
 * 
 * @description reverses black and white fills for icons
 * 
*/
function setOpposite(colorString){
    if(colorString === "black"){ return "white"; }
    else if(colorString === "transparent"){ return colorString; }
    else{ return "black"; }
}


/**
 * @function drawLine
 * 
 * @param {DOM element} lineElement the line to be drawn
 * @param {number} x2 the x value for the end point of the line element
 * @param {number} y2 the y value for the end point of the line
 * 
 * @description draws the line whenever it needs to be updated in the middle of drawing action
*/
function drawLine(lineElement,x2,y2){
    var transform = lineElement.getAttribute("transform");

    var transX = parseInt(transform.split(") ")[0].split(",")[0].replace("translate(","")),
        transY = parseInt(transform.split(") ")[0].split(",")[1]);

    lineElement.setAttribute("x2", x2 - transX);
    lineElement.setAttribute("y2",y2 - transY);
}


/**
 * @function getMetadata
 * 
 * @description extracts the data values used for angle calculations
 *               and disables any buttons with missing values
*/
function getMetadata(){
    // get value string from hidden DOM element
    var metadata = document.getElementById("metadata-text").innerHTML;

    // parse back into JSON
    var metadataString = JSON.parse(metadata);

    // Important Metadata Values adding degree offset for isis
    northDegree = parseFloat(metadataString['NorthAzimuth']) + 90;
    sunDegree = parseFloat(metadataString['SubSolarAzimuth'])+ 90;
    observerDegree = parseFloat(metadataString['SubSpacecraftGroundAzimuth']) + 90;

    if(isNaN(northDegree)){
        // check if it is map projected, if yes set north to 0 else
        if(isMapProjected === 'true'){
            let rotateOffset = parseFloat("<%=rotationOffset %>");            
            if(!isNaN(rotateOffset)){
                northDegree = 0 + rotateOffset;
            }
        }
        else{
            // disable the button if the degree was not found
            document.getElementById('northIconFlag').setAttribute('class',
                                                            "btn btn-secondary btn-lg button disabled");
        }
    }
    else{
        // disable the button if the degree was not found
        document.getElementById('northIconFlag').setAttribute('class',
                                                            "btn btn-lg button");
    }

    if(isNaN(sunDegree)){
        // disable the button if the degree was not found
        document.getElementById('sunIconFlag').setAttribute('class',
                                                            "btn btn-secondary btn-lg button disabled");
    }
    else{
        document.getElementById('sunIconFlag').setAttribute('class',
                                                            "btn btn-lg button");
    }

    if(isNaN(observerDegree)){
        // disable the button if the degree was not found
        document.getElementById('eyeFlag').setAttribute('class',
                                                            "btn btn-secondary btn-lg button disabled");
    }
    else{
        document.getElementById('eyeFlag').setAttribute('class',
                                                            "btn btn-lg button");
    }

    // if the degree value is over 360 just subtract 360 because the math is easier
    if(northDegree>360){ northDegree -= 360; }
    if(sunDegree>360){ sunDegree -= 360; }
    if(observerDegree>360){ observerDegree -= 360; }

    
    // set the scale bar corners to the correct orientation
    setScaleboxCorners(northDegree, sunDegree, observerDegree);
    
}


/**
 * @function getNameWithVal
 * 
 * @param {number} val the value to look for in the placeEnum object
 * 
 * @description returns the key that points to the given value
 * 
*/
getNameWithVal = function(val){
    let tmpArr = Object.keys(placeEnum);
    for(key in tmpArr){
        if( placeEnum[tmpArr[key]] === val){
            return tmpArr[key];
        }
    }
}


/**
 * this code can be used to render a loading bar for the image as it is being sent from the server
 * Although since the ISIS Reduce call shrinks the size of the cube file, a loading bar in not really that necessary
*/
Image.prototype.load = function(url){
    var thisImg = this;
    var xmlHTTP = new XMLHttpRequest();
    xmlHTTP.open('GET', url,true);
    xmlHTTP.responseType = 'arraybuffer';
    xmlHTTP.onload = function(e) {
        var blob = new Blob([this.response]);
        thisImg.src = window.URL.createObjectURL(blob);
    };
    xmlHTTP.onprogress = function(e) {
        thisImg.completedPercentage = parseInt((e.loaded / e.total) * 100);
    };
    xmlHTTP.onloadstart = function() {
        thisImg.completedPercentage = 0;
    };
    xmlHTTP.send();
};

Image.prototype.completedPercentage = 0;


/**
 * @function loadImageAsURL
 * 
 * @param {string} url the location of the file on the server
 * @param {function} callback the callback function to send output
 * 
 * @description loads an image on the server and onvert the image into a base64 dataURL
 * 
 *  Note: limits the size of the image based on the users browser because of differing dataUrl limits
 * 
*/
function loadImageAsURL(url, callback) {
    // create a new image
    var image = new Image();

    // add the onload event
    image.onload = function (){
        var canvas = document.createElement('canvas');

        // keep for testing only
        console.log("This image is: " +this.naturalWidth+ " by " +this.naturalHeight+ " px is demension");
        console.log("And has " + this.naturalWidth * this.naturalHeight + " total number of pixels");

        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        
        // draw the image to the canvas at the new scale
        canvas.getContext('2d').drawImage(this, 0, 0);
        // pass the dataUrl to the callback function
        callback(canvas.toDataURL('image/png'));
    };
    // display any errors
    image.onerror = function(err){
        console.log("Error: " + err);
    };
    // set the image source to load the image
    image.src = url;
}


/**
 * @function setTransform
 * 
 * @param {DOM element} icon the icon to change the transform of 
 * @param {string} transformTarget the transform name that we want to set
 * @param {*} value unknown input type of value [best type os string]
 * 
 * @description sets the translate of the given icon
 */
function setTransform( icon, transformTarget, value){
    
    var transformString = icon.getAttribute("transform"),
        arr = transformString.split(") ");

    for( var i = 0; i < arr.length; i++){
        if(arr[i].indexOf(transformTarget) > -1){
            arr[i] = transformTarget+"(" + value.toString();
        }
    }

    icon.setAttribute("transform", arr.join(") "));
}


/**
 * @function parseTransform
 * 
 * @param {string} transformString the string of the transform 
 * @param {string} target transform target name
 * 
 * @description gets the values from the transform string given
 * 
 * @returns an array of the translate
 */
function parseTransform( transformString, target ){
    if(transformString === "" || transformString == undefined){
        return -1;
    }
    
    var arr = transformString.split(") ");
    for( var i = 0; i < arr.length; i++){
        if(arr[i].indexOf(target) > -1){
            if(arr[i].split(target+"(")[1].split(", ").length > 1 || arr[i].split(target+"(")[1].split(",").length > 1){
                var tmp = arr[i].split(target+"(")[1].split(", ");

                if(tmp.length === 1){ tmp = arr[i].split(target+"(")[1].split(","); }
                tmp = [parseFloat(tmp[0]), parseFloat(tmp[1])]
                return tmp;
            }
            else if(arr[i].split(target+"(")[1].split(" ").length > 1){

                tmp = [parseFloat(arr[i].split(target+"(")[1].split(" ")[0]),
                 parseFloat(arr[i].split(target+"(")[1].split(" ")[1])];

                 return tmp;
            }
            else{
                return parseFloat(arr[i].split(target+"(")[1]);
            }
            
        }
    }
}


/**
 * @function shiftIcons
 * 
 * @param {array} viewboxArr viewBox array in the form of: [xMin, xMin, xMax, yMax] 
 * 
 * @description shifts the icons back into the svg area when it is outside
 */
function shiftIcons( viewboxArr ){
    var children = svg.childNodes;
    var translate,
        iconRotation,
        iconScale,
        iconWidth,
        iconHeight,
        xMin = parseFloat(viewboxArr[0]),
        yMin = parseFloat(viewboxArr[1]),
        xMax = parseFloat(viewboxArr[2]),
        yMax = parseFloat(viewboxArr[3]);

    for( var i = 0; i < children.length; i++ ){
        try {
            if( children[i].getAttribute("id") ){

                // get icon scale in a manner that works for all browsers
                iconScale = parseFloat(parseTransform(children[i].getAttribute("transform"), "scale"));

                // get icon width & height
                iconWidth = children[i].getBBox().width
                            * iconScale
                iconHeight = children[i].getBBox().height
                            * iconScale;
                                    
                // get icon rotation
                iconRotation = parseTransform( children[i].getAttribute("transform"), "rotate" );
                // get icon rotation
                translate = parseTransform( children[i].getAttribute("transform"), "translate" );

            
                if(children[i].getAttribute("id").indexOf("scale") > -1){
                    // set scalebar rotation to 0 because that the same as nothing
                    iconRotation = 0;
                }

                // get a rough estimate of where the top left of the svg icon is located
                iconRotation = parseFloat(iconRotation/90);

                if( !isNaN(translate[0]) && !isNaN(translate[1]) 
                        && !isNaN(xMax) && !isNaN(xMin)
                        && !isNaN(yMax) && !isNaN(yMin)){
                    // when icon is up
                    if(iconRotation !== -1 && (iconRotation < .5 || iconRotation >= 3.5) ){
                        if(translate[0] <= xMin){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(xMin),
                                                                    Number(translate[1])]);
                        }
                        else if( translate[0] >= (xMax + xMin) - iconWidth ){
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number((xMax + xMin) - iconWidth),
                                                                    Number(translate[1])]);
                        }

                        if(translate[1] <= yMin){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(translate[0]), Number(yMin)]);
                        }
                        else if(translate[1] >= (yMax + yMin) - iconHeight ){
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number(translate[0]), Number((yMax + yMin) - iconHeight)]);
                        }
                    }
                    // when icon is to the right
                    else if(iconRotation !== -1 && (iconRotation < 1.5 && iconRotation >= .5) ){

                        if(translate[0] <= xMin + iconHeight){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(xMin + iconHeight),
                                                                    Number(translate[1])]);
                        }
                        else if( translate[0] >= (xMax + xMin) ){
                    
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number((xMax + xMin)),
                                                                    Number(translate[1])]);
                        }

                        if(translate[1] <= yMin){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(translate[0]), Number(yMin)]);
                        }
                        else if(translate[1] >= (yMax + yMin) - iconWidth ){
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number(translate[0]), Number((yMax + yMin) - iconWidth)]);
                        }
                    }
                    // when icon is down
                    else if(iconRotation !== -1 && (iconRotation < 2.5 && iconRotation >= 1.5) ){
                        if(translate[0] <= xMin + iconWidth){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(xMin + iconWidth),
                                                                    Number(translate[1])]);
                        }
                        else if( translate[0] >= (xMax + xMin) ){
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number((xMax + xMin)),
                                                                    Number(translate[1])]);
                        }

                        if(translate[1] <= yMin + iconHeight*2){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(translate[0]), Number(yMin + iconHeight)]);
                        }
                        else if(translate[1] >= (yMax + yMin) ){
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number(translate[0]), Number((yMax + yMin))]);
                        }
                    }
                    // when icon is left
                    else if(iconRotation !== -1 && (iconRotation < 3.5 && iconRotation >= 2.5) ){
                        if(translate[0] <= xMin){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(xMin),
                                                                    Number(translate[1])]);
                        }
                        else if( translate[0] >= (xMax + xMin) - iconHeight ){
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number((xMax + xMin) - iconHeight),
                                                                    Number(translate[1])]);
                        }

                        if(translate[1] <= yMin + iconWidth){
                            // icon's x value is bellow the viewbox bound
                            setTransform(children[i], "translate", [Number(translate[0]), Number(yMin + iconWidth)]);
                        }
                        else if(translate[1] >= (yMax + yMin) ){
                            // icon's x value is greater than the width
                            setTransform(children[i], "translate", [Number(translate[0]), Number((yMax + yMin))]);
                        }
                    }
                }
                
            }
        }
        catch( err ){ /* nothing */ }
    }
}



/**
 * @function setImagePadding
 * 
 * @param {number} val the number of pixels to add
 * @param {string} location the side of the svg to add the pixels (left|right|top|bottom)
 * 
 * @description adjust the svg size and viewBox as needed to add extra black pixels to one side
 * 
*/
function setImagePadding(val, location){
    // image w and h vars
    let imageW,
        imageH;

    if( isNaN(parseInt(val)) ){
         return;   
    }
    // get current viewBox and adjust the size of the side by how much is in the value
    var vb = svg.getAttribute("viewBox"),
        xMin = parseInt(vb.split(" ")[0].trim()),
        yMin = parseInt(vb.split(" ")[1].trim()),
        xMax = parseInt(vb.split(" ")[2].trim()),
        yMax = parseInt(vb.split(" ")[3].trim());

    // switch on the location of the padding
    switch(location){
        case 'bottom':
            // get the new image height for the box and background
            imageH = yMax + val;
            // set the viewbox values to how on the bottom of the image
            svg.setAttribute("viewBox", xMin + " " + yMin + " " + xMax + " " + imageH);
            // set background x,y to 0 to show at the bottom of the image
            bg.setAttribute("x", xMin);
            bg.setAttribute("y", yMin);
            // adjust the height and set the width to what it should be
            bg.setAttribute("height", imageH);
            bg.setAttribute("width", xMax);
            // set the image dimensions display for the user
            document.getElementById("displayCube").innerHTML = xMax + " &times; " + imageH +  " px";
            shiftIcons(String(svg.getAttribute("viewBox")).split(" "));
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        case "top":
            // get the new image height for the box and background
            imageH = yMax + val;
            // set background x,y to show padding at the right spot
            bg.setAttribute("y", parseInt(yMin - val));
            bg.setAttribute("x", xMin);
            // adjust the height and set the width to what it should be
            bg.setAttribute("height", imageH);
            bg.setAttribute("width", xMax);
            // set the viewbox values 
            svg.setAttribute("viewBox", xMin + " " + String(yMin - val) + " " + xMax + " " + imageH);
            // set the image dimensions display for the user
            document.getElementById("displayCube").innerHTML = xMax + " &times; " + imageH +  " px";
            shiftIcons(String(svg.getAttribute("viewBox")).split(" "));
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        case "right":
            // get the new image width for the box and background
            imageW = xMax + val;
            // set background x,y to padding at the right spot
            bg.setAttribute("y", yMin);
            bg.setAttribute("x", xMin);
            // adjust the height and set the width to what it should be
            bg.setAttribute("width", imageW);
            bg.setAttribute("height", yMax);
            // set the viewbox values
            svg.setAttribute("viewBox", xMin + " " + yMin + " " + imageW + " " + yMax);
            // set the image dimensions display for the user
            document.getElementById("displayCube").innerHTML = imageW + " &times; " + yMax +  " px";
            shiftIcons(String(svg.getAttribute("viewBox")).split(" "));
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        case "left":
            // get the new image width for the box and background
            imageW = xMax + val;
            // set background x,y to padding at the right spot
            bg.setAttribute("y", yMin);
            bg.setAttribute("x", parseInt(xMin - val));
            // adjust the height and set the width to what it should be
            bg.setAttribute("width", imageW);
            bg.setAttribute("height", yMax);
            // set the viewbox values 
            svg.setAttribute("viewBox",  String(parseInt(xMin - val)) + " " + yMin + " " + imageW + " " + yMax);
            // set the image dimensions display for the user
            document.getElementById("displayCube").innerHTML = imageW + " &times; " + yMax +  " px";
            shiftIcons(String(svg.getAttribute("viewBox")).split(" "));
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        default:
            // complete reset to how it started

            // set background x,y to padding at the right spot                            
            bg.setAttribute("x",0);
            bg.setAttribute("y",0);
            // adjust the height and set the width to what it should be
            bg.setAttribute("width",w);
            bg.setAttribute("height",h);
            // set the viewbox values
            svg.setAttribute("viewBox", "0 0 " + w + " " + h);
            // set the image dimensions display for the user
            document.getElementById("displayCube").innerHTML = w + " &times; " + h +  " px";
            shiftIcons(String(svg.getAttribute("viewBox")).split(" "));
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
    }
}


/**
 * @function prepareCrop
 * 
 * @param {array} clickArray the array of clicks that are needed to crop an image
 * 
 * @description calculates the values needed for cropping an image and returns the value in an ordered array
 * 
 * @returns {array} [x,y,w,h]
 * 
*/
function prepareCrop(clickArray){
    var startX = clickArray[0],
        startY = clickArray[1],
        endX = clickArray[2],
        endY = clickArray[3];

    if(startX > endX && startY > endY){
        clickArray[0] = endX;
        clickArray[1] = endY;
        clickArray[2] = startX;
        clickArray[3] = startY;
    }
    else if(startX > endX || startY > endY){
        if(startX > endX){
            clickArray[0] = startX - (startX - endX);
            clickArray[2] = endX + (startX - endX);
        }
        else{
            clickArray[1] = startY - (startY - endY);
            clickArray[3] = endY + (startY - endY);
        }
    }
    return clickArray;
}


/**
 * @function setScaleboxCorners
 * 
 * @param {number} northDegree the north azimuthal direction in degrees (0-360)
 * @param {number} sunDegree the sun azimuthal direction in degrees (0-360)
 * 
 * @description takes the rotation angle and calculates where each corner will be for scaling
 * 
*/
function setScaleboxCorners(northDegree, sunDegree, observerDegree){
    
    // as long as northDegree is not NaN and not 0 we will need to adjust the boxes
    if(!isNaN(northDegree) &&  northDegree !== 0){
        // get the child list
        let childList = northImage.childNodes;
        let offset90 = Math.round(northDegree / 90);
        /* 
            1. each corner was given a numeric value starting from top-left and going clockwise around 
                the image
            2. I caculate how many times 90 goes into the degree and i shift the boxes by that amount
            3. by adding the ossfet to the box values it tells us where that box should move to. 
        */
        for(index in childList){
            if(childList[index].classList 
                && childList[index].classList.contains("resize") 
                    && offset90 >= 1 && offset90 <= 4){
                
                if(childList[index].classList.contains("top-left")){
                    let newClass = placeEnum["top-left"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    
                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("top-right")){
                    let newClass = placeEnum["top-right"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    
                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("bottom-right")){
                    let newClass = placeEnum["bottom-right"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    
                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("bottom-left")){
                    let newClass = placeEnum["bottom-left"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    
                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }

                
            } 
        }
    }
    // same is done for each icon that rotates
    if(!isNaN(sunDegree)){
        let childList = sunImage.childNodes;
        let offset90 = Math.round(sunDegree / 90);
        
        for(index in childList){
            if(childList[index].classList 
                && childList[index].classList.contains("resize") 
                    && offset90 >= 1 && offset90 <= 3){
                
                if(childList[index].classList.contains("top-left")){
                    let newClass = placeEnum["top-left"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("top-right")){
                    let newClass = placeEnum["top-right"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("bottom-right")){
                    let newClass = placeEnum["bottom-right"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("bottom-left")){
                    let newClass = placeEnum["bottom-left"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
            }
        }
    }
    // same is done for each icon that rotates
    if(!isNaN(observerDegree)){
        let childList = eyeImage.childNodes;
        let offset90 = Math.round(observerDegree / 90);
        
        for(index in childList){
            if(childList[index].classList 
                && childList[index].classList.contains("resize") 
                    && offset90 >= 1 && offset90 <= 3){
                
                if(childList[index].classList.contains("top-left")){
                    let newClass = placeEnum["top-left"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("top-right")){
                    let newClass = placeEnum["top-right"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("bottom-right")){
                    let newClass = placeEnum["bottom-right"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
                else if(childList[index].classList.contains("bottom-left")){
                    let newClass = placeEnum["bottom-left"] + offset90;
                    if(newClass > 4){newClass -= 4}
                    

                    childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                }
            }
        }
    }
}


/**
 * @function setIconAngle
 * 
 * @param {DOM object} icon the icon to be manipulated
 * @param {number} degree the degree of rotation
 * 
 * @description sets the icon transform values for the rotation
 * 
*/
function setIconAngle(icon, degree){
    // if the degree is no NaN
    if(!isNaN(degree)){
        // get the transform value if the icon object
        let transformVal = icon.getAttribute("transform");
        // get the seperate transform values in a list
        let transformArray = transformVal.split(" ");

        // set the rotation transform and return after
        // the new transform attribute has been set
        for( index in transformArray ) {
            
            if( transformArray[index].indexOf("rotate") > -1 ) {
                var tmp = transformArray[index].split("rotate(")[1];
                
                tmp = tmp.replace(")"," ").trim();
                tmp = degree;
                transformArray[index] = "rotate("+ tmp +")";
                
                icon.setAttribute("transform", transformArray.join(" "));
                return;
            }
        }
    }
}


/**
 * @function adjustBox
 * 
 * @description updates the look of the crop box when mouseover is occuring and crop in not finished
*/
function adjustBox(){

    // get start points of the crop
    startX = clickArray[0];
    startY = clickArray[1];

    // convert number and do the math
    let w = Number(mouseX) - startX;
    let h = Number(mouseY) - startY;
    
    // reset the outline box if the values are not NaN
    if(w !== NaN && h !== NaN){
        if(w < 0 && h < 0){
            h = Math.abs(h);
            w = Math.abs(w);
            
            outlineBox.setAttribute('x' , startX  - w);
            outlineBox.setAttribute('y' , startY - h);
            outlineBox.setAttribute('width' , w);
            outlineBox.setAttribute('height' , h);
        }
        else if(w < 0 || h < 0){
            if(w<0){
                w = Math.abs(w);
                outlineBox.setAttribute('x' , startX  - w);
                outlineBox.setAttribute('y' , startY);
            }
            else{
                h = Math.abs(h);
                outlineBox.setAttribute('x' , startX);
                outlineBox.setAttribute('y' , startY - h);
            }
            outlineBox.setAttribute('width' , w);
            outlineBox.setAttribute('height' , h);
        }
        else{
            outlineBox.setAttribute('width' , w);
            outlineBox.setAttribute('height' , h);
        }
        
    }
} 


/**
 * @function captureClick
 * 
 * @param {number} x the x value of the mouse click
 * @param {number} y the y value of the mouse click
 * 
 * @description simply pushes the click coordinates into the global array
 * 
*/
function captureClick(x,y){
    clickArray.push(x);
    clickArray.push(y);
}       
 

/**
 * @function createTimer
 * 
 * @description captures and returns the current time values 
 * 
 * @returns {array} [hrs,mins,secs]
 * 
*/
function createTimer(){
    let startTime = new Date();
    return [ startTime.getHours(), startTime.getMinutes(), startTime.getSeconds() ];
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

// TODO:
function componentToHex(c){
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(r, g, b){
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

//TODO:
function setDetectionForLayer( el, detection ){
    if(el === null){
        setSvgClickDetection(document.getElementById("svgWrapper"), "all");
        $("#colorPickerLine").val("#FFFFFF");
        $("#textColorPicker").val("#FFFFFF");
        $("#colorPickerBox").val("#FFFFFF");

        userTextColor = "#ffffff";
        userBoxColor = "#ffffff";
        userLineColor = "#ffffff"

        return;
    }

    var elem_choice = document.getElementById(el.getAttribute("id").split("layer")[1]);
        
    if(elem_choice.nodeName !== "g" || elem_choice.nodeName !== "line" ){
        let id = el.getAttribute("id");

        if(id.split("layer")[1].indexOf("sun")  > -1 ){
            elem_choice = sunImage;
        }
        else if(id.split("layer")[1].indexOf("eye")  > -1 ){
            elem_choice = eyeImage;
        }
        else if(id.split("layer")[1].indexOf("north")  > -1 ){
            elem_choice = northImage;
        }
        else if(id.split("layer")[1].indexOf("scalebar")  > -1 ){
            elem_choice = scaleBarIcon;
        }
    }

    let svgElements = elem_choice.childNodes;
    elem_choice.style.pointerEvents = detection;

    // for every child
    for(index in svgElements){
        // if the group is draggable
        if( svgElements[index].classList && svgElements[index].classList.contains("resize") ){
            // reset the pointer events
            svgElements[index].style.pointerEvents = detection;
            svgElements[index].setAttribute("stroke", "red");
            if(elem_choice == eyeImage){
                svgElements[index].setAttribute("stroke-width", "2");
                svgElements[index].setAttribute("stroke-dasharray", "1 1");
            }
            else if(elem_choice.getAttribute("id").indexOf("text") > -1){
                // text element found
                svgElements[index].setAttribute("stroke-width", ".5");
                svgElements[index].setAttribute("stroke-dasharray", ".5 .5");
            }
            else{
                svgElements[index].setAttribute("stroke-width", "5");
                svgElements[index].setAttribute("stroke-dasharray", "1.5 1.5");

                if(elem_choice.getAttribute("id").indexOf("outline") > -1){
                    // outline box element found
                    
                    var color = elem_choice.style.stroke,
                        colorR = color.split(" ")[0],
                        colorG = color.split(" ")[1],
                        colorB = color.split(" ")[2];
                      
                    colorR = parseInt(colorR.split("rgb(")[1]);
                    colorG = parseInt(colorG);
                    colorB = parseInt(colorB);

                    if( !isNaN(colorR) && !isNaN(colorG) && !isNaN(colorB) ){
                        color = rgbToHex(colorR, colorG, colorB);
                    }
                    else{
                        color = "#ffffff";
                    }
                    $("#colorPickerLine").val("#ffffff");
                    $("#textColorPicker").val("#ffffff");
                    
                    userLineColor = "#ffffff";
                    userTextColor = "#ffffff";

                    $("#colorPickerBox").val(color);
                    userBoxColor = color;
                }
                else{
                    $("#colorPickerLine").val("#ffffff");
                    $("#textColorPicker").val("#ffffff");
                    $("#colorPickerBox").val("#ffffff");

                    userTextColor = "#ffffff";
                    userBoxColor = "#ffffff";
                    userLineColor = "#ffffff";                
                }
            }
            
            svgElements[index].style.background = "transparent";
            svgElements[index].style.visibility = "visible";
        }
    }

    if(elem_choice.getAttribute("id").indexOf("line") > -1 && elem_choice.getAttribute("id").indexOf("outline") < 0){
        // line element found
        var color = elem_choice.style.stroke,
            colorR = color.split(" ")[0],
            colorG = color.split(" ")[1],
            colorB = color.split(" ")[2];
        
        colorR = parseInt(colorR.split("rgb(")[1]);
        colorG = parseInt(colorG);
        colorB = parseInt(colorB);

        color = rgbToHex(colorR, colorG, colorB);
        $("#colorPickerLine").val(color);
        userLineColor = color

        $("#textColorPicker").val("#ffffff");
        $("#colorPickerBox").val("#ffffff");

        userTextColor = "#ffffff";
        userBoxColor = "#ffffff";
    }
    else if(elem_choice.getAttribute("id").indexOf("text") > -1 ){
        console.log(elem_choice)
        var color = elem_choice.firstElementChild.getAttribute("fill"),
            colorR = color.split(" ")[0],
            colorG = color.split(" ")[1],
            colorB = color.split(" ")[2];
            
        
        colorR = parseInt(colorR.split("rgb(")[1]);
        colorG = parseInt(colorG);
        colorB = parseInt(colorB);

        if( !isNaN(colorR) && !isNaN(colorG) && !isNaN(colorB) ){
            color = rgbToHex(colorR, colorG, colorB);
        }


        $("#colorPickerLine").val("#ffffff");
        $("#textColorPicker").val(color);
        $("#colorPickerBox").val("#ffffff");

        userTextColor = color;
        userBoxColor = "#ffffff";
        userLineColor = "#ffffff";
        console.log("THIS RUNS  " + color);
    }
}

var activeLayer;

//TODO:
/**
 * @function updateLayers
 * 
 * @description searches the svg and pulls out all changable icons
 */
function updateLayers(el){

    if(el.nodeName === "BUTTON"){
        while(el.nodeName !== "svg"){
            el = el.firstElementChild;
        }  
    }
    var layerBrowser = document.getElementById("layerBrowser");
    var div = document.createElement("div");
    
    div.setAttribute("class", "layerBox");
    div.setAttribute("role", "button");
    el.setAttribute("class", "layer");

    // get the type of layer
    el.style.pointerEvents = "none";

    div.addEventListener("mousedown", (event) => {
        if(event.target.nodeName === "svg") {
            var tar = event.target.parentElement;
        }
        else{
            var tar = event.target;
        }

        if(tar){
            if(activeLayer) { 
                // set all detection for every symbol
                setSvgClickDetection(document.getElementById("svgWrapper"),"all");
                activeLayer.style.border = "none";
            }
            // set the selected element
            activeLayer = tar;
            activeLayer.style.border = "5px solid red";
            setSvgClickDetection(document.getElementById("svgWrapper"),"none");
            setDetectionForLayer(activeLayer, "all");
        }
    });


    switch( getElementType( el ) ){
        case "svg":
            div.setAttribute("id", "layer" + el.getAttribute("id") );
            div.appendChild(el);
            layerBrowser.prepend(div);
            dragElement(div);
            break;

        case "g":
            div.setAttribute("id", "layer" + el.getAttribute("id") );
            // check for what element it is by using the id
            if( el.getAttribute("id") && el.getAttribute('id').indexOf("text") > -1 ){
                div.innerHTML = el.children[0].innerHTML;
                div.style.height = "50px";
                div.style.color = userTextColor ? userTextColor : "#ffffff";
                div.style.textAlign = "center";
                el.setAttribute("transform","translate(0, 0) scale(.5)");
                div.style.verticalAlign = "center"; 
                dragElement(div);
                layerBrowser.prepend(div);
                break;
            }
            else if( el.getAttribute("id") && el.getAttribute('id').indexOf("outline") > -1 ){
                var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg" );
                svg.setAttribute("viewBox", "0 0 100 100");
                svg.style.padding = "0%";
                el.firstElementChild.setAttribute("width","200");
                el.firstElementChild.setAttribute("height","200");
                el.setAttribute("transform","translate(0, 0) scale(.5)");
                div.style.padding = "10%";
                svg.appendChild(el);
                div.appendChild(svg); 
                dragElement(div);
                layerBrowser.prepend(div);
                break;
            }
        case "line":
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg" );
            svg.setAttribute("viewBox", "0 0 " + w + " " + h);
            svg.pointerEvents = "none";
            el.style.strokeWidth = "50px";
            svg.style.padding = "0%";
            svg.appendChild(el);
            div.appendChild(svg); 
            div.setAttribute("id", "layer" + el.getAttribute("id"));
            dragElement(div);
            layerBrowser.prepend(div);
            break;
    }

    // change the id so it doesnt interupt the svg image icons 
    el.setAttribute("id", layerId++);

    if(activeLayer) { 
        setSvgClickDetection(document.getElementById("svgWrapper"),"all");
        activeLayer.style.border = "none";
    }
    // set the selected element
    activeLayer = div;
    activeLayer.style.border = "5px solid red";
    setSvgClickDetection(document.getElementById("svgWrapper"),"none");
    setDetectionForLayer(activeLayer, "all");
}


/** TODO:
 * @function fixLayerUI
 * 
 * @param {*} id 
 */
function fixLayerUI(id) {
    var layers = document.getElementById("layerBrowser"),
        UIBox = document.getElementById(String( "layer"+id ));

    if(layers && UIBox){
        layers.prepend(UIBox);
    }
    else{
        if(id.indexOf("sun") > -1){
            // move sun to top
            UIBox = document.getElementById("layersunIconFlag"); 
        }
        else if(id.indexOf("eye") > -1){
            // move sun to top
            UIBox = document.getElementById("layereyeFlag"); 
        }
        else if(id.indexOf("north") > -1){
            // move sun to top
            UIBox = document.getElementById("layernorthIconFlag"); 
        }
        else if(id.indexOf("scale") > -1){
            // move sun to top
            UIBox = document.getElementById("layerscalebar"); 
        }

        if(UIBox){
            layers.prepend(UIBox);
        }
    }

    if(UIBox && activeLayer && UIBox.getAttribute("id") !== activeLayer.getAttribute("id")){
        if( activeLayer !== null ) {
            activeLayer.style.border = "none";
        }
    }
    
    if(UIBox) {
        activeLayer = UIBox;  
        activeLayer.style.border = "5px solid red";
    }
    else{
        console.log(UIBox);
    }
}

function getElementType( el ){
    if(el.nodeName){
        return el.nodeName
    }
    else{
        console.log("node name not found")
    }
}


/**
 * @function removeLayer
 * 
 * @description searches the svg and pulls out all changable icons
 */
function removeLayers(el){
    var layerBrowser = document.getElementById("layerBrowser");

    if( document.getElementById("layer" + el.getAttribute("id")) ){
        layerBrowser.removeChild(document.getElementById("layer" + el.getAttribute("id")));
    }
}

/**
 * @function resetSingleIcon
 * 
 * @param {DOM element} icon the current icon being adjusted
 * 
 * @description moved the icon in relation to the growth or shrinking of the image
 */
function resetSingleIcon(icon, widthDif, heightDif){
    // get elements and vars
    var transformArr = icon.getAttribute("transform").split(") "),
        displayString = document.getElementById("displayCube").innerHTML,
        tmpArr = [],
        dim = {
            w:"0",
            h:"0"
        };

    // get current image dimensions
    dim.w = parseInt(displayString.split("×")[0]);
    dim.h = parseInt(displayString.split("×")[1]);

    // for each transform peice
    transformArr.forEach(transform => {
        // if the transform is translate
        if(transform.indexOf("translate") > -1){
            
            // get the current x and y translate values
            var x = parseInt(transform.split(",")[0].replace("translate(","")),
                y = parseInt(transform.split(",")[1]),
                transX = -1, transY = -1;

            // chrome fails because of the translate format
            // check to see if the variable init failed
            if(!x || !y){
                x = parseInt(transform.split(" ")[0].replace("translate(","")),
                y = parseInt(transform.split(" ")[1]);
            }

            // if the icon's x value is greater than half the image move the icon to the difference
            if(x > dim.w/2 && widthDif !== 0){
                // calculate a new x position
                transX =  Math.abs(x - widthDif);
            }
            else if( widthDif === 0){
                // oftherwise if no change then set it to x
                transX = x;
            }

            // same idea with y
            if(y > dim.h/2 && heightDif !== 0){
                transY = Math.abs(y - heightDif);
            }
            else if( heightDif === 0){
                transY = y;
            }

            // if the values are both changed then set it
            if(transY !== -1 && transX !== -1){
                transform = "translate(" + transX + ", " + transY + ")";
            }
            // if either is -1 test and set the ones that need it
            else if( transY === -1 || transX === -1){
                transform = "translate(" + ((transX > -1) ? transX : x) + ", " + ((transY > -1) ? transY : y) + ")";
            }
            else{
                // othewise just set it
                transform = transform + ")";
            }
            // push the new transform
            tmpArr.push(transform)
        }
        else{
            // not translate transform so ignore it
            if(transform.indexOf(")") > -1){
                tmpArr.push(transform);
            }
            else{
                tmpArr.push(transform + ")");
            }
            
        }
    });
    // set the icon transform from the array of transform values
    icon.setAttribute("transform", tmpArr.join(" "));
}
/**
 * @function resetIcons
 * 
 * @param {DOM element} svg the svg element object
 * @param {number} heightDif the difference between the old and new height 
 * @param {number} widthDif the difference between the old and new weight
 * 
 * @description this function moved icons in relation to the width and height difference
 */
function resetIcons(svg, heightDif, widthDif){
    // reset the draggable icons
    resetSingleIcon(northImage, widthDif, heightDif);
    resetSingleIcon(sunImage, widthDif, heightDif);
    resetSingleIcon(eyeImage, widthDif, heightDif);
    // reset the draggable functions to set boundries
    makeDraggable(svg);
}


/**
 * @function openToolBox
 * 
 * @param {event} event the click event object passed by the user's click
 * @param {string} id the id of the box to display 
 * 
 * @description when one of the tab buttons is clicked this function hides
 *              all menu tabs and then shows the target of the click
 */
function openToolBox(event, id){
    // Declare all variables
    var i,
        tabcontent,
        tablinks;
  
    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");

    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
  
    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
      tablinks[i].firstElementChild.style.color = "black";
    }
  
    // Show the current tab, and add an "active" class to the link that opened the tab
    document.getElementById(id).style.display = "block";
    event.currentTarget.className += " active";
    event.currentTarget.firstElementChild.style.color = "white";
}


/**
 * @function peekTimer
 * 
 * @param {array} startTime the array of time values to calculate the difference [hrs,mins,secs]
 * 
 * @description captures he current time and figures out how long it has been since the passed startTime
*/
function peekTimer(startTime){
    // get the end data values and calculate the difference in the startTime
    let endTime = new Date(),
        hrs = parseFloat(endTime.getHours()) - parseFloat(startTime[0]),
        mins = parseFloat(endTime.getMinutes()) - parseFloat(startTime[1]),
        secs = parseFloat(endTime.getSeconds()) - parseFloat(startTime[2]);

    // if the difference is negative decriment the next highest value
    // and add 60 to the negative
    if(secs < 0){
        secs = 60 + secs;
        mins -= 1;
    }
    else if(mins < 0){
        mins = 60 + mins;
        hrs -= 1;
    }
    // return the fixed times 
    return String(hrs) + ":" + String(mins) + ":" + String(secs);
}


/**
 * @function triggerDownload
 * 
 * @param {string} imgURI the download URL for the image data
 * @param {string} filename the filename that the user would like to save
 * 
 * @description create a new mouse event for a download 
 *              and create an anchor to click on that forces a download
*/
function triggerDownload(imgURI, filename){
    // create a click event
    var event = new MouseEvent('click', {
        view: window,
        bubbles: false,
        cancelable: true
    });
    // create an anchor for the download and the file using the image URI data
    var a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', imgURI);
    a.setAttribute('target', '_blank');

    // activate the event
    a.dispatchEvent(event);
}

/**
 * @function getMarkerId
 * 
 * @param {string} id the id of the DOM element 
 * @param {number} inc the incrimental variable to chnage the value
 * 
 * @returns recurse | number
 * 
 * @description creates a new id using recursion to make sure it is unique
 */
function getMarkerId(id, inc){
    if(document.getElementById(id) === null){
        return id;
    }
    else if(document.getElementById(id+inc) === null){
        return id + inc;
    }
    else{
        // call recursion on next increment and new id
        return getMarkerId(id,  ++inc);
    }
}

/** ----------------------------- End Helper Function ---------------------------------------------------- */

/** --------------------------------- Draw Functions ----------------------------------------------------- */
/**
 * @function resetDrawTool
 * 
 * @description resets all properties that are changed when drawing
 * 
*/
function resetDrawTool(){
    // reset draw flag
    drawFlag = false;
    // reset the UI 
    bg.className.baseVal = "";
    document.getElementById("pencilIconFlag").className = "btn btn-lg button";

    // remove half drawn lines if any
    if( lineArr.length > 0 && clickArray.length > 1 ) {
        var elem = lineArr.pop();

        if(elem.getAttribute("marker-start")){
            // remove the arrow def based on marker-start value
            let id = elem.getAttribute("marker-start").replace("url(","").replace(")","");

            if(id !== "#arrow"){
                $(id).parent().remove();
            }
        }
        elem.remove();
    }
    // reset the click array
    clickArray = [];

    // allow click detection on svg painted elements again
    setSvgClickDetection(svg, "all");
}


/**
 * @function svgPoint
 * 
 * @param {DOM element} element the outer svg element
 * @param {number} x the x value that should be transformed into svg space
 * @param {number} y the y value that should be transformed into svg space
 * 
 * @description gets the points clicked based on the svg viewBox
 * 
*/  
function svgPoint(element, x, y) {
    // get a new svg point
    var pt = svg.createSVGPoint();
    // set the point x value to the passed x
    pt.x = x;
    // same for y
    pt.y = y;

    /* use matrixTransform to convert the x and y using getScreenCTM to capture
        the browsers coordinate matrix */
    return pt.matrixTransform(element.getScreenCTM().inverse());    
}


/**
 * @function removeKey
 * 
 * @param {array} keysArr the array of all keys 
 * @param {string} key the key to be removed from the array 
 * 
 * @description remove the value from the array, this is for the hotkey tracking
 */
function removeKey(keysArr, key){
    if(!keysArr.includes(key)){return false;}
    else{
        var returnArr = [];
        for(var i = 0; i < keysArr.length; i++){
            if(key === keysArr[i]){
                keysArr[i] = null;
            }
            else{
                returnArr.push(keysArr[i]);
            }
        }
        return returnArr;
    }
}


/**
 * @function adjustIconAngle
 * 
 * @param {DOM element} icon the icon to be adjusted
 * @param {number} newDegree the new degree where the boxes need to be
 * @param {number} oldDegree the old degree where the boxes where set
 * 
 * @description shift the icon scaleboxes to the proper side of the icon based on the rotation
 */
function adjustIconAngle( icon, newDegree, oldDegree){
 
    if( oldDegree > 360 ) { oldDegree -= 360 }
    if( newDegree > 360 ) { newDegree -= 360 }

    if(!isNaN(newDegree) &&  newDegree !== 0){
        // get the child list
        let childList = icon.childNodes;
        let oldOffset = Math.round(oldDegree / 90);
        let offset90 = Math.round(newDegree / 90);
        
        if(newDegree > oldDegree || isNaN(oldDegree)){
            offset90 -= (isNaN(oldOffset)) ? 0 : oldOffset;

            for(index in childList){
                if(childList[index].classList 
                    && childList[index].classList.contains("resize") 
                        && offset90 >= 1 && offset90 <= 4){
                    
                    if(childList[index].classList.contains("top-left")){
                        let newClass = placeEnum["top-left"] + offset90;
                        if(newClass > 4){newClass -= 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("top-right")){
                        let newClass = placeEnum["top-right"] + offset90;
                        if(newClass > 4){newClass -= 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("bottom-right")){
                        let newClass = placeEnum["bottom-right"] + offset90;
                        if(newClass > 4){newClass -= 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("bottom-left")){
                        let newClass = placeEnum["bottom-left"] + offset90;
                        if(newClass > 4){newClass -= 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                } 
            }
        }
        else{
            oldOffset -= offset90;

            for(index in childList){
                if(childList[index].classList 
                    && childList[index].classList.contains("resize") 
                        && oldOffset >= 1 && oldOffset <= 4){
                    
                    if(childList[index].classList.contains("top-left")){
                        let newClass = placeEnum["top-left"] - oldOffset;
                        if(newClass <= 0){ newClass += 4 }
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("top-right")){
                        let newClass = placeEnum["top-right"] - oldOffset;
                        if(newClass <= 0){newClass += 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("bottom-right")){
                        let newClass = placeEnum["bottom-right"] - oldOffset;
                        if(newClass <= 0){newClass += 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("bottom-left")){
                        let newClass = placeEnum["bottom-left"] - oldOffset;
                        if(newClass <= 0){newClass += 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                } 
            }
        }
            
    }
    else{
        // find where the current rotation is and undo the rotation
        if(!isNaN(oldDegree)){
            let oldOffset90 = parseFloat(oldDegree / 90).toFixed(3);
            if( isNaN(oldOffset90)) { oldOffset90 = 0; }
        
            oldOffset90 = parseInt(oldOffset90 % 4);
            let childList = icon.childNodes;


            for(index in childList){
                if(childList[index].classList 
                    && childList[index].classList.contains("resize") 
                        && oldOffset90 >= 1 && oldOffset90 <= 4){
                    
                    if(childList[index].classList.contains("top-left")){
                        let newClass = placeEnum["top-left"] - oldOffset90;
                        if(newClass <= 0){newClass += 4}

                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("top-right")){
                        let newClass = placeEnum["top-right"] - oldOffset90;

                        if(newClass <= 0){ newClass += 4 }

                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("bottom-right")){
                        let newClass = placeEnum["bottom-right"] - oldOffset90;
                        if(newClass <= 0){newClass += 4}

                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                    else if(childList[index].classList.contains("bottom-left")){
                        let newClass = placeEnum["bottom-left"] - oldOffset90;
                        if(newClass <= 0){newClass += 4}
                        
                        childList[index].setAttribute("class","resize " + getNameWithVal(newClass));
                    }
                } 
            }
        }
    }
}


/**
 * @function iconPlaced
 * 
 * @param {DOM element} icon the element that we want to remove if it is placed 
 * 
 * @description This is a more effective way of removing the icons because calling the listener will reset the 
 *              button UI for us
 */
function iconPlaced( icon ){
    // init vars
    var svg = document.getElementById("svgWrapper"),
        children = svg.childNodes;

        // parse through the children of the svg
        children.forEach(child => {
            // check if the child is the icon
            if(child === icon){
                // check which icon it is and remove it
                switch(child){
                    case northImage:
                        $("#northIconFlag").mousedown();
                        break;
                    case sunImage:
                        $("#sunIconFlag").click();
                        break;
                    case eyeImage:
                        $("#eyeFlag").click();
                        break;
                }
            }
        });
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
/** --------------------------------- End Draw Functions ------------------------------------------------- */
/** ------------------------------------ Jquery Handlers ------------------------------------------------- */

/** When Document is loaded initialize the Jquery functions */
$(document).ready(function(){

    // get image dimensions form the hidden div
    var dimDiv = document.getElementById("imageDimensions"),
        origH,
        origW,
        scalePX,
        scalebarLength,
        imageSrc,
        displayCube;
        
    let padBottom = false,
        padTop = false,
        padLeft = false,
        padRight = false;

    // variables for keeping track of the outline boxes
    var highlightBoxArray = [],
        userBoxColor;

    let bottomBtn = document.getElementById("bottomPaddingBtn"),
        topBtn = document.getElementById("topPaddingBtn"),
        rightBtn = document.getElementById("rightPaddingBtn"),
        leftBtn = document.getElementById("leftPaddingBtn");

    // get padding input box and other important DOM elements for export
    var paddingBoxInput = document.getElementById("paddingInput");

    bg = document.getElementById("svgBackground");
    
    // init the padding value
    paddingBoxInput.value = '';
        
    // set all flags to false to start
    var sunIconPlaced = false,
        northIconPlaced = false,
        eyeIconPlaced = false,
        northFlag = false, 
        sunFlag = false,
        eyeFlag = false;

    // get the window URL element on any browser
    var DOMURL = window.URL || window.webkitURL || window;

    for(let i=0;i<dimDiv.childElementCount;i++){
        if(dimDiv.children[i].id === "width"){
            w = parseInt(dimDiv.children[i].innerHTML);
        }
        else if(dimDiv.children[i].id === "height"){
            h = parseInt(dimDiv.children[i].innerHTML);
        }
        else if(dimDiv.children[i].id === "origH"){
            origH = parseInt(dimDiv.children[i].innerHTML);
        }
        else if(dimDiv.children[i].id === "origW"){
            origW = parseInt(dimDiv.children[i].innerHTML);
        }
        else if(dimDiv.children[i].id === "scalebarLength"){
            scalebarLength = parseFloat(dimDiv.children[i].innerHTML);
        }
        else if(dimDiv.children[i].id === "scalebarPx"){
            scalePX = parseInt(dimDiv.children[i].innerHTML);
        }
        else if(dimDiv.children[i].id === "imageSrc"){
            imageSrc = dimDiv.children[i].innerHTML;
        }
        else if(dimDiv.children[i].id === "isMapProjected"){
            isMapProjected = dimDiv.children[i].innerHTML;
        }
        else if(dimDiv.children[i].id === "scalebarUnits"){
            scalebarUnits = dimDiv.children[i].innerHTML;
        }
        else if(dimDiv.children[i].id === "displayCube"){
            displayCube = dimDiv.children[i].innerHTML;
        }
    }

    // string version of the icons so they can be added dynamically with a single function call 
    var sunObjectString = '<g id="sunPosition" class="draggable confine scaleable" transform-origin="50%; 50%;"'
    + 'transform="translate(100, 150) rotate(0) scale(.3125)"  stroke-width="7" style="border:0;'
    + 'padding:0; pointer-events:visible;">\n'
    + '<circle id= "sunIconOuter"  r="100" cy="175" cx="150" stroke-width="10" stroke="black" fill="black"'
    + 'style="border:0;"></circle>\n'
    + '<path d="M 50 175 L 250 175 A 50 50 0 0 0 50 175 Z" stroke="black"'
    + 'fill="white"/>\n'
    + '<path d="M 0 90 L 26 109" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<path d="M 76 2 L 96 51" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<path d="M 20 32 L 56 71" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<path d="M 0 90 L 26 109" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<path d="M 300 89 L 274 105" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<path d="M 224 2 L 204 51" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<path d="M 280 32 L 248 71" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<path d="M 150 0 L 150 38" stroke-width="10" stroke="black" fill="white"/>\n'
    + '<rect class="resize top-left"x="0" y="0" width="100" height="100"'
    + 'style="visibility: hidden;"fill="transparent"/>\n'
    + '<rect class="resize top-right"x="220" y="0" width="100" height="100"'
    + 'style="visibility: hidden;"fill="transparent"/>\n'
    + '<rect class="resize bottom-right"x="220" y="220" width="100"height="100" style="visibility: hidden;'
    + '"fill="transparent"/>\n'
    + '<rect class="resize bottom-left"x="0" y="220" width="100" height="100"'
    + 'style="visibility: hidden;" fill="transparent"/>\n</g>\n';

    var northObjectString = '<g id="northPosition" class="draggable confine scaleable" transform-origin="50%; 50%;"'
    + 'transform="translate(100, 100) rotate(0) scale(.2439026)" stroke-width="5"'
    + 'style="border:0; padding:0; pointer-events:visible;">\n'
    + '<rect x="0" y="0" id="northBG"style="visibility: visible;"width="200" height="400" fill="black"/>\n'
    + '<rect x="0" y="0" class="resize top-left" style="visibility: hidden;"'
    + 'width="100" height="100" fill="transparent"/>\n'
    + '<rect x="100" y="0" class="resize top-right" style="visibility: hidden;"width="100" height="100"'
    + 'fill="transparent"/>\n'
    + '<path id= "northIcon"  d="M 100 0 L 200 200 L 100 150 L 0 200 Z" fill="black"  stroke="white"' 
    + 'stroke-width="2" style="border:0;"></path>\n'
    + '<path id= "northIcon2"  d="M 100 0 L 0 200 L 100 150 L 100 0" fill="white"  stroke="white"' 
    + 'stroke-width="2" style="border:0;"></path>\n'
    + '<path id="nLetter" d="M 50 200 L 50 0 L 150 200 L 150 0"stroke="white" stroke-width="10"'
    + 'transform="translate(0,200)"fill="black" style="border:0;"></path>\n'
    + '<rect class= "resize bottom-right"x="125" y="300" width="75" height="100"'
    + 'style="visibility: hidden;"fill="transparent"/>\n'
    + '<rect class= "resize bottom-left"x="0" y="300" width="75" height="100" style="visibility: hidden;"'
    + 'fill="transparent"/>\n</g>\n'

    var outlineObjectString = '<rect id="cropOutline" x="0" y="0" width="5" height="5"'
    + 'style="fill:rgba(245, 13, 13, 0.15);pointer-events:none; stroke-width:2;stroke:white" />\n';

    var attensionBoxObjectString ='<rect id="attensionBox" x="0" y="0" width="400" height="400"/>\n'
    + '<rect class=" resize top-left" x="0" y="0" width="50" height="50"'
    + 'style="visibility: hidden;fill:transparent; stroke:red" />\n'
    + '<rect class=" resize top-right" x="350" y="0" width="50" height="50"'
    + 'style="visibility: hidden;fill:transparent; stroke:red" />\n'
    + '<rect class=" resize bottom-right" x="350" y="350" width="50" height="50"'
    + 'style="visibility: hidden;fill: transparent; stroke:red" />\n'
    + '<rect class=" resize bottom-left" x="0" y="350" width="50" height="50"'
    + 'style="visibility: hidden;fill:transparent;stroke:red" />\n';

    var eyeObjectString = '<g id="eyePosition" class="draggable confine scaleable" transform-origin="50%; 50%;"'
    + 'transform="translate(150, 100) rotate(0) scale(1.18)" stroke-width="2" style="border:0; padding:0;'
    + 'pointer-events:visible;">\n'
    + '<path id="eyeArrow" x="0" y="0"'
    + 'd="M 25 15 L 50 0 L 75 15 L 25 15" stroke="white" fill="black"/>\n'
    + '<path id= "eyeIconOuter" d="M 14 30 C 14 30 50 -10 85 30 C 85 30 50 75 14 29" fill="black"'
    + 'stroke="white" style="border:0;"></path>\n'
    + '<ellipse id="eyeIconEllipse" cx="50" cy="31" rx="13" ry="15" stroke-width="2" fill="white" stroke="black">'
    + '</ellipse>\n'
    + '<circle id= "eyeIconPupel" r="6" cy="31" cx="50" stroke-width="2" stroke="white" fill="black"' 
    + 'style="border:0;"></circle>\n'
    + '<rect x="0" y="0" class="resize top-left" style="visibility: hidden;"width="30" height="20"stroke="black" '
    + 'fill="transparent"/>\n'
    + '<rect x="70" y="0" class="resize top-right" style="visibility: hidden;"width="20" height="20"stroke="black" '
    + 'fill="transparent"/>\n'
    + '<rect x="70" y="35" class="resize bottom-right" style="visibility:hidden;"width="20"height="20"stroke="black" '
    + 'fill="transparent"/>\n' 
    + '<rect x="0" y="35" class="resize bottom-left" style="visibility: hidden;"width="30" height="20"'
    + ' fill="transparent" stroke="black"/>\n</g>\n';

    var scaleBarObject = '<g id="scalebarPosition" class="draggable confine scalebar scaleable"'
    + 'transform="translate(0, 175) scale(.1)" stroke-width="10"'
    + 'style="border:0; padding:0; pointer-events:all;">\n'
    + '<rect x="0" y="0" id="scalebarBG" width="4325" height="500" style="visibility:hidden;"></rect>\n'
    + '<rect x="150" y="200" id="scalebarOuter" width="4000" height="300"stroke-width="20" stroke="white"'
    + 'fill="black" ></rect>\n'
    + '<path id="scalebarLine" d="M 2150 350 L 4150 350"  stroke="white" stroke-width="50"/>\n'
    + '<path id="scalebarVert" d="M 2150 200 L 2150 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarVert10th" d="M 350 200 L 350 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarLine10th" d="M 150 350 L 350 350"  stroke="white" stroke-width="50"/>\n'
    + '<path id="scalebarVert20th" d="M 550 200 L 550 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarVert30th" d="M 750 200 L 750 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarLine30th" d="M 550 350 L 750 350"  stroke="white" stroke-width="50"/>\n'
    + '<path id="scalebarVert40th" d="M 950 200 L 950 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarVert50th" d="M 1150 200 L 1150 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarLine50th" d="M 950 350 L 1150 350"  stroke="white" stroke-width="50"/>\n'
    + '<path id="scalebarVert60th" d="M 1350 200 L 1350 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarVert70th" d="M 1550 200 L 1550 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarLine70th" d="M 1350 350 L 1550 350"  stroke="white" stroke-width="50"/>\n'
    + '<path id="scalebarVert80th" d="M 1750 200 L 1750 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarVert90th" d="M 1950 200 L 1950 500"  stroke="white" stroke-width="20"/>\n'
    + '<path id="scalebarLine90th" d="M 1750 350 L 1950 350"  stroke="white" stroke-width="50"/>\n'
    + '<text id="scalebarText" x="3975" y="150" font-family="sans-serif"'
    + 'font-size="125" stroke="white"fill="white">\n<%=scalebarLength%><%=scalebarUnits%>\n</text>\n'
    + '<text id="scalebar1" x="110" y="150" font-family="sans-serif"'
    + 'font-size="125" stroke="white"fill="white"> <%=scalebarLength%></text>\n'
    + '<text id="scalebarHalf" x="1075" y="150" font-family="sans-serif" font-size="125"'
    + 'stroke="white"fill="white"></text>\n'
    + '<text id="scalebar0" x="2115" y="150" font-family="sans-serif" font-size="125"'
    + 'stroke="white"fill="white">0</text>\n</g>\n';

    // grab DOM elements that are needed
    var myImage = document.getElementById('crop'),
        line,
        userLineColor;

    svg = document.getElementById('svgWrapper');
    loader = document.getElementById('loading');

    // center the loading gif
    myImage.setAttribute("x",parseInt(w)*1.5 + "px");
    myImage.setAttribute("y",parseInt(h)*1.25 + "px");

    // dynamically add the elements to export better 
    svg.insertAdjacentHTML("beforeend", sunObjectString);
    svg.insertAdjacentHTML("beforeend", northObjectString);
    svg.insertAdjacentHTML('beforeend', outlineObjectString);
    svg.insertAdjacentHTML("beforeend", eyeObjectString);
    svg.insertAdjacentHTML("beforeend", scaleBarObject);

    // save the elements to dynamically add and remove them with a single line of code
    sunImage = document.getElementById("sunPosition"),
    northImage = document.getElementById("northPosition"),
    outlineBox = document.getElementById('cropOutline'),
    eyeImage = document.getElementById('eyePosition'),
    eyeArrow = document.getElementById("eyeArrow"),
    scaleBarIcon = document.getElementById('scalebarPosition'),
    bg = document.getElementById("svgBackground"),
    layerBrowser = document.getElementById("layerBrowser");

    // get half the scalebar length for drawing
    let half = parseFloat(scalebarLength)/2;

    // start the draggable svg element
    makeDraggable(svg);

    // load the users base image as base64 to embed in the svg element
    loadImageAsURL(imageSrc, function(data){
        // remove the loading gif and add the new dataURL
        myImage.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', "");
        myImage.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', data);
        
        // default all transforms
        myImage.setAttribute("x", "0");
        myImage.setAttribute("y", "0");
        myImage.setAttribute("transform", "scale(1)");
    });

/*  // This is how you can have a progress bar for the loading of an image onto the server
    var loadingImg = new Image();
    loadingImg.load(imageSrc); */

    // if the scale bar is not none
    if(scalePX !== 'none' && !isNaN(scalePX)){
        // set the size based on how the image is drawn
        if((w/origW) < (h/origH)){
            scaleBarIcon.setAttribute("transform",
                                            "translate(0, 175) scale(" + (scalePX/4000)* 2 * (w/origW) + ')');
            // set text box font to 11X the scale of the scale bar to account for the change in pixel sizes 
            textSize = (scalePX/4000)* 21 * (w/origW);
        }
        else{
            scaleBarIcon.setAttribute("transform",
                                            "translate(0, 175) scale(" + (scalePX/4000)* 2 * (h/origH) + ')');
            // set text box font to 11X the scale of the scale bar to account for the change in pixel sizes
            textSize = (scalePX/4000)* 21 * (h/origH);
        }
        // if half the bar is less than 1 km then give it the decimal
        if(half < 1){
            // set the half text and ajust based on character count
            document.getElementById("scalebarHalf").innerHTML = half;
        }
        // otherwise parse it to the closest int
        else{
            if(parseInt(half) === half){
                document.getElementById("scalebarHalf").innerHTML = parseInt(half);
            }
            else{
                document.getElementById("scalebarHalf").innerHTML = parseFloat(half).toFixed(1);
            }
        }
        document.getElementById("scalebarText").innerHTML = scalebarLength + scalebarUnits;
        document.getElementById("scalebar1").innerHTML = scalebarLength;
    }
    else{
        // if the scalebarPx is none disable the button
        document.getElementById("scaleBarButton").setAttribute("class",
                                                                "btn btn-secondary btn-lg button disabled");
        // set deafult font size for text boxes note that this is a scale value not px size 
        // (px = font size * textSize)
        textSize = 2;
    }


    // Reset the font 
    if(String(parseInt(half)).length === 1 && half >= 1 && parseInt(half) === half){
        document.getElementById("scalebarHalf").setAttribute("x","1100");
    }
    else if(String(parseInt(half)).length === 3 || half < 1 || parseInt(half) !== half){
        
        if( half < 1 ){
            document.getElementById("scalebarHalf").setAttribute("x","1050");
        }
        else{
            document.getElementById("scalebarHalf").setAttribute("x","1030");
        }
    }
    else{
        console.log("scalebarHalf: " + String(parseInt(half)).length);
    }

    if(String(parseInt(scalebarLength)).length === 2){
        document.getElementById("scalebar1").setAttribute("x","75");
        document.getElementById("scalebarText").setAttribute("x","3985");
    }
    else if(String(parseInt(scalebarLength)).length === 3){
        document.getElementById("scalebar1").setAttribute("x","45");
        document.getElementById("scalebarText").setAttribute("x","4000");
    }   

    // remove the objects because they are not needed yet
    northImage.remove();
    sunImage.remove();
    outlineBox.remove();
    eyeImage.remove();
    scaleBarIcon.remove();

    // set defaults
    outlineBox.style.visibility = 'hidden';

    document.getElementById("changeDimWidth").placeholder = w + " px";
    document.getElementById("changeDimHeight").placeholder = h + " px";
    // set loader to invisible
    loadInvisible();

    // sets the display name
    document.getElementById("imageName").innerHTML = displayCube;

    // set the arrow directions and recieve the data
    getMetadata();

    /** ------------------------------- Export Functions ------------------------------------------------- */

    /**
     * @function exportBtn 'mousedown' event handler
     * 
     * @description shows the loading and progress bar
     * 
    */
    $('#exportBtn').on("mousedown",function(){
        loader.style.visibility = "visible";
        document.getElementById("loadingText").innerHTML = "Save Image As ...";

        var window = document.createElement("div"),
            box = document.createElement("div"),
            inputtext = document.createElement("input"),
            select = document.createElement("select"),
            optiontif = document.createElement("option"),
            optionpng = document.createElement("option"),
            optionjpg = document.createElement("option"),
            optionsvg = document.createElement("option"),
            cancelBtn = document.createElement("button"),
            saveBtn = document.createElement("button");

        window.className = "shadowbox";
        window.style.width = "400px";
        window.style.color = "black";
        window.style.height = "125px";
        window.style.border = "2px solid black";
        window.style.position = "absolute";
        window.style.left = "40%";
        window.style.top = "50%";
        window.style.borderRadius = "10px";
        window.innerHTML = "Save File";
        
        box.style.padding = "0%";
        box.style.display = "flex";
        box.style.background = "transparent";
        box.style.width = "100%";
        box.style.height = "20%";
        box.style.borderTop = "1px solid black";
        box.style.left = "0%";
        box.style.top = "25%";
        box.innerHTML = "Filename: ";
        box.style.textAlign = "left";

        inputtext.type = "text";
        inputtext.style.margin = "auto auto";
        inputtext.style.marginLeft = "5%";
        inputtext.style.width = "85%";
        inputtext.style.marginTop = "1%";
        inputtext.style.fontSize = "12px";
        inputtext.id = "filenameInput";
        inputtext.value = displayCube.replace(".cub", "_fig");
        inputtext.addEventListener("keyup", textParser);

        optiontif.value = ".tif";
        optiontif.innerHTML = ".tif";
        optionpng.value = ".png";
        optionpng.innerHTML = ".png";
        optionjpg.value = ".jpg";
        optionjpg.innerHTML = ".jpg";
        optionsvg.value = ".svg";
        optionsvg.innerHTML = ".svg";

        select.style.right = "10px";
        select.style.margin = "0";
        select.style.marginTop = "1%";
        select.style.height = "25px";
        select.id = "fileExtSelect";

        cancelBtn.style.position = "absolute";
        cancelBtn.style.bottom = "5px";
        cancelBtn.innerHTML = "Cancel";
        cancelBtn.className = "btn btn-md button";
        cancelBtn.style.left = "25%";
        cancelBtn.style.background = "red";
        cancelBtn.id = "cancelBtn";
        cancelBtn.addEventListener("click", cancelBtnFunction);

        saveBtn.style.position = "absolute";
        saveBtn.style.bottom = "5px";
        saveBtn.style.right = "25%";
        saveBtn.innerHTML = "Save";
        saveBtn.className = "btn btn-md button";
        saveBtn.addEventListener("click", saveBtnFunction);

        select.appendChild(optiontif);
        select.appendChild(optionsvg);
        select.appendChild(optionpng);
        select.appendChild(optionjpg);

        box.appendChild(cancelBtn);
        box.appendChild(saveBtn);
        box.appendChild(inputtext);
        box.appendChild(select);
        window.appendChild(box);
        
        var mainbox = document.getElementsByClassName("mainbox-center");

        mainbox[0].appendChild(window);

        // set all detection for every symbol
        setSvgClickDetection(document.getElementById("svgWrapper"),"none");
        activeLayer.style.border = "none";
    });


    /**
     * @function saveBtnFunction
     * 
     * @description Checks to see if the filename if a properfilename and then saves the file using the server 
     *              like it did before in the old export function
     */
    function saveBtnFunction(){
        var filename = document.getElementById("filenameInput").value + document.getElementById("fileExtSelect").value;

        if(/^.*\.(jpg|jpeg|png|tif|svg)$/gm.test(filename)){
            // hide the save ui div
            this.offsetParent.remove();

            // if the file is not null
            if(filename !== null){
                // read the file extenson
                var fileExt = filename.split(".")[filename.split(".").length - 1];
                // get lowercase file extension
                filename = filename.replace("." + fileExt, "." + fileExt.toLowerCase());

                // encode the svg to a string
                var data = 
                    '<?xml version="1.1" encoding="UTF-8"?>\n'
                    + (new XMLSerializer()).serializeToString(svg);
                
                // creates a blob from the encoded svg and sets the type of the blob to and image svg
                var svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
                
                // create the progress bar
                var progressBar = showProgress();

                
                // create a new Form data object
                let fd = new FormData();
                // append a new file to the form. 
                // upl = name of the file upload
                // svgBlob is the raw blob image
                // and the name of the svg file will be the user's unique id
                fd.append("upl", svgBlob, getCookie("puiv") + ".svg");
                // append download and canvas data to the form
                fd.append("w",w);
                fd.append("h",h);
                fd.append("downloadName", filename);
                var headers = new Headers();
                headers.append("pragma","no-cache");
                headers.append("cache-control", "no-cache");

                // send a post request to the server attaching the formData as the body of the request
                fetch('/figureDownload',
                    {
                        method:'POST',
                        body: fd,
                        headers: headers,
                        referrerPolicy: "no-referrer"
                    })
                .then((response) =>{
                    growProgress(progressBar);
                    // if the response is an error code
                    if(response.status !== 200){
                        // read the response as text
                        response.text().then((responseText) =>{
                            // create a small div box to notify the error
                            let div = document.createElement("div");
                            div.className = "jumbotron text-center float-center";
                            div.style.width = "25rem";
                            div.style.height= "auto";
                            div.style.position = "absolute";
                            div.style.left = "45%";
                            div.style.top = "45%";
                            div.innerHTML = responseText;
                            // attach a button to the div so the user can remove the div if they want
                            var btn = document.createElement("button");
                            btn.className = "btn btn-danger";
                            btn.style.position = "relative";
                            btn.innerHTML = "&times;";
                            btn.style.width = "5rem";
                            // append the button to the div
                            div.appendChild(btn);
                            // then after it has been added,
                            // make an eventLister to remove the whole div box when the button is clicked
                            btn.addEventListener("click",function(event){
                                this.parentElement.remove();
                            });
                            // append the whole div to the document
                            document.body.appendChild(div);
                            loader.style.visibility = "hidden";
                            document.getElementById("loadingText").innerHTML = "Loading";
                            hideProgress(progressBar);
                            if(activeLayer){
                                setDetectionForLayer(activeLayer, "all");
                                activeLayer.style.border = "5px solid red";
                            }
                            else{
                                setDetectionForLayer(null, "all");
                            }
                        });
                    }
                    else{
                        // server sent back a 200
                        response.blob().then((blob)=>{
                            var url = DOMURL.createObjectURL(blob);

                            triggerDownload(url, filename);
                            setInterval(hideProgress, 1000, progressBar);
                            loader.style.visibility = "hidden";
                            document.getElementById("loadingText").innerHTML = "Loading";
                            DOMURL.revokeObjectURL(url);
                            if(activeLayer){
                                setDetectionForLayer(activeLayer, "all");
                                activeLayer.style.border = "5px solid red";
                            }
                            else{
                                setDetectionForLayer(null, "all");
                            }
                        });
                    }
                }).catch((err) =>{
                    // catch any fetch errors
                    if(err){
                        console.log(err);
                    }

                    if(activeLayer){
                        setDetectionForLayer(activeLayer, "all");
                        activeLayer.style.border = "5px solid red";
                    }
                    else{
                        setDetectionForLayer(null, "all");
                    }
                });
            }
            else{
                //remove the loading gif
                loader.style.visibility = "hidden";
                document.getElementById("loadingText").innerHTML = "Loading";
                if(activeLayer){
                    setDetectionForLayer(activeLayer, "all");
                    activeLayer.style.border = "5px solid red";
                }
                else{
                    setDetectionForLayer(null, "all");
                }

            }
        }
        else{
            // filename does not fit the reg exp
            console.log("REGEXP evaluated to false");
        }   
    }

    /**
     * @function cancelBtnFunction
     * 
     * @description cancel button that removes the save div and hides the loading gif
     */
    function cancelBtnFunction(){
        // cancel the saving process
        this.offsetParent.remove();
        document.getElementById("loading").style.visibility = "hidden";

        if(activeLayer){
            setDetectionForLayer(activeLayer, "all");
            activeLayer.style.border = "5px solid red";
        }
        else{
            setDetectionForLayer(null, "all");
        }
    }

    /**
     * @function textParser
     * 
     * @description parses over the text in the filename and removes any file extension thats could
     *              repeat in the name
     */
    function textParser(){
        var arr = [".tif", ".tiff", ".png", ".svg", ".jpg", ".jpeg"];
        if(/^.*\.(jpg|jpeg|svg|png|tif|tiff)$/gm.test(String(this.value).toLowerCase())){
            for(let i = 0; i < arr.length; i++){
                this.value = this.value.replace(arr[i],"");

                if(!(/^.*\.(jpg|jpeg|svg|png|tif|tiff)$/gm.test(String(this.value).toLowerCase()))){
                    alert("Enter Filname with no extension");
                    break;
                }
            }    
        } 
    }

    /** --------------------------------- End Export Functions ------------------------------------------- */

    /** ---------------------------------- UI Interactions ----------------------------------------------- */
    // ----------------------------------- Help Button ------------------------------------------------------
    /**
     * @function hideBtn 'mousedown' event handler
     * 
     * @description hide the help box element
     * 
    */
    $("#hideBtn").on("mousedown", function(){
        document.getElementById("help-box").style.visibility = "hidden";
    });

    /**
     * @function helpBtn 'mousedown' event handler
     * 
     * @description shows the help box element
     * 
    */
    $("#helpBtn").on("mousedown", function(){
        document.getElementById("help-box").style.visibility = "visible";
    });
    // --------------------------------- End Help Button ----------------------------------------------------
            
    // -------------------------------- Color Selection Handlers --------------------------------------------
    /**
     * @function northCheckbox 'change' event handler
     * 
     * @description when the check box changes toggle the colors of the icons children
     * 
    */
    $("#northCheckbox").on("change",function(){
        // get all children in the group
        let children = northImage.childNodes;
        
        // for each child
        for(index in children){
            // if the child is an object
            if(typeof(children[index]) == "object"){
                if(children[index].nodeName !== "#text"){
                    // call opposite for fill and stroke
                    if(children[index].getAttribute("stroke")){
                        children[index].setAttribute("stroke",
                                                        setOpposite(children[index].getAttribute("stroke")));
                    }
                    if(children[index].getAttribute("fill")){
                        children[index].setAttribute("fill",
                                                        setOpposite(children[index].getAttribute("fill")));
                    }
                }
            }
        }

        if(activeLayer) { 
            // set all detection for every symbol
            setSvgClickDetection(document.getElementById("svgWrapper"),"all");
            activeLayer.style.border = "none";
        }
        // set the selected element
        activeLayer = document.getElementById("layernorthIconFlag");
        activeLayer.style.border = "5px solid red";
        setSvgClickDetection(document.getElementById("svgWrapper"),"none");
        setDetectionForLayer(activeLayer, "all");
    });


    /**
     * @function sunCheckbox 'change' event handler
     * 
     * @description when the check box changes toggle the colors of the icons children
     * 
    */
    $("#sunCheckbox").on("change",function(){
        let children = sunImage.childNodes;
        
        for(index in children){
            if(typeof(children[index]) == "object" && children[index].nodeName !== "#text"){
                if(children[index].getAttribute("stroke")){
                    children[index].setAttribute("stroke",
                                                    setOpposite(children[index].getAttribute("stroke")));
                }
                if(children[index].getAttribute("fill")){
                    children[index].setAttribute("fill",
                                                    setOpposite(children[index].getAttribute("fill")));
                }
            }
        }

        if(activeLayer) { 
            // set all detection for every symbol
            setSvgClickDetection(document.getElementById("svgWrapper"),"all");
            activeLayer.style.border = "none";
        }
        // set the selected element
        activeLayer = document.getElementById("layersunIconFlag");
        activeLayer.style.border = "5px solid red";
        setSvgClickDetection(document.getElementById("svgWrapper"),"none");
        setDetectionForLayer(activeLayer, "all");
    });


    /**
     * @function scaleCheckbox 'change' event handler
     * 
     * @description when the check box changes toggle the colors of the icons children
     * 
    */
    $("#scaleCheckbox").on("change",function(){
        var children = scaleBarIcon.childNodes;

        for(index in children){
            if(typeof(children[index]) == "object"){
                if(children[index].nodeName !== "#text"){
                    if(children[index].getAttribute("stroke")){
                        children[index].setAttribute("stroke",
                                                        setOpposite(children[index].getAttribute("stroke")));
                    }
                    if(children[index].getAttribute("fill")){
                        children[index].setAttribute("fill",
                                                        setOpposite(children[index].getAttribute("fill")));
                    }
                }
            }
        }
    });


    /**
     * @function eyeCheckbox 'change' event handler
     * 
     * @description when the check box changes toggle the colors of the icons children
     * 
    */
    $("#eyeCheckbox").on("change",function(){
        let children = eyeImage.childNodes;
        
        for(index in children){
            if(typeof(children[index]) === "object"){
                if(children[index].nodeName !== "#text"){
                    if(children[index].getAttribute("stroke")){
                        children[index].setAttribute("stroke",
                                                        setOpposite(children[index].getAttribute("stroke")));
                    }
                    if(children[index].getAttribute("fill")){
                        children[index].setAttribute("fill",
                                                        setOpposite(children[index].getAttribute("fill")));
                    }
                }
            }
        }

        if(activeLayer) { 
            // set all detection for every symbol
            setSvgClickDetection(document.getElementById("svgWrapper"),"all");
            activeLayer.style.border = "none";
        }
        // set the selected element
        activeLayer = document.getElementById("layereyeFlag");
        activeLayer.style.border = "5px solid red";
        setSvgClickDetection(document.getElementById("svgWrapper"),"none");
        setDetectionForLayer(activeLayer, "all");
    });


    /**
     * @function viewOption 'change' event handler
     * 
     * @description change the view of the image that the user is viewing
     * 
    */
    $("#viewOption").on("change", function(){
        if($(this).is(":checked")){
            if(w >= h){
                $("#imageViewContainer").css({"width":"55%"});
                $("#imageViewContainer").css({"height":"auto"});
            }
            else{
                $("#imageViewContainer").css({"width":"auto"});
                $("#imageViewContainer").css({"height":window.innerHeight/1.25 + "px"});
            }
        }
        else{
            $("#imageViewContainer").css({"width":"auto"});
            $("#imageViewContainer").css({"height":"100%"});
        }
    });


    //TODO:
    function setElementColor(UIBox, color, el) {
        var svgIcon = document.getElementById( UIBox.getAttribute("id").split("layer")[1] );

        // chnage color of icon in svg
        svgIcon.style.stroke = color;

        if(UIBox.firstElementChild){
            UIBox.firstElementChild.firstElementChild.style.stroke = color;
            UIBox.firstElementChild.firstElementChild.setAttribute("marker-start",el.getAttribute("marker-start"));        
        }
        else{
            UIBox.style.color = color;
        }
    }

    /**
     * @function colorPickerLine 'change' event handler
     * 
     * @description when the color value is changed in the color picker set the global
     * 
    */
    $("#colorPickerLine").change(function(){
        userLineColor = document.getElementById("colorPickerLine").value;

        if(activeLayer && activeLayer.getAttribute("id").indexOf("line") > -1){
            // generate the arrowhead if needed
            var activeLine = document.getElementById(activeLayer.getAttribute("id").split("layer")[1]);

            if(activeLine.getAttribute("marker-start")){
                var markerId = activeLine.getAttribute("marker-start").split("url(#")[1].replace(")","");

                if(markerId === "arrow" || document.getElementById(markerId).style.fill !== userLineColor){
                    // create a brand new def 
                    var newId = "arrow" + layerId++,
                    pathId = "arrowPath" + layerId++,
                    newDef = document.getElementById("arrowDef").cloneNode();

                    newDef.setAttribute("id", "arrowDef" + lineArr.length);
                    newDef.innerHTML = document.getElementById("arrowDef").innerHTML;
                    activeLine.setAttribute("marker-start", String("url(#" + newId + ")"));
                    (newDef.childNodes).forEach(childElem => {
                        // if the childElement has a child
                        if(childElem.childElementCount > 0){
                            childElem.setAttribute("id", newId);
                            childElem.childNodes[1].setAttribute("fill", userLineColor);
                            childElem.childNodes[1].setAttribute("id", pathId);
                        }
                    });
                    svg.prepend(newDef);


                    // set the stroke color if the line
                    setElementColor(activeLayer, userLineColor, activeLine );
                    return;
                }
                else{
                    // find the def and change it
                    var marker = document.getElementById(markerId);            
                    
                    marker.children[0].setAttribute("fill", userLineColor);
                    
                    // set the stroke color if the line
                    setElementColor(activeLayer, userLineColor, activeLine );
                    return;
                }
            }


            // set the stroke color if the line
            setElementColor(activeLayer, userLineColor, activeLine );
        }
    });


    /**
     * @function colorPickerBox 'change' event handler
     * 
     * @description when the color value is changed in the color picker set the global
     * 
    */
    $("#colorPickerBox").change( function(){
        userBoxColor = document.getElementById("colorPickerBox").value;

        if(activeLayer && activeLayer.getAttribute("id").indexOf("outline") > -1){
            var activeBox = document.getElementById(activeLayer.getAttribute("id").split("layer")[1]);

            activeBox.style.stroke = userBoxColor;

            setElementColor( activeLayer, userBoxColor, activeBox );
        }
    });


    /**
     * @function textColorPicker 'change' event handler
     * 
     * @description when the color value is changed in the color picker set the global
     * 
    */
    $("#textColorPicker").on("change",function(){
        userTextColor = document.getElementById("textColorPicker").value;

        if(activeLayer && activeLayer.getAttribute("id").indexOf("text") > -1){
            var activeText = document.getElementById(activeLayer.getAttribute("id").split("layer")[1]);

            activeText.children[0].style.stroke = userTextColor;
            activeText.children[0].style.fill = userTextColor;

            setElementColor( activeLayer, userTextColor, activeText );
        }
    });

    // ------------------------------ End Color Pickers -----------------------------------------------------
        
    // -------------------------------- Undo Button UI ------------------------------------------------------
    /**
     * @function undoLine 'mousedown' event handler
     * 
     * @description remove the last added instance of the lines
    */
    $("#undoLine").on("mousedown",function(){
        if(lineArr.length > 0 && clickArray.length > 1){
            let elem = lineArr.pop();
            if(elem.getAttribute("marker-start")){
                // remove the arrow def based on marker-start value
                let id = elem.getAttribute("marker-start").replace("url(","").replace(")","");

                if(id !== "#arrow"){
                    $(id).parent().remove();
                }
            }
            elem.remove();
            svg.className.baseVal = "image-image float-center";
            document.getElementById("pencilIconFlag").className = "btn btn-lg button";
            drawFlag = false;
            clickArray = [];
        }
        else if(lineArr.length > 0){
            var elem = lineArr.pop();

            if(elem.getAttribute("marker-start")){
                // remove the arrow def based on marker-start value
                let id = elem.getAttribute("marker-start").replace("url(","").replace(")","");

                if(id !== "#arrow"){
                    $(id).parent().remove();
                }
            }
            elem.remove();
        }
        else{
            alert("No lines drawn");
        }

        if(lineArr.length === 0){
            document.getElementById("undoLine").style.visibility = "hidden";
        }
    });



    // TODO:
    function moveSvgTo(id, direction) {
        var elem_choice = document.getElementById(id.split("layer")[1]);
        
        if(elem_choice.nodeName !== "g" || elem_choice.nodeName !== "line" ){
            if(id.split("layer")[1].indexOf("sun")  > -1 ){
                elem_choice = sunImage;
            }
            else if(id.split("layer")[1].indexOf("eye")  > -1 ){
                elem_choice = eyeImage;
            }
            else if(id.split("layer")[1].indexOf("north")  > -1 ){
                elem_choice = northImage;
            }
            else if(id.split("layer")[1].indexOf("scalebar")  > -1 ){
                elem_choice = scaleBarIcon;
            }
        }

        if(elem_choice){
            
            // move index of element by one either up or down
            if (direction === -1 && elem_choice.previousSibling) {
                svg.insertBefore(elem_choice, elem_choice.previousSibling);
                
            } else if (direction === 1 && elem_choice.nextSibling) {
                svg.insertBefore(elem_choice, elem_choice.nextSibling.nextSibling);
            }
        }
    }


    // TODO:
    function moveChoiceTo(elem_choice, direction) {

        var parent = elem_choice.parentNode;
        // move index of element by one either up or down
        if (direction === 1 && elem_choice.previousSibling) {
            let code = parent.insertBefore(elem_choice, elem_choice.previousSibling);
            
            if(code === elem_choice){
                moveSvgTo( elem_choice.getAttribute("id"), direction);
            }
        } else if (direction === -1 && elem_choice.nextSibling) {
            let code = parent.insertBefore(elem_choice, elem_choice.nextSibling.nextSibling);
            
            if(code === elem_choice){
                moveSvgTo( elem_choice.getAttribute("id"), direction);
            }
        }
    }


    /**
     * @function document 'keyup' event handler
     * 
     * @description if the key pressed was esc and draw flag is true then undo the line
     * 
    */
    $(document).keyup(function(event){
        // when escape is clicked with the drawFlag true
        if(event.keyCode === 27 && drawFlag){
            if(lineArr.length > 0 && clickArray.length > 1){
                let elem = lineArr.pop();
                if(elem.getAttribute("marker-start")){
                    // remove the arrow def based on marker-start value
                    let id = elem.getAttribute("marker-start").replace("url(","").replace(")","");
    
                    if(id !== "#arrow"){
                        $(id).parent().remove();
                    }
                }
                elem.remove();
                clickArray = [];
            }
        }
        else if(activeLayer && event.keyCode === 27){
           
            setSvgClickDetection(svg,"all");
            activeLayer.style.border = "none";
            activeLayer = null;
            
        }
        else if(event.keyCode === 40 && activeLayer){
            moveChoiceTo(activeLayer,-1); 
        }
        else if(event.keyCode === 38 && activeLayer){
            moveChoiceTo(activeLayer,1);
        }
    });
    

    // -------------------------------- End Undo Button UI --------------------------------------------------

    // ------------------------------- Button Handlers ------------------------------------------------------
      

    /**
     * @function resizeUpdateBtn 'mousedown' event handler
     * 
     * @description fetches the new sized image and scalebar dimensions
     */
    $("#resizeUpdateBtn").on("mousedown", function(){
        // required elemnts
        var displayCube = document.getElementById("displayCube"),
            scalebarHalf = document.getElementById("scalebarHalf"),
            scalebarText = document.getElementById("scalebarText"),
            scalebar1 = document.getElementById("scalebar1"),
            displayString = displayCube.innerHTML,
            widthInput = document.getElementById("changeDimWidth").value,
            heightInput = document.getElementById("changeDimHeight").value;
            
        var dim = {
            w:"0",
            h:"0"
        };

        // if the scalebar is not on the image
        if(scalebarHalf === null){
            // place the icon
            $("#scaleBarButton").mousedown();
            
            // grab the elements
            scalebarHalf = document.getElementById("scalebarHalf");
            scalebarText = document.getElementById("scalebarText");
            scalebar1 = document.getElementById("scalebar1");
            
            // remove it again
            $("#scaleBarButton").mousedown();
        }

        // reset the padding to 0
        $("#resetPaddingBtn").click();

        // get new image dimensions
        dim.w = parseInt(displayString.split("×")[0]);
        dim.h = parseInt(displayString.split("×")[1]);

        // if either of the inputs is not empty and more than 1000 and new dimensions are not the same as before
        if((widthInput !== "" || heightInput !== "")
            && (parseInt(widthInput) >= 1000 || parseInt(heightInput) >= 1000)
            && (dim.w !== widthInput || dim.h !== heightInput)) {
            
            // get user id from browser cookie
            let id = getCookie("puiv");
            var fd = new FormData(),
                headers = new Headers();
            
            if(widthInput === ""){
                widthInput = parseInt(document.getElementById("changeDimWidth").getAttribute("placeholder"));
                fd.append("h",heightInput);
                // -1 to denote auto generation
                fd.append("w", widthInput);
            }
            else if(heightInput === ""){
                heightInput = parseInt(document.getElementById("changeDimHeight").getAttribute("placeholder"));
                fd.append("w", widthInput);
                fd.append("h", heightInput);
            }
            else{
                // both are not empty
                fd.append("w", widthInput);
                fd.append("h", heightInput);
            }

            // make sure the id is not undefined on server
            fd.append("id", id);
            headers.append("pragma","no-cache");
            headers.append("cache-control", "no-cache");

            // calculate difference
            var heightDifference = dim.h - heightInput,
                widthDifference = dim.w - widthInput;

            fetch('/resizeFigure',
                {
                    method:'POST',
                    body: fd,
                    headers: headers,
                    referrerPolicy: "no-referrer"
                })
            .then((response) =>{
                if(response.status === 200){
                    // read the new file and convert to data url
                    response.blob().then((data, err)=>{
                        var reader = new FileReader();
                        
                        // read image as data url
                        reader.readAsDataURL(data);

                        // when reader is done loading
                        reader.onloadend = function(){

                            // set new interface
                            myImage.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', reader.result);
                            myImage.setAttribute("width", widthInput);
                            myImage.setAttribute("height", heightInput);
                            bg.setAttribute("width", widthInput);
                            bg.setAttribute("height", heightInput);
                            svg.setAttribute("viewBox", "0 0 " + widthInput + " " + heightInput);

                            w = Number(widthInput);
                            h = Number(heightInput);
                            displayCube.innerHTML = widthInput + " &times; " + heightInput + " px";

                            // shift icons
                            resetIcons(svg, heightDifference, widthDifference);
                            fd = new FormData();

                            fd.append("id", id);
                            fetch("/evalScalebar", 
                                {
                                    method: 'POST',
                                    body: fd,
                                    headers: headers,
                                    referrerPolicy: "no-referrer"
                                })
                            .then(response => {
                                response.blob().then((data, err)=> {
                                    var reader = new FileReader();
                                    
                                    //read json data as string
                                    reader.readAsText(data);

                                    // when the read is finished
                                    reader.onloadend = function(){
                                        // load the json structure out of the text string
                                        var body = JSON.parse(reader.result);

                                        scalePX = parseFloat(body["scalebarPX"]);
                                        scalebarLength = parseFloat(body["scalebarLength"]);

                                        scalebarUnits = body["scalebarUnits"];
                                        var half = parseFloat(scalebarLength)/2;
                                        origW = parseInt(body["origW"]);
                                        origH = parseInt(body["origH"]);

                                        
                                        // if the scale bar is not none
                                        if(scalePX !== 'none' && !isNaN(scalePX) && half !== null){
                                            // set the size based on how the image is drawn
                                            if((widthInput/origW) < (heightInput/origH)){
                                                scaleBarIcon.setAttribute("transform",
                                                    "translate(0, 175) scale(" 
                                                    + (scalePX/4000)* 2 * (widthInput/origW) + ')');
                                                // set text box font to 11X the scale of the scale bar
                                                // to account for the change in pixel sizes 
                                                textSize = (scalePX/4000)* 21 * (widthInput/origW);
                                            }
                                            else{
                                                scaleBarIcon.setAttribute("transform",
                                                                    "translate(0, 175) scale(" 
                                                                    + (scalePX/4000)* 2 * (heightInput/origH) + ')');
                                                // set text box font to 11X the scale of the scale bar to 
                                                // account for the change in pixel sizes
                                                textSize = (scalePX/4000)* 21 * (heightInput/origH);
                                            }
                                            // if half the bar is less than 1 km then give it the decimal
                                            if(half < 1){
                                                // set the half text and ajust based on character count
                                                scalebarHalf.innerHTML = half;
                                            }
                                            // otherwise parse it to the closest int
                                            else{
                                                if(parseInt(half) === half){
                                                    scalebarHalf.innerHTML = parseInt(half);
                                                }
                                                else{
                                                    scalebarHalf.innerHTML = parseFloat(half).toFixed(1);
                                                }
                                            }
                                            scalebarText.innerHTML = scalebarLength + scalebarUnits;
                                            scalebar1.innerHTML = scalebarLength;
                                        }
                                        else{
                                            // if the scalebarPx is none disable the button
                                            document.getElementById("scaleBarButton").setAttribute("class",
                                                                        "btn btn-secondary btn-lg button disabled");
                                            // set deafult font size for text boxes note that
                                            // this is a scale value not px size 
                                            // (px = font size * textSize)
                                            textSize = 2;
                                        }
                                
                                        // Reset the font
                                        if(half !== null && scalebarHalf !== null){
                                            if(String(parseInt(half)).length === 1 && half >= 1 
                                                && parseInt(half) === half){
                                                scalebarHalf.setAttribute("x","1100");
                                            }
                                            else if(String(parseInt(half)).length === 3 || half < 1 
                                                || parseInt(half) !== half){
                                                
                                                if( half < 1 ){
                                                    scalebarHalf.setAttribute("x","1050");
                                                }
                                                else{
                                                    scalebarHalf.setAttribute("x","1030");
                                                }
                                            }
                                            else{
                                                console.log("scalebarHalf: " + String(parseInt(half)).length);
                                            }
    
                                            if(String(parseInt(scalebarLength)).length === 2){
                                                scalebar1.setAttribute("x","75");
                                                scalebarText.setAttribute("x","3985");
                                            }
                                            else if(String(parseInt(scalebarLength)).length === 3){
                                                scalebar1.setAttribute("x","45");
                                                scalebarText.setAttribute("x","4000");
                                            }   
                                        }
                                    } 
                                        
                                });
                            })
                            .catch(err => {
                                console.log(err);
                            });
                        }
                    });
                } 
            }).catch((err) =>{
                // catch any fetch errors
                if(err){
                    console.log(err);
                }
            });
        }
        else if(widthInput === "" && heightInput === ""){
            // both inputs empty
            var dim = {
                w:"0",
                h:"0"
            };
    
            dim.w = parseInt(displayString.split("×")[0]);
            dim.h = parseInt(displayString.split("×")[1]);

            widthInput = parseInt(document.getElementById("changeDimWidth").getAttribute("placeholder"));
            heightInput = parseInt(document.getElementById("changeDimHeight").getAttribute("placeholder"));

            var heightDifference = (heightInput !== "") ? dim.h - heightInput : dim.h - h ,
                widthDifference = (widthInput !== "") ? dim.w - widthInput : dim.w - w ;

            if(heightDifference || widthDifference){
                var fd = new FormData(),
                    headers = new Headers();

                fd.append("w", widthInput);
                fd.append("h", heightInput);

                // make sure the id is not undefined on server
                fd.append("id", getCookie("puiv"));
                headers.append("pragma","no-cache");
                headers.append("cache-control", "no-cache");

                fetch('/resizeFigure',
                    {
                        method:'POST',
                        body: fd,
                        headers: headers,
                        referrerPolicy: "no-referrer"
                    })
                .then((response) =>{
                    if(response.status === 200){
                        // read the new file and convert to data url
                        response.blob().then((data, err)=>{
                            // read the blob as a data URL
                            var reader = new FileReader();
                            reader.readAsDataURL(data);
                            reader.onloadend = function(){
                                // set the new image dimensions in the client
                                myImage.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', reader.result);
                                myImage.setAttribute("width", widthInput);
                                myImage.setAttribute("height", heightInput);
                                bg.setAttribute("width", widthInput);
                                bg.setAttribute("height", heightInput);
                                svg.setAttribute("viewBox", "0 0 " + widthInput + " " + heightInput);

                                displayCube.innerHTML = widthInput + " &times; " + heightInput + " px";

                                w = widthInput;
                                h = heightInput;
                                
                                // shift the icons
                                resetIcons(svg, heightDifference, widthDifference);
                                fd = new FormData();

                                fd.append("id", getCookie("puiv"));
                                fetch("/evalScalebar",
                                {
                                    method: 'POST',
                                    body: fd,
                                    headers: headers,
                                    referrerPolicy: "no-referrer"
                                })
                                .then(response => {
                                    response.blob().then((data, err)=> {
                                        var reader = new FileReader();
                                        reader.readAsText(data);
    
                                        reader.onloadend = function(){
                                            var body = JSON.parse(reader.result);

                                            scalePX = parseFloat(body["scalebarPX"]);
                                            scalebarLength = parseFloat(body["scalebarLength"]);
    
                                            var half = parseFloat(scalebarLength)/2;
                                            scalebarUnits = body["scalebarUnits"];
                                            origW = parseInt(body["origW"]);
                                            origH = parseInt(body["origH"]);
    
                                            // if the scale bar is not none
                                            if(scalePX !== 'none' && !isNaN(scalePX) && half !== null){
                                                // set the size based on how the image is drawn
                                                if((widthInput/origW) < (heightInput/origH)){
                                                    scaleBarIcon.setAttribute("transform",
                                                                        "translate(0, 175) scale(" 
                                                                        + (scalePX/4000)* 2 * (widthInput/origW) +')');
                                                    // set text box font to 11X the scale of the scale bar
                                                    // to account for the change in pixel sizes 
                                                    textSize = (scalePX/4000)* 21 * (widthInput/origW);
                                                }
                                                else{
                                                    scaleBarIcon.setAttribute("transform",
                                                                    "translate(0, 175) scale(" 
                                                                    + (scalePX/4000)* 2 * (heightInput/origH) + ')');
                                                    // set text box font to 11X the scale of the scale bar
                                                    // to account for the change in pixel sizes
                                                    textSize = (scalePX/4000)* 21 * (heightInput/origH);
                                                }
                                                // if half the bar is less than 1 km then give it the decimal
                                                if(half < 1){
                                                    // set the half text and ajust based on character count
                                                    scalebarHalf.innerHTML = half;
                                                }
                                                // otherwise parse it to the closest int
                                                else{
                                                    if(parseInt(half) === half){
                                                        scalebarHalf.innerHTML = parseInt(half);
                                                    }
                                                    else{
                                                        scalebarHalf.innerHTML = parseFloat(half).toFixed(1);
                                                    };
                                                }
                                                scalebarText.innerHTML = scalebarLength + scalebarUnits;
                                                scalebar1.innerHTML = scalebarLength;
                                            }
                                            else{
                                                // if the scalebarPx is none disable the button
                                                document.getElementById("scaleBarButton").setAttribute("class",
                                                                        "btn btn-secondary btn-lg button disabled");
                                                // set deafult font size for text boxes note that this 
                                                // is a scale value not px size (px = font size * textSize)
                                                textSize = 2;
                                            }

                                            // Reset the font 
                                            if(half !== null && scalebarHalf !== null){
                                                if(String(parseInt(half)).length === 1 
                                                    && half >= 1 && parseInt(half) === half){
                                                    scalebarHalf.setAttribute("x","1100");
                                                }
                                                else if(String(parseInt(half)).length === 3 
                                                    || half < 1 || parseInt(half) !== half){
                                                    
                                                    if( half < 1 ){
                                                        scalebarHalf.setAttribute("x","1050");
                                                    }
                                                    else{
                                                        scalebarHalf.setAttribute("x","1030");
                                                    }
                                                }
                                                else{
                                                    console.log("scalebarHalf: " + String(parseInt(half)).length);
                                                }
        
                                                if(String(parseInt(scalebarLength)).length === 2){
                                                    scalebar1.setAttribute("x","75");
                                                    scalebarText.setAttribute("x","3985");
                                                }
                                                else if(String(parseInt(scalebarLength)).length === 3){
                                                    scalebar1.setAttribute("x","45");
                                                    scalebarText.setAttribute("x","4000");
                                                }
                                            }   
                                        }
                                    });
                                })
                                .catch(err => {
                                    console.log(err);
                                });
                            }
                        });
                    }
                    else{
                        console.log(response.status + " is the returned status");
                    }
                }).catch((err) =>{
                    // catch any fetch errors
                    if(err){
                        console.log(err);
                    }
                });
            }
        }
        else if(widthInput < 1000 || heightInput < 1000){
            // if dimensions are not accepted
            alert("At least 1 Dimensions need to be 1000 or more");
        }
    });

    /**
     * @function changeDimHeight on 'keyup' handler
     * 
     * @description make sure the input in not over 5000 or empty
     */
    $("#changeDimHeight").on("keyup", function(event){
        var boxInput = parseInt(this.value);

        if(isNaN(boxInput)){
            this.value = "";
        }
        else if(boxInput > 5000){
            this.value = 5000;
        }
        else{
            this.value = boxInput;
        }    
    });

    /**
     * @function changeDimWidth on 'keyup' handler
     * 
     * @description make sure the input in not over 5000 or empty
     */
    $("#changeDimWidth").on("keyup", function(event){
        var boxInput = parseInt(this.value);

        if(isNaN(boxInput)){
            this.value = "";
        }
        else if(boxInput > 5000){
            this.value = 5000;
        }
        else{
            this.value = boxInput;
        }
        
    });
 
 
    /**
     * @function scaleBarButton 'mousedown' event handler
     * 
     * @description When clicked toggle the scalebar on and off by appending and removing it as needed
     * 
    */
    $("#scaleBarButton").on("mousedown", function(){
        var scaleCheckbox = document.getElementById("scaleCheckbox"),
            scaleCheckboxLabel = document.getElementById("scaleCheckboxLabel"),
            scaleCheckboxSlider = document.getElementById("scaleCheckboxSlider"),
            scaleAnimation = document.getElementById("scaleAnimation");

        // if the scalebar btn is not disabled
        if(!this.classList.contains("disabled")){
            // clear all draw instance data if the flag is true
            if(drawFlag){
                resetDrawTool();
            }

            // if scalebar true then toggle the bar on
            if(toggleScalebar){
                // add bar and toggle the boolean
                svg.appendChild(scaleBarIcon);
                this.className = "btn btn-danger btn-lg button";

                scaleCheckbox.style.visibility = "visible";
                scaleCheckboxLabel.style.visibility = "visible";

                scaleCheckbox.style.transition = ".4s";
                scaleCheckbox.style.webkitTransition = ".4s";
                scaleCheckboxLabel.style.transition = ".4s";
                scaleCheckboxLabel.style.webkitTransition = ".4s";
                scaleCheckboxSlider.style.transition = ".4s";
                scaleCheckboxSlider.style.webkitTransition = ".4s";
                scaleAnimation.style.transition = ".4s";
                scaleAnimation.style.webkitTransition = ".4s";
                updateLayers(this.cloneNode(true));

                toggleScalebar = false;
            }
            else{
                // remove the bar and reset toggleValue
                scaleBarIcon.remove();
                toggleScalebar = true;
                this.className = "btn btn-lg button";

                scaleCheckbox.style.transition = "0s";
                scaleCheckbox.style.webkitTransition = "0s";
                scaleCheckboxLabel.style.transition = "0s";
                scaleCheckboxLabel.style.webkitTransition = "0s";
                scaleCheckboxSlider.style.transition = "0s";
                scaleCheckboxSlider.style.webkitTransition = "0s";
                scaleAnimation.style.transition = "0s";
                scaleAnimation.style.webkitTransition = "0s";
                removeLayers(this.cloneNode(true).firstElementChild);
                scaleCheckbox.style.visibility = "hidden";
                scaleCheckboxLabel.style.visibility = "hidden";
            }
        }
    });


    /**
     * @function textBtn 'mousedown' event handler
     * 
     * @description draw the text on screen with the rectangles to help resizing occur
     * 
    */
    $("#textBtn").on("mousedown", function(){
        // clear all draw instance data if the flag is true
        if(drawFlag){
            resetDrawTool();
        }

        // prompt for text box contents
        var textboxVal = prompt("What Should It Say?","");
        
        if(textboxVal !== "" && textboxVal){
            
            let strlength = textboxVal.length; 
            
            // Draw the scaleable and draggable group with the new text element dynamically
            var text = document.createElementNS("http://www.w3.org/2000/svg","text");
            
            var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

            // draggable group 
            g.setAttribute("class","draggable confine scaleable textbox");
            g.setAttribute("x",0);
            g.setAttribute("y",0);
            // text attributes start location
            text.setAttribute("x",0);
            text.setAttribute("y",15);
            // text offset location
            text.setAttribute("dx",0);
            text.setAttribute("dy",0);
            
            // default the letter spacing for all browsers
            text.setAttributeNS("http://www.w3.org/2000/svg","letter-spacing","0px");
            // font size
            text.setAttribute("class","user");
            // set draggable group defaults
            g.setAttribute("height",0);
            g.setAttribute("width",0);
            g.setAttribute("transform","translate(50, 50) rotate(0) scale("+ textSize + ")");

            // create rectangles on all corners for scaling the text
            var rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect.setAttribute("x",0);
            rect.setAttribute("y",13);
            rect.setAttribute("width", 5);
            rect.setAttribute("height", 5);
            rect.style.visibility = "hidden";
            rect.setAttribute("class","resize bottom-left");
            rect.setAttribute("fill","transparent");

            var rect2 = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect2.setAttribute("x",0);
            rect2.setAttribute("y",1);
            rect2.setAttribute("width", 5);
            rect2.setAttribute("height", 5);
            rect2.style.visibility = "hidden";
            rect2.setAttribute("class","resize top-left");
            rect2.setAttribute("fill","transparent");

            var rect3 = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect3.setAttribute("x",10);
            rect3.setAttribute("y",1);
            rect3.setAttribute("width", 5);
            rect3.setAttribute("height", 5);
            rect3.style.visibility = "hidden";
            rect3.setAttribute("class","resize top-right");
            rect3.setAttribute("fill","transparent");

            var rect4 = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect4.setAttribute("x",10);
            rect4.setAttribute("y",13);
            rect4.setAttribute("width", 5);
            rect4.setAttribute("height", 5);
            rect4.setAttribute("fill","transparent");
            rect4.style.visibility = "hidden";
            rect4.setAttribute("class","resize bottom-right");
            // default pointer events
            g.style.pointerEvents = "all"
            // set the innerHTML of the text element to user input
            text.innerHTML = textboxVal;

            // append the scaleing corners and text to the group in sopecific order
            g.appendChild(text);
            g.appendChild(rect);
            g.appendChild(rect2);
            g.appendChild(rect3);
            g.appendChild(rect4);

            // set the user text color
            if(userTextColor)
            {
                text.setAttribute("stroke",userTextColor);
                text.setAttribute("fill",userTextColor);
            }
            else{
                text.setAttribute("stroke","white");
                text.setAttribute("fill","white");
            }

            // set the stroke of the text and append the elements
            text.setAttribute("stroke-width","1");
            
            // append the finished group graphic to the svg
            svg.appendChild(g);
            g.setAttribute("id", "text"+objectIds++);
            updateLayers(g.cloneNode(true));

            // set the scaling boxes x value to the end of the bbox
            // this auto finds the relative length of the text element
            let bbox = g.getBBox();
            if(strlength > 1) {
                rect3.setAttribute("x",bbox.width - 2);
                rect4.setAttribute("x",bbox.width - 2);
            }
            // track the new text element
            textBoxArray.push(g);

        }
    });
      

    /**
     * @function  eyeFlag 'click' event handler
     * 
     * @description add or remove the eye icon from the svg element
     * 
    */
    $('#eyeFlag').click(function(){
        var eyeCheckbox = document.getElementById("eyeCheckbox"),
            eyeCheckboxLabel = document.getElementById("eyeCheckboxLabel"),
            eyeCheckboxSlider = document.getElementById("eyeCheckboxSlider"),
            eyeAnimation = document.getElementById("eyeAnimation");

        if(!document.getElementById("eyeFlag").classList.contains("disabled")){
            
            // clear all draw instance data if the flag is true
            if(drawFlag){
                resetDrawTool();
            }
            
            eyeFlag = !eyeFlag;

            if(eyeIconPlaced){
                eyeIconPlaced = !eyeIconPlaced;
                eyeImage.remove();
                eyeImage.style.visibility = 'hidden';
                eyeFlag = !eyeFlag;
                document.getElementById('eyeFlag').setAttribute('class',"btn btn-lg button");

                eyeCheckbox.style.transition = "0s";
                eyeCheckbox.style.webkitTransition = "0s";
                eyeCheckboxLabel.style.transition = "0s";
                eyeCheckboxLabel.style.webkitTransition = "0s";
                eyeCheckboxSlider.style.transition = "0s";
                eyeCheckboxSlider.style.webkitTransition = "0s";
                eyeAnimation.style.transition = "0s";
                eyeAnimation.style.webkitTransition = "0s";

                eyeCheckbox.style.visibility = "hidden";
                eyeCheckboxLabel.style.visibility = "hidden";
                removeLayers(this.cloneNode(true));
            }

            if(eyeFlag){
                
                outlineBox.remove();
                outlineBox.style.visibility = 'hidden';
                
                svg.appendChild(eyeImage);
                setIconAngle(eyeImage, observerDegree);
                eyeImage.style.visibility = 'visible'
                document.getElementById('eyeFlag').setAttribute('class',"btn btn-danger btn-lg button");

                document.getElementById("eyeCheckbox").style.visibility = "visible";
                document.getElementById("eyeCheckboxLabel").style.visibility = "visible";

                eyeCheckbox.style.transition = ".4s";
                eyeCheckbox.style.webkitTransition = ".4s";
                eyeCheckboxLabel.style.transition = ".4s";
                eyeCheckboxLabel.style.webkitTransition = ".4s";
                eyeCheckboxSlider.style.transition = ".4s";
                eyeCheckboxSlider.style.webkitTransition = ".4s";
                eyeAnimation.style.transition = ".4s";
                eyeAnimation.style.webkitTransition = ".4s";
                updateLayers(this.cloneNode(true));
                eyeFlag = false;
                eyeIconPlaced = true;
            }
        } 
    });
       

    /**
     * @function  sunIconFlag 'click' event handler
     * 
     * @description add or remove the sun icon from the svg element
     * 
    */
    $('#sunIconFlag').click(function(){
        var sunCheckbox = document.getElementById("sunCheckbox"),
            sunCheckboxLabel = document.getElementById("sunCheckboxLabel"),
            sunCheckboxSlider = document.getElementById("sunCheckboxSlider"),
            sunAnimation = document.getElementById("sunAnimation");

        if(!document.getElementById("sunIconFlag").classList.contains("disabled")){
            
            // clear all draw instance data if the flag is true
            if(drawFlag){
                resetDrawTool();
            }
                
            sunFlag = !sunFlag;

            if(sunIconPlaced){
                sunIconPlaced = !sunIconPlaced;
                sunImage.style.visibility = 'hidden';
                sunImage.remove();
                document.getElementById('sunIconFlag').setAttribute('class',"btn btn-lg button");
                sunFlag = false;

                sunCheckbox.style.transition = "0s";
                sunCheckbox.style.webkitTransition = "0s";
                sunCheckboxLabel.style.transition = "0s";
                sunCheckboxLabel.style.webkitTransition = "0s";
                sunCheckboxSlider.style.transition = "0s";
                sunCheckboxSlider.style.webkitTransition = "0s";
                sunAnimation.style.transition = "0s";
                sunAnimation.style.webkitTransition = "0s";

                sunCheckbox.style.visibility = "hidden";
                sunCheckboxLabel.style.visibility = "hidden";
                removeLayers(this.cloneNode(true));
            }
            
            if(sunFlag){
               
                outlineBox.style.visibility = 'hidden';
                sunImage.style.visibility = 'visible';
                svg.appendChild(sunImage);
                sunFlag = false;
                sunIconPlaced = true;
                document.getElementById('sunIconFlag').setAttribute('class',
                                                                        "btn btn-danger btn-lg button");
                sunCheckbox.style.visibility = "visible";
                sunCheckboxLabel.style.visibility = "visible";

                sunCheckbox.style.transition = ".4s";
                sunCheckbox.style.webkitTransition = ".4s";
                sunCheckboxLabel.style.transition = ".4s";
                sunCheckboxLabel.style.webkitTransition = ".4s";
                sunCheckboxSlider.style.transition = ".4s";
                sunCheckboxSlider.style.webkitTransition = ".4s";
                sunAnimation.style.transition = ".4s";
                sunAnimation.style.webkitTransition = ".4s";
                
                setIconAngle(sunImage, sunDegree);
                makeDraggable(svg); 
                updateLayers(this.cloneNode(true));
            }
            clickArray = [];
        }
        
    });


    /**
     * @function  northIconFlag 'mousedown' event handler
     * 
     * @description add or remove the north arrow from the svg element
     * 
    */
    $('#northIconFlag').on('mousedown',function(){
        var northLabel = document.getElementById("northCheckboxLabel"),
            northAnimation = document.getElementById("northAnimation"),
            northCheckboxSlider = document.getElementById("northCheckboxSlider"),
            northCheckbox = document.getElementById("northCheckbox");

        if(!document.getElementById("northIconFlag").classList.contains("disabled")){
            
            // clear all draw instance data if the flag is true
            if(drawFlag){
                resetDrawTool();
            }
                
            // change north flag
            northFlag = !northFlag;
            
            // if north flag is placed currently remove it
            if(northIconPlaced){
                northIconPlaced = !northIconPlaced;
                northImage.remove();
                northImage.style.visibility = 'hidden';
                document.getElementById('northIconFlag').setAttribute('class',"btn btn-lg button");
                northLabel.style.transition = "0s";
                northCheckbox.style.transition = "0s";
                northLabel.style.webkitTransition = "0s";
                northCheckbox.style.webkitTransition = "0s";
                northAnimation.style.webkitTransition = "0s";
                northAnimation.style.transition = "0s";
                northCheckboxSlider.style.webkitTransition = "0s";
                northCheckboxSlider.style.transition = "0s";
                northCheckbox.style.visibility = "hidden";
                northLabel.style.visibility = "hidden";
                removeLayers(this.cloneNode(true));
                northFlag = !northFlag;
            }
            
            // otherwise set the other flags to false and adjust their html
            if(northFlag){
                outlineBox.remove();
                outlineBox.style.visibility = 'hidden';

                svg.appendChild(northImage);
                northImage.style.visibility = 'visible';
                setIconAngle(northImage, northDegree);
                makeDraggable(svg);
                northIconPlaced = !northIconPlaced;
                northFlag = false;
                document.getElementById('northIconFlag').setAttribute('class',
                                                                        "btn btn-danger btn-lg button");                                 
                northLabel.style.transition = ".4s";
                northCheckbox.style.transition = ".4s";
                northLabel.style.webkitTransition = ".4s";
                northCheckbox.style.webkitTransition = ".4s";
                northAnimation.style.webkitTransition = ".4s";
                northAnimation.style.transition = ".4s";
                northCheckboxSlider.style.webkitTransition = ".4s";
                northCheckboxSlider.style.transition = ".4s";
                northCheckbox.style.visibility = "visible";
                northLabel.style.visibility = "visible";

                updateLayers(this.cloneNode(true));
            }
            clickArray = [];
        }   
    }); 


    /**
     * @function pencilIconFlag 'mousedown' event handler
     * 
     * @description start or stop the drawing event on the webpage
     * 
    */
   $("#pencilIconFlag").on('mousedown',function(){
        // clear all draw instance data if the flag is true
        if(drawFlag){
            resetDrawTool();
        }
        else{
            // start drawing
            bg.className.baseVal = "draw";
            drawFlag = true;
            document.getElementById("pencilIconFlag").className = "btn btn-light btn-lg button";

            // loop through all children and children of the children and set the pointer 
            // events to none so the draw function does not get interfiered with
            setSvgClickDetection(svg, "none");
        }
    });


    /**
     * @function outlineBtn "mousedown" event handler
     * 
     * @description when the outline box btn is clicked draws a box on the svg 
    */
    $("#outlineBtn").on("mousedown",function(){                    
            
        // clear all draw instance data if the flag is true
        if(drawFlag){
            resetDrawTool();
        }

        // generate the new scalable draggables group dynamically 
        var g = document.createElementNS("http://www.w3.org/2000/svg","g");
        g.innerHTML = attensionBoxObjectString;

        g.setAttribute("class","draggable confine scaleable outline");
        g.setAttribute("transform-origin","50%; 50%;");
        g.setAttribute("transform","translate(0, 0) rotate(0) scale(.5)");
        g.setAttribute("stroke-width","20");
        g.style.border = 0;
        g.style.padding = 0;
        g.style.pointerEvents = "visible";
        g.style.fill = "none";
        
        userBoxColor = $("#colorPickerBox").val();
        // set the color if needed
        if(userBoxColor){
            g.style.stroke = userBoxColor;
        }
        else{
            g.style.stroke = "white";
        }
        // append the group and reset the draggable functions
        svg.appendChild(g);
        // push the object into the array for undoing
        g.setAttribute("id", "outline"+objectIds++);   
        highlightBoxArray.push(g);
        makeDraggable(svg);

        // update the layer browser
        updateLayers(g.cloneNode(true));
    });


    /**
     * @function bottomPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */
    $("#bottomPaddingBtn").on('click',function( event ){
        if( !isNaN(parseInt(paddingBoxInput.value)) && !bottomBtn.classList.contains("btn-danger") ){
            setImagePadding(parseInt(paddingBoxInput.value),'bottom');
            padBottom = true;

            bottomBtn.className = 'btn btn-danger button btn-sm paddingBtn';
        }
        else if(paddingBoxInput.value!== "" && bottomBtn.classList.contains("btn-danger")){
            setImagePadding(-1 * parseInt(paddingBoxInput.value),"bottom");
            bottomBtn.className = 'btn button btn-sm paddingBtn';
        
            padBottom = false;  
        }
    });


    /**
     * @function topPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */
    $("#topPaddingBtn").on('click',function(event){
        if(!isNaN(parseInt(paddingBoxInput.value)) && !topBtn.classList.contains("btn-danger")){
            setImagePadding(parseInt(paddingBoxInput.value),'top');
            padTop = true;
            
            topBtn.className = 'btn btn-danger button btn-sm paddingBtn';
        }
        else if(paddingBoxInput.value && !isNaN(parseInt(paddingBoxInput.value))){
            setImagePadding(-1 * parseInt(paddingBoxInput.value),"top"); 
            topBtn.className = 'btn button btn-sm paddingBtn';
            
            padTop = false;
        }
    });


    /**
     * @function rightPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */
    $("#rightPaddingBtn").on('click',function(event){
        
        if(!isNaN(parseInt(paddingBoxInput.value)) && !rightBtn.classList.contains("btn-danger")){
            setImagePadding(parseInt(paddingBoxInput.value),'right');
            padRight = true;

            rightBtn.className = 'btn btn-danger button btn-sm paddingBtn';
        }
        else if(paddingBoxInput.value && !isNaN(parseInt(paddingBoxInput.value))){
            setImagePadding(-1 * parseInt(paddingBoxInput.value),"right"); 
            rightBtn.className = 'btn button btn-sm paddingBtn'; 
            
            padRight = false; 
        } 
    });


    /**
     * @function leftPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */  
    $("#leftPaddingBtn").on('click',function(event){
        
        if(!isNaN(parseInt(paddingBoxInput.value)) && !leftBtn.classList.contains("btn-danger")){
            setImagePadding(parseInt(paddingBoxInput.value),'left');
            padLeft = true;
            
            leftBtn.className = 'btn btn-danger button btn-sm paddingBtn';   
        }
        else if(paddingBoxInput.value && !isNaN(parseInt(paddingBoxInput.value))){
            setImagePadding(-1 * parseInt(paddingBoxInput.value),"left"); 
            leftBtn.className = 'btn button btn-sm paddingBtn'; 

            padLeft = false; 
        } 
    });


    /**
     * @function resetPaddingBtn 'click' event handler
     * 
     * @description on click resets UI and padding to 0
    */
    $("#resetPaddingBtn").on('click',function(event){
        setImagePadding(parseInt(0),"none"); 
        paddingBoxInput.value = "";  
        
        padBottom = false, padLeft = false, padRight = false, padTop = false;
        
        bottomBtn.className = 'btn button btn-sm paddingBtn';
        leftBtn.className = 'btn button btn-sm paddingBtn';
        rightBtn.className = 'btn button btn-sm paddingBtn';
        topBtn.className = 'btn button btn-sm paddingBtn'; 
    });


    $(document).mousedown(function(event){
        // unfocus the layer browser
        if(event.target.classList 
            && ( event.target.classList.contains("unfocus"))
            ){
                if(activeLayer) {
                    setSvgClickDetection(document.getElementById("svgWrapper"),"all");
                    activeLayer.style.border = "none";
                    activeLayer = null;
                    
                    userBoxColor = "#ffffff";
                    userLineColor = "#ffffff";
                    userTextColor = "#ffffff";

                    setDetectionForLayer(activeLayer,"all");
                }

        }
    });

    /**
     * @function document.keydown
     * 
     * @param {event} event the key press event
     * 
     * @description  Hotkey Handler
    */
    $(document).keydown(function(event){
        if(!keys.includes(event.keyCode)){
            keys.push(event.keyCode);
        }

        if(keys[0] === 18 && keys.length === 2){
            event.preventDefault();
            if(keys[1] === 76){
                $("#pencilIconFlag").mousedown(); 
            }
            else if(keys[1] === 79){
                $("#eyeFlag").click(); 
            }
            else if(keys[1] === 66){
                $("#outlineBtn").mousedown(); 
            }
            else if(keys[1] === 78){
                $("#northIconFlag").mousedown(); 
            }
            else if(keys[1] === 83){
                $("#sunIconFlag").click(); 
            }
            else if(keys[1] === 84){
                $("#textBtn").mousedown();
                keys = [];
            }
            else if(keys[1] === 82){
                $("#scaleBarButton").mousedown();
            }
        }
        else if(((keys[0] === 16 && keys[1] === 18) 
                || (keys[1] === 16 && keys[0] === 18)) && keys.length === 3){
            event.preventDefault();
            if(keys[2] === 76){
                if(lineArr.length > 0){
                    $("#undoLine").mousedown(); 
                }
            }
            else if(keys[2] === 79){
                $("#eyeCheckbox").click();
            }
            else if(keys[2] === 66){
                if(highlightBoxArray.length !== 0){
                    $("#undoBox").mousedown(); 
                }
            }
            else if(keys[2] === 78){
                $("#northCheckbox").click();
            }
            else if(keys[2] === 83){
                $("#sunCheckbox").click();
            }
            else if(keys[2] === 84){
                if(textBoxArray.length > 0){
                    $("#undoText").mousedown();
                }
            }
            else if(keys[2] === 82){
                $("#scaleCheckbox").click();   
            }
        }
    });


    /** 
     * @function document 'keyup' listener
     * 
     * @param {event} event key event
     * 
     * @description helps track keys being held
     */
    $(document).keyup(function(event){

        if(keys.length > 0){
            keys = removeKey(keys, event.keyCode);
        }

        if(event.keyCode === 46){
            if(activeLayer){
                event.preventDefault();
                var svgID = activeLayer.getAttribute("id").split("layer")[1];

                var icon = document.getElementById(svgID);

                if(icon.nodeName === "g" || icon.nodeName === "line"){
                    icon.remove();
                }
                else if(icon.nodeName === "svg"){
                    if(svgID.indexOf("north") > -1){
                        $("#northIconFlag").mousedown();
                    }
                    else if(svgID.indexOf("sun") > -1){
                        $("#sunIconFlag").click();
                    }
                    else if(svgID.indexOf("eye") > -1){
                        $("#eyeFlag").click();
                    }
                    else if(svgID.indexOf("scale") > -1){
                        $("#scaleBarButton").mousedown();
                    }
                }
                activeLayer.remove();
                activeLayer = (document.getElementById("layerBrowser").children[0] === null)
                                ? undefined : document.getElementById("layerBrowser").children[0];
                if(activeLayer){
                    activeLayer.style.border = "5px solid red";
                    setSvgClickDetection(svg, "none");
                    setDetectionForLayer(activeLayer, "all");
                }
            }
        }
    });
    
    // ---------------------------------- End Button Handlers -----------------------------------------------
        
    // ---------------------------------- Click & Text Input Handlers ---------------------------------------
    /**
     * @function svgWrapper 'mouseover' event handler
     * 
     * @description when the mouse is hovering over the svg element
     *      Helps update the UI when drawing or cropping action is taking place
    */
    $('#svgWrapper').mousemove(function(event){
                
        // set event variables
        var t = event.target;
        var x = event.clientX;
        var y = event.clientY;
        
        // get proper svg as target
        var target = (t == svg ? svg : t.parentNode);
        
        // get new svg relative point
        var svgP = svgPoint(target, x, y);
        // convert to int
        mouseX = parseInt(svgP.x),
        mouseY = parseInt(svgP.y);

        if( drawFlag && clickArray.length >1  
            && document.elementFromPoint(event.clientX, event.clientY) !== svg){
            drawLine(line, mouseX, mouseY);
        }
    });


    /**
     * @function svgWrapper 'click' event handler
     * 
     * @description when the svg element is clicked on
     *      Checks for active flags and then performs actions to help edit image
    */
    $('#svgWrapper').on("click", function(event){
        
        // set event variables
        var t = event.target,
            x = event.clientX,
            y = event.clientY,
            markerId;
        
        // get proper svg as target
        var target = (t == svg ? svg : t.parentNode);
        
        // get new svg relative point
        var svgP = svgPoint(target, x, y);
        // convert to int
        mouseX = parseInt(svgP.x),
        mouseY = parseInt(svgP.y);
        
        userLineColor = document.getElementById("colorPickerLine").value;

        // if the draw flag is true and length of clicks is 0
        if(drawFlag && clickArray.length === 0 
            && document.elementFromPoint(event.clientX, event.clientY) !== svg){
            
            let isArrowHead = document.getElementById("arrowCheckboxSlider").checked,
                NS = "http://www.w3.org/2000/svg";

            
            // create the new  line dynamically and add it to the array so we can remove it later if needed
            line = document.createElementNS(NS,"line");
            line.setAttribute("id","line" + lineArr.length);
            line.setAttribute("class","draggable confine");
            line.setAttribute("transform","translate(" + mouseX + ", " + mouseY + ") rotate(0)" );
            line.setAttribute("x1",0);
            line.setAttribute("y1",0);
            line.setAttribute("x2",0);
            line.setAttribute("y2",0);
            line.style.visibility = "visible";

            if(isArrowHead){
                // if arrow with default color 
                if(!userLineColor || userLineColor === "#ffffff"){
                     line.setAttribute("marker-start","url(#arrow)");
                }
                // if the array is linger than 1 and the color is not default
                else if(lineArr.length > 0 || userLineColor){
                    var markerId = "arrow" + lineArr.length,
                    pathId = "arrowPath" + lineArr.length,
                    newDef = document.getElementById("arrowDef").cloneNode();

                    newDef.setAttribute("id", "arrowDef" + lineArr.length);
                    newDef.innerHTML = document.getElementById("arrowDef").innerHTML;
                    line.setAttribute("marker-start", String("url(#" + markerId + ")"));
                    (newDef.childNodes).forEach(childElem => {
                        // if the childElement has a child
                        if(childElem.childElementCount > 0){
                            childElem.setAttribute("id", markerId);
                            childElem.childNodes[1].setAttribute("fill", userLineColor);
                            childElem.childNodes[1].setAttribute("id", pathId);
                        }
                    });
                    svg.prepend(newDef);
                }
            }

            // check to see if it is a custom color
            if(userLineColor){
                line.style.stroke = userLineColor;
                if(pathId){
                    document.getElementById(pathId).style.fill = userLineColor;
                    document.getElementById(pathId).style.stroke = userLineColor;
                }
            }
            else{
                line.style.stroke = "white";
            }
            
            line.style.strokeWidth = 10;
     
            svg.appendChild(line);

            lineArr.push(line);
            captureClick(mouseX, mouseY);
        }
        else if(drawFlag && clickArray.length > 1  
            && document.elementFromPoint(event.clientX, event.clientY) !== svg){

            var transform = line.getAttribute("transform");
            // if the line is being drawn and the seconf click happens set the final location
            var transX = parseInt(transform.split(") ")[0].split(",")[0].replace("translate(","")),
                transY = parseInt(transform.split(") ")[0].split(",")[1]);

            line.setAttribute("x2", mouseX - transX);
            line.setAttribute("y2", mouseY - transY);
            clickArray = [];
            drawFlag = false;
            // reset the button color and allow for click detection again
            document.getElementById("pencilIconFlag").className = "btn btn-lg button";

            bg.className.baseVal = "";

            updateLayers(line.cloneNode(true));
            // parse the whole svg and set the pointerevents to accept clicks again
            
            setDetectionForLayer(activeLayer,"all");
        }
    });

    let warned = false;

    /**
     * @function paddingInput 'keyup' event handler
     * 
     * @description when user clicks a key in the box check if the value in the box can be used an an int
     *      set the padding depending on the current flag otherwise reset the value
    */
    $("#paddingInput").keyup(function(){
        if(!isNaN(parseInt(this.value))){
            if(padBottom){
                setImagePadding(parseInt(this.value),'bottom');
            }
            if(padRight){
                setImagePadding(parseInt(this.value),'right');
            }
            if(padLeft){
                setImagePadding(parseInt(this.value),'left');
            }
            if(padTop){
                setImagePadding(parseInt(this.value),'top');
            }
        }
        else{
            // if the value is not a number, warn the user that only numbers can render
            //  warned flag is to onl warn each user 1 time
            if(this.value !== "" && !warned){
                alert("Only Accepts Positive Whole Numbers");
                warned = true;
            }
        }
    });
});


/**
 * @function window 'pageshow' event handler
 * 
 * @description run the logic to start the page
*/
$(window).bind('pageshow', function(event){

    // call to fetch the data from the server
    fetch("/getData",
    {
        method: "GET"
    }).then( response => {
        // convert to blob
        response.blob()
        .then( (data) => {
            // read blob as text
            var reader = new FileReader();
            reader.readAsText(data);
            reader.onloadend = () => {
                let currentData = document.getElementById("metadata-text").innerHTML
                    .replaceAll("&lt;", "<")
                    .replaceAll("&gt;", ">"),

                    keyArr = [];

                // test the rotation values
                if(currentData !== reader.result) {
                    var object = JSON.parse(reader.result),
                        object2 = JSON.parse(currentData);

                    // find each value that changed
                    for (const key in object) {
                        if (object[key] !== object2[key]) {
                            // find the keys that where changed
                            keyArr.push(key);
                        }
                    }

                    // adjust the icons that need to be ajusted
                    keyArr.forEach(key => {
                        switch( key ) {
                            case "NorthAzimuth":    
                                northDegree = (isNaN(parseFloat(object[key]) + 90))
                                            ? object[key] : parseFloat(object[key]) + 90;
                
                                if(isNaN(northDegree)){
                                    // check if it is map projected, if yes set north to 0 else
                                    if(isMapProjected === 'true'){
                                        let rotateOffset = parseFloat("<%=rotationOffset %>");            
                                        northDegree = (!isNaN(0 + rotateOffset) ? 0 + rotateOffset : 0 );
                                        setIconAngle(northImage ,northDegree);
                                        adjustIconAngle(northImage, northDegree, parseFloat(object2[key]) + 90);
                                    }
                                    else{
                                        // disable the button if the degree was not found
                                        iconPlaced(northImage);
                                        setIconAngle(northImage , 0);
                                        adjustIconAngle(northImage, northDegree, parseFloat(object2[key]) + 90);
                                        document.getElementById('northIconFlag').setAttribute('class',
                                                                            "btn btn-secondary btn-lg button disabled");
                                    }
                                }
                                else{
                                    // disable the button if the degree was not found
                                    document.getElementById('northIconFlag').setAttribute('class',
                                                                                        "btn btn-lg button");
                                    setIconAngle(northImage ,northDegree);
                                    adjustIconAngle(northImage, northDegree, parseFloat(object2[key]) + 90);
                                    
                                    $("#northIconFlag").mousedown();
                                    $("#northIconFlag").mousedown();
                                }
                                break;

                            case "SubSolarAzimuth":
                                
                                sunDegree = parseFloat(object[key]) + 90;

                                if(isNaN(sunDegree)){
                                    // disable the button if the degree was not found
                                    iconPlaced(sunImage);
                                    setIconAngle( sunImage, 0 );
                                    adjustIconAngle(sunImage, sunDegree, parseFloat(object2[key]) + 90);

                                    document.getElementById('sunIconFlag').setAttribute('class',
                                                                            "btn btn-secondary btn-lg button disabled");
                                }
                                else{
                                    document.getElementById('sunIconFlag').setAttribute('class',
                                                                                        "btn btn-lg button");
                                    setIconAngle( sunImage, sunDegree );
                                    adjustIconAngle(sunImage, sunDegree, parseFloat(object2[key]) + 90);

                                    $("#sunIconFlag").click();
                                    $("#sunIconFlag").click();
                                }
                                
                                break;

                            case "SubSpacecraftGroundAzimuth":
                            
                                observerDegree = parseFloat(object[key]) + 90;

                                if(isNaN(observerDegree)){
                                    // disable the button if the degree was not found
                                    iconPlaced(eyeImage);
                                    document.getElementById('eyeFlag').setAttribute('class',
                                                                    "btn btn-secondary btn-lg button disabled");
                                    setIconAngle( eyeImage, 0 );
                                    adjustIconAngle(eyeImage, observerDegree, parseFloat(object2[key]) + 90);
                                }
                                else{
                                    document.getElementById('eyeFlag').setAttribute('class',
                                                                                        "btn btn-lg button");
                                    setIconAngle( eyeImage, observerDegree );
                                    adjustIconAngle(eyeImage, observerDegree, parseFloat(object2[key]) + 90);
                                    
                                    $("#eyeFlag").click();
                                    $("#eyeFlag").click();
                                }
                                break;
                        }
                    });
                    // set the new data to the area where the data is being held on the client
                    document.getElementById("metadata-text").innerHTML = reader.result;
                } 
            }
            // defult color pickers
            $("#colorPickerLine").val("#ffffff");
            $("#textColorPicker").val("#ffffff");
            $("#colorPickerBox").val("#ffffff");
        });
    });
});/** ------------------------------------ End Jquery Handlers ------------------------------------------ */