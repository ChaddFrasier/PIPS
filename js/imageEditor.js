/**
 * @file imageEditor.js
 * 
 * @author Chadd Frasier
 * @version 2.0
 * 
 * @since 09/20/2019
 * @updated 10/14/2019
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
    bg;

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
        "top-left":1,
        "top-right":2,
        "bottom-right":3,
        "bottom-left":4
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
     *      
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
            transform.setTranslate(dx, dy);
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
                    return 2;
                }
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
    lineElement.setAttribute("x2", x2);
    lineElement.setAttribute("y2",y2);
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
        if(isMapProjected){
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

    if(isNaN(sunDegree)){
        // disable the button if the degree was not found
        document.getElementById('sunIconFlag').setAttribute('class',
                                                            "btn btn-secondary btn-lg button disabled");
    }

    if(isNaN(observerDegree)){
        // disable the button if the degree was not found
        document.getElementById('eyeFlag').setAttribute('class',
                                                            "btn btn-secondary btn-lg button disabled");
    }

    // if the degree value is over 360 just subtract 360 because the math is easier
    if(northDegree>360){ northDegree-=360; }
    if(sunDegree>360){ sunDegree-=360; }
    if(observerDegree>360){ observerDegree-=360; }

    // set the scale bar corners to the correct orientation
    setScaleboxCorners(northDegree, sunDegree);
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
 * @function setImagePadding
 * 
 * @param {number} val the number of pixels to add
 * @param {string} location the side of the svg to add the pixels (left|right|top|bottom)
 * 
 * @description adjust the svg size and viewBox as needed to add extra black pixels to one side
 * 
*/
function setImagePadding(val,location){
    // image w and h vars
    let imageW,
        imageH;

    // switch on the location of the padding
    switch(location){
        case 'bottom':
            // get the new image height for the box and background
            imageH = h + val; 
            // set the viewbox values to how on the bottom of the image
            svg.setAttribute("viewBox", "0 0 " + w + " " + imageH);

            // set background x,y to 0 to show at the bottom of the image
            bg.setAttribute("x",0);
            bg.setAttribute("y",0);

            // adjust the height and set the width to what it should be
            bg.setAttribute("height", imageH);
            bg.setAttribute("width",w);
    
    
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        case "top":
            // get the new image height for the box and background
            imageH = h + val;
            // set background x,y to show padding at the right spot
            bg.setAttribute("y",val*-1);
            bg.setAttribute("x",0);
            // adjust the height and set the width to what it should be
            bg.setAttribute("height",imageH);
            bg.setAttribute("width",w);
            
            // set the viewbox values 
            svg.setAttribute("viewBox", "0 " + String(val*-1) + " " + w + " " + imageH);
            
            
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        case "right":
            // get the new image width for the box and background
            imageW = w + val;
            // set background x,y to padding at the right spot
            bg.setAttribute("y",0);
            bg.setAttribute("x",0);
            // adjust the height and set the width to what it should be
            bg.setAttribute("width",imageW);
            bg.setAttribute("height",h);
            
            // set the viewbox values
            svg.setAttribute("viewBox", "0 0 "  + imageW + " " + h);
            
            
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        case "left":
            // get the new image width for the box and background
            imageW = w + val;
            // set background x,y to padding at the right spot
            bg.setAttribute("y",0);
            bg.setAttribute("x",val*-1);
            // adjust the height and set the width to what it should be
            bg.setAttribute("width",imageW);
            bg.setAttribute("height",h);
            
            // set the viewbox values 
            svg.setAttribute("viewBox",  String(val*-1)+ " 0 "  + imageW + " " + h);
           
            // call makeDraggable again to reset the boundaries of the draggable elements
            makeDraggable(svg);
            break;

        default:
            // set background x,y to padding at the right spot                            
            bg.setAttribute("x",0);
            bg.setAttribute("y",0);
            // adjust the height and set the width to what it should be
            bg.setAttribute("width",w);
            bg.setAttribute("height",h);

            // set the viewbox values
            svg.setAttribute("viewBox", "0 0 " + w + " " + h);
            
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
function setScaleboxCorners(northDegree, sunDegree){
    // as long as northDegree is not NaN and not 0 we will need to adjust the boxes
    if(!isNaN(northDegree) &&  northDegree!== 0){
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
        for(index in transformArray){
            
            if(transformArray[index].indexOf("rotate") > -1){
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
    return [startTime.getHours(),startTime.getMinutes(),startTime.getSeconds()];
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
    }
  
    // Show the current tab, and add an "active" class to the link that opened the tab
    document.getElementById(id).style.display = "block";
    event.currentTarget.className += " active";
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
function triggerDownload(imgURI,filename){
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
    if(lineArr.length > 0 && clickArray.length > 1){
        lineArr.pop().remove();
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
        doneResizing = false,
        northFlag = false,
        cropFlag = false, 
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
    var sunObjectString = '<g id="sunPosition" class="draggable confine" transform-origin="50%; 50%;"'
    + 'transform="translate(100,150) rotate(0) scale(.3125)"  stroke-width="7" style="border:0;'
    + 'padding:0; pointer-events:visible;"> '
    + '<circle id= "sunIconOuter"  r="125" cy="175" cx="150" stroke-width="15" stroke="white" fill="black"'
    + 'style="border:0;"></circle>'
    + '<circle id= "sunIcon"  r="25" cy="175" cx="150" fill="white" stroke="black" style="border:0;"/>'
    + '<path d="M 150 0 L 250 50 L 150 0 L 50 50 L 150 25 L 250 50" stroke="white"'
    + 'fill="black" stroke-width="10"/>'
    + '<rect class="resize top-left"x="0" y="0" width="100" height="100"'
    + 'style="visibility: hidden;"fill="red"/>'
    + '<rect class="resize top-right"x="220" y="0" width="100" height="100"'
    + 'style="visibility: hidden;"fill="blue"/>'
    + '<rect class="resize bottom-right"x="220" y="220" width="100"height="100" style="visibility: hidden;'
    + '"fill="green"/>'
    + '<rect class="resize bottom-left"x="0" y="220" width="100" height="100"'
    + 'style="visibility: hidden;"fill="yellow"/></g>';

    var northObjectString = '<g id="northPosition" class="draggable confine" transform-origin="50%; 50%;"'
    + 'transform="translate(100,100) rotate(0) scale(.2439026)" stroke-width="7"'
    + 'style="border:0; padding:0; pointer-events:all;">'
    + '<rect x="0" y="0" id="northBG"style="visibility: visible;"width="200" height="400" fill="black"/>'
    + '<rect x="0" y="0" class="resize top-left" style="visibility: hidden;"'
    + 'width="100" height="100" fill="red"/>'
    + '<rect x="100" y="0" class="resize top-right" style="visibility: hidden;"width="100" height="100"'
    + 'fill="yellow"/>'
    + '<path id= "northIcon"  d="M 100 0 L 200 200 L 100 150 L 0 200 Z" fill="white"  stroke="black"' 
    + 'stroke-width="4" style="border:0;"></path>'
    + '<path id="nLetter" d="M 50 200 L 50 0 L 150 200 L 150 0"stroke="white" stroke-width="10"'
    + 'transform="translate(0,200)"fill="black" style="border:0;"></path>'
    + '<rect class= "resize bottom-right"x="125" y="300" width="75" height="100"'
    + 'style="visibility: hidden;"fill="green"/>'
    + '<rect class= "resize bottom-left"x="0" y="300" width="75" height="100" style="visibility: hidden;"'
    + 'fill="blue"/></g>'

    var outlineObjectString = '<rect id="cropOutline" x="0" y="0" width="5" height="5"'
    + 'style="fill:rgba(245, 13, 13, 0.15);pointer-events:none; stroke-width:2;stroke:rgb(255,0,0);" />';

    var attensionBoxObjectString ='<rect id="attensionBox" x="0" y="0" width="400" height="400"/>'
    + '<rect class=" resize top-left" x="0" y="0" width="50" height="50"'
    + 'style="visibility: hidden;fill:rgba(245, 13, 13, 0.15); stroke:blue" />'
    + '<rect class=" resize top-right" x="350" y="0" width="50" height="50"'
    + 'style="visibility: hidden;fill:rgba(245, 13, 13, 0.15); stroke:blue" />'
    + '<rect class=" resize bottom-right" x="350" y="350" width="50" height="50"'
    + 'style="visibility: hidden;fill:rgba(245, 13, 13, 0.15); stroke:blue" />'
    + '<rect class=" resize bottom-left" x="0" y="350" width="50" height="50"'
    + 'style="visibility: hidden;fill:rgba(245, 13, 13, 0.15);stroke:blue" />';

    var eyeObjectString = '<g id="eyePosition" class="draggable confine" transform-origin="50%; 50%;"'
    + 'transform="translate(150,100) rotate(0) scale(1.18)" stroke-width="3" style="border:0; padding:0;'
    + 'pointer-events:visible;">'
    + '<path id="eyeArrow" x="0" y="0" stroke-width="2"'
    + 'd="M 25 15 L 50 0 L 75 15 L 25 15" stroke="white" fill="black"/>'
    + '<path id= "eyeIconOuter" d="M 14 30 C 14 30 50 -10 85 30 C 85 30 50 75 14 29" fill="black"'
    + 'stroke="white" style="border:0;"></path>'
    + '<ellipse id="eyeIconEllipse" cx="50" cy="31" rx="13" ry="15" stroke-width="2" fill="white" stroke="black"></ellipse>'
    + '<circle id= "eyeIconPupel" r="6" cy="31" cx="50" stroke-width="2" stroke="white" fill="black"' 
    + 'style="border:0;"></circle>'
    + '<rect x="0" y="0" class="resize top-left" style="visibility: hidden;"width="30" height="20" fill="red"/>'
    + '<rect x="70" y="0" class="resize top-right" style="visibility: hidden;"width="20" height="20" fill="blue"/>'
    + '<rect x="70" y="35" class="resize bottom-right" style="visibility:hidden;"width="20"height="20" fill="green"/>' 
    + '<rect x="0" y="35" class="resize bottom-left" style="visibility: hidden;"width="30" height="20" '
    + 'fill="yellow"/></g>';

    var scaleBarObject = '<g id="scalebarPosition"class="draggable confine scalebar"'
    + 'transform="translate(0,175) scale(.1)" stroke-width="10"'
    + 'style="border:0; padding:0; pointer-events:all;">'
    + '<rect x="0" y="0" id="scalebarBG" width="4325" height="500" style="visibility:hidden;"></rect>'
    + '<rect x="150" y="200" id="scalebarOuter" width="4000" height="300"stroke-width="20" stroke="white"'
    + 'fill="black" ></rect>'
    + '<path id="scalebarLine" d="M 2150 350 L 4150 350"  stroke="white" stroke-width="50"/>'
    + '<path id="scalebarVert" d="M 2150 200 L 2150 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarVert10th" d="M 350 200 L 350 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarLine10th" d="M 150 350 L 350 350"  stroke="white" stroke-width="50"/>'
    + '<path id="scalebarVert20th" d="M 550 200 L 550 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarVert30th" d="M 750 200 L 750 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarLine30th" d="M 550 350 L 750 350"  stroke="white" stroke-width="50"/>'
    + '<path id="scalebarVert40th" d="M 950 200 L 950 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarVert50th" d="M 1150 200 L 1150 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarLine50th" d="M 950 350 L 1150 350"  stroke="white" stroke-width="50"/>'
    + '<path id="scalebarVert60th" d="M 1350 200 L 1350 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarVert70th" d="M 1550 200 L 1550 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarLine70th" d="M 1350 350 L 1550 350"  stroke="white" stroke-width="50"/>'
    + '<path id="scalebarVert80th" d="M 1750 200 L 1750 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarVert90th" d="M 1950 200 L 1950 500"  stroke="white" stroke-width="20"/>'
    + '<path id="scalebarLine90th" d="M 1750 350 L 1950 350"  stroke="white" stroke-width="50"/>'
    + '<text id="scalebarText" x="3975" y="150" font-family="sans-serif"'
    + 'font-size="125" stroke="white"fill="white"><%=scalebarLength%><%=scalebarUnits%></text>'
    + '<text id="scalebar1" x="100" y="150" font-family="sans-serif"'
    + 'font-size="125" stroke="white"fill="white"> <%=scalebarLength%></text>'
    + '<text id="scalebarHalf" x="1075" y="150" font-family="sans-serif" font-size="125"'
    + 'stroke="white"fill="white"></text>'
    + '<text id="scalebar0" x="2125" y="150" font-family="sans-serif" font-size="125"'
    + 'stroke="white"fill="white">0</text></g>';

    // grab DOM elements that are needed
    var exportBtn =  document.getElementById('exportBtn'),
        myImage = document.getElementById('crop'),
        line,
        userLineColor;

    svg = document.getElementById('svgWrapper');
    loader = document.getElementById('loading');

    // center the loading gif
    myImage.setAttribute("x",parseInt(w)*1.5 + "px");
    myImage.setAttribute("y",parseInt(h)*1.25 + "px");

    // dynamically add the elements to export better 
    svg.insertAdjacentHTML("beforeend",sunObjectString);
    svg.insertAdjacentHTML("beforeend",northObjectString);
    svg.insertAdjacentHTML('beforeend',outlineObjectString);
    svg.insertAdjacentHTML("beforeend",eyeObjectString);
    svg.insertAdjacentHTML("beforeend",scaleBarObject);

    // save the elements to dynamically add and remove them with a single line of code
    sunImage = document.getElementById("sunPosition"),
    northImage = document.getElementById("northPosition"),
    outlineBox = document.getElementById('cropOutline'),
    eyeImage = document.getElementById('eyePosition'),
    eyeArrow = document.getElementById("eyeArrow"),
    scaleBarIcon = document.getElementById('scalebarPosition'),
    bg = document.getElementById("svgBackground");

    // get half the scalebar length for drawing
    let half = parseFloat(scalebarLength)/2;

    // start the draggable svg element
    makeDraggable(svg);

    // load the users base image as base64 to embed in the svg element
    loadImageAsURL(imageSrc, function(data){
        // remove the loading gif and add the new dataURL
        myImage.setAttributeNS("http://www.w3.org/1999/xlink",'xlink:href', "");
        myImage.setAttributeNS("http://www.w3.org/1999/xlink",'xlink:href', data);
        
        // default all transforms
        myImage.setAttribute("x","0");
        myImage.setAttribute("y","0");
        myImage.setAttribute("transform","scale(1)");
    });

/*  // This is how you can have a progress bar for the loading of an image onto the server
    var loadingImg = new Image();
    loadingImg.load(imageSrc); */

    // if the scale bar is not none
    if(scalePX !== 'none' && !isNaN(scalePX)){
        // set the size based on how the image is drawn
        if((w/origW) < (h/origH)){
            scaleBarIcon.setAttribute("transform",
                                            "translate(0,175) scale(" + (scalePX/4000)* 2 * (w/origW) + ')');
            // set text box font to 11X the scale of the scale bar to account for the change in pixel sizes 
            textSize = (scalePX/4000)* 21 * (w/origW);
        }
        else{
            scaleBarIcon.setAttribute("transform",
                                            "translate(0,175) scale(" + (scalePX/4000)* 2 * (h/origH) + ')');
            // set text box font to 11X the scale of the scale bar to account for the change in pixel sizes
            textSize = (scalePX/4000)* 21 * (h/origH);
        }
        // if half the bar is less than 1 km then give it the decimal
        if(half < 1){
            document.getElementById("scalebarHalf").innerHTML = half;
        }
        // otherwise parse it to the closest int
        else{
            document.getElementById("scalebarHalf").innerHTML = parseInt(half);
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

    // remove the objects because they are not needed yet
    northImage.remove();
    sunImage.remove();
    outlineBox.remove();
    eyeImage.remove();
    scaleBarIcon.remove();

    // set defaults
    outlineBox.style.visibility = 'hidden';

    console.log(" Image Dimensions are => " + w + " : " + h);
    // set loader to invisible
    loadInvisible();

    // sets the display name
    document.getElementById("imageName").innerHTML = displayCube;

    // set the arrow directions and recieve the data
    getMetadata();

    /** ------------------------------- Export Functions ------------------------------------------------- */
    /**
     * @function exportBtn 'click' event handler
     * 
     * @description gets a filename for the download and sends a 
     *              request to the server to download the figure image
    */
    exportBtn.addEventListener('click', function (event) {
        // prevent event defaults
        event.preventDefault();
        
        // read in a filename while the filename is not empty 
        // and it passes the file extension check
        do{
            // read in a filename with prompt
            var filename = prompt("Save File as png, svg, tiff, or jpeg","");
        }while(filename !== "" && filename !== null && !/^.*\.(png|PNG|JPEG|jpeg|JPG|jpg|SVG|svg|tif|tiff|TIF|TIFF)$/gm
                                                                                        .test(filename));
        // if the file is not null
        if(filename !== null){
            // read the file extenson
            var fileExt = filename.split(".")[filename.split(".").length - 1];

            // get lowercase file extension
            filename = filename.replace("." + fileExt, "." + fileExt.toLowerCase());

            // encode the svg to a string
            var data = 
                '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
                + (new XMLSerializer()).serializeToString(svg);
            
            // creates a blob from the encoded svg and sets the type of the blob to and image svg
            var svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
            
            // create the progress bar
            var progressBar = showProgress();

            if(fileExt.toLowerCase() === "svg"){
                growProgress(progressBar);
                // creates an object url for the download
                var url = DOMURL.createObjectURL(svgBlob);
                triggerDownload(url,filename);
                loader.style.visibility = "hidden";
                document.getElementById("loadingText").innerHTML = "Loading";
                setTimeout(hideProgress, 500, progressBar);
                DOMURL.revokeObjectURL(url);
                return;
            }
            else{
                // create a new Form data object
                let fd = new FormData();
                // append a new file to the form. 
                // upl = name of the file upload
                // svgBlob is the raw blob image
                // and the name of the svg file will be the user's unique id
                fd.append("upl", svgBlob, getCookie("userId") + ".svg");
                // append download and canvas data to the form
                fd.append("w",w);
                fd.append("h",h);
                fd.append("downloadName",filename);
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
                            });
                        }
                        else{
                            // server sent back a 200
                            response.blob().then((blob)=>{
                                var url = DOMURL.createObjectURL(blob);

                                triggerDownload(url,filename);
                                setInterval(hideProgress, 1000, progressBar);
                                loader.style.visibility = "hidden";
                                document.getElementById("loadingText").innerHTML = "Loading";
                                DOMURL.revokeObjectURL(url);
                            });
                        }
                    }).catch((err) =>{
                        // catch any fetch errors
                        if(err){
                            console.log(err);
                        }
                    });
            }
        }
        else{
            //remove the loading gif
            loader.style.visibility = "hidden";
            document.getElementById("loadingText").innerHTML = "Loading";
        }
    });


    /**
     * @function exportBtn 'mousedown' event handler
     * 
     * @description shows the loading and progress bar
     * 
    */
   $('#exportBtn').on("mousedown",function(){
        loader.style.visibility = "visible";
        document.getElementById("loadingText").innerHTML = "Prepairing Image";
    });

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
            if(typeof(children[index]) == "object"){
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
    });


    /**
     * @function viewOption 'mousedown' event handler
     * 
     * @description change the view of the image that the user is viewing
     * 
    */
    $("#viewOption").on("change", function(){
        if($(this).is(":checked")){
            $("#imageViewContainer").css("width","65%");
            $("#imageViewContainer").css("height","auto");
        }
        else{
            $("#imageViewContainer").css("width","auto");
            $("#imageViewContainer").css("height","fit-content");
        }
    });


    /**
     * @function colorPickerLine 'change' event handler
     * 
     * @description when the color value is changed in the color picker set the global
     * 
    */
    $("#colorPickerLine").change(function(){
        userLineColor = document.getElementById("colorPickerLine").value;
    });


    /**
     * @function colorPickerBox 'change' event handler
     * 
     * @description when the color value is changed in the color picker set the global
     * 
    */
    $("#colorPickerBox").change(function(){
        userBoxColor = document.getElementById("colorPickerBox").value;
    });


    /**
     * @function textColorPicker 'change' event handler
     * 
     * @description when the color value is changed in the color picker set the global
     * 
    */
    $("#textColorPicker").on("change",function(){
        userTextColor = document.getElementById("textColorPicker").value;
    });

    // ------------------------------ End Color Pickers -----------------------------------------------------
        
    // -------------------------------- Undo Button UI ------------------------------------------------------
    /**
     * @function undoLine 'mousedown' event handler
     * 
     * @description remove the last added instance of the lines
     * 
    */
    $("#undoLine").on("mousedown",function(){
        if(lineArr.length > 0 && clickArray.length > 1){
            lineArr.pop().remove();
            svg.className.baseVal = "image-image float-center";
            document.getElementById("pencilIconFlag").className = "btn btn-lg button";
            drawFlag = false;
            clickArray = [];
        }
        else if(lineArr.length > 0){
            lineArr.pop().remove();
        }
        else{
            alert("No lines drawn");
        }

        if(lineArr.length === 0){
            document.getElementById("undoLine").style.visibility = "hidden";
        }
    });


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
                lineArr.pop().remove();
                clickArray = [];
            }
        }
    });
    

    /**
     * @function undoBox 'mousedown' event handler
     * 
     * @description remove the last added instance of the outline boxes
     * 
    */
    $("#undoBox").on("mousedown",function(){
        if(highlightBoxArray.length > 0){
            highlightBoxArray.pop().remove();
        }
        else{
            alert("There are no boxes placed yet");
        }

        if(highlightBoxArray.length === 0){
            document.getElementById("undoBox").style.visibility = "hidden";
        }
    });
      

    /**
     * @function undoText 'mousedown' event handler
     * 
     * @description remove the last added instance of the text box
     * 
    */
    $("#undoText").on("mousedown",function(){
        if(textBoxArray.length > 0){
            textBoxArray.pop().remove();
        }
        else{
            alert("text has not been added");
        }

        if(textBoxArray.length === 0){
            document.getElementById("undoText").style.visibility = "hidden";
        }
    });

    // -------------------------------- End Undo Button UI --------------------------------------------------

    // ------------------------------- Button Handlers ------------------------------------------------------
      
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
            g.setAttribute("class","draggable confine textbox");
            g.setAttribute("x",0);
            g.setAttribute("y",0);
            // text attributes start location
            text.setAttribute("x",0);
            text.setAttribute("y",15);
            // text offset location
            text.setAttribute("dx",0);
            text.setAttribute("dy",0);
            // text font family to fix issue #66
            text.setAttribute("font-family","sans-serif");
            // default the letter spacing for all browsers
            text.setAttributeNS("http://www.w3.org/2000/svg","letter-spacing","0px");
            // font size
            text.style.fontSize = "15";
            // set draggable group defaults
            g.setAttribute("height",0);
            g.setAttribute("width",0);
            g.setAttribute("transform","translate(50,50) rotate(0) scale("+ textSize*2 + ")");

            // create rectangles on all corners for scaling the text
            var rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect.setAttribute("x",0);
            rect.setAttribute("y",13);
            rect.setAttribute("width", 5);
            rect.setAttribute("height", 5);
            rect.style.visibility = "hidden";
            rect.setAttribute("class","resize bottom-left");

            var rect2 = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect2.setAttribute("x",0);
            rect2.setAttribute("y",1);
            rect2.setAttribute("width", 5);
            rect2.setAttribute("height", 5);
            rect2.style.visibility = "hidden";
            rect2.setAttribute("class","resize top-left");

            var rect3 = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect3.setAttribute("x",10);
            rect3.setAttribute("y",1);
            rect3.setAttribute("width", 7);
            rect3.setAttribute("height", 7);
            rect3.style.visibility = "hidden";
            rect3.setAttribute("class","resize top-right");
            rect3.setAttribute("fill","blue");

            var rect4 = document.createElementNS("http://www.w3.org/2000/svg","rect");
            rect4.setAttribute("x",10);
            rect4.setAttribute("y",13);
            rect4.setAttribute("width", 7);
            rect4.setAttribute("height", 7);
            rect4.setAttribute("fill","blue");
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

            // set the scaling boxes x value to the end of the bbox
            // this auto finds the relative length of the text element
            let bbox = g.getBBox();
            if(strlength > 1){
                rect3.setAttribute("x",bbox.width - 2);
                rect4.setAttribute("x",bbox.width - 2);
            }
            // track the new text element
            textBoxArray.push(g);
            // set the visiblity of the undo btn
            if(textBoxArray.length > 0){
                document.getElementById("undoText").style.visibility = "visible";
            }
            
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
                
            }

            if(eyeFlag){
                
                cropFlag = false;
            /*  document.getElementById('cropFlag').innerHTML = "Crop Image"; */
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

            }
            
            if(sunFlag){
                
                cropFlag = false;
                outlineBox.style.visibility = 'hidden';
                
            /*  document.getElementById('cropFlag').innerHTML = "Crop Image"; */
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
                
                northFlag = !northFlag;
            }
            
            // otherwise set the other flags to false and adjust their html
            if(northFlag){
                /* cropFlag = false;
                document.getElementById('cropFlag').innerHTML = "Crop Image"; */
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

        g.setAttribute("class","draggable confine outline");
        g.setAttribute("transform-origin","50%; 50%;");
        g.setAttribute("transform","translate(0,0) rotate(0) scale(.5)");
        g.setAttribute("stroke-width","20");
        g.style.border = 0;
        g.style.padding = 0;
        g.style.pointerEvents = "visible";
        g.style.fill = "none";

        g.innerHTML = attensionBoxObjectString;
        
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
        highlightBoxArray.push(g);
        makeDraggable(svg);

        // make the undo button visible
        if(highlightBoxArray.length > 0){
            document.getElementById("undoBox").style.visibility = "visible";
        }
    });


    /**
     * @function bottomPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */
    $("#bottomPaddingBtn").on('click',function(event){
        if(!isNaN(parseInt(paddingBoxInput.value))){
            setImagePadding(parseInt(paddingBoxInput.value),'bottom');
            padBottom = true, padLeft = false, padRight = false, padTop = false;

            bottomBtn.className = 'btn btn-danger button btn-sm paddingBtn disabled';

            leftBtn.className = 'btn button btn-sm paddingBtn';
            rightBtn.className = 'btn button btn-sm paddingBtn';
            topBtn.className = 'btn button btn-sm paddingBtn';
        }
        else{
            setImagePadding(parseInt(0),"none"); 
            bottomBtn.className = 'btn button btn-sm paddingBtn';
            leftBtn.className = 'btn button btn-sm paddingBtn';
            rightBtn.className = 'btn button btn-sm paddingBtn';
            topBtn.className = 'btn button btn-sm paddingBtn';
            padBottom = false;  
        }
    });


    /**
     * @function topPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */
    $("#topPaddingBtn").on('click',function(event){
        if(!isNaN(parseInt(paddingBoxInput.value))){
            setImagePadding(parseInt(paddingBoxInput.value),'top');
            padTop = true, padLeft = false, padRight = false, padBottom = false;
            
            topBtn.className = 'btn btn-danger button btn-sm paddingBtn disabled';

            leftBtn.className = 'btn button btn-sm paddingBtn';
            rightBtn.className = 'btn button btn-sm paddingBtn';
            bottomBtn.className = 'btn button btn-sm paddingBtn';
        }
        else{
            setImagePadding(parseInt(0),"none"); 
            topBtn.className = 'btn button btn-sm paddingBtn';
            leftBtn.className = 'btn button btn-sm paddingBtn';
            rightBtn.className = 'btn button btn-sm paddingBtn';
            bottomBtn.className = 'btn button btn-sm paddingBtn';
            padTop = false;  
        }
    });


    /**
     * @function rightPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */
    $("#rightPaddingBtn").on('click',function(event){
        
        if(!isNaN(parseInt(paddingBoxInput.value))){
            setImagePadding(parseInt(paddingBoxInput.value),'right');
            padRight = true, padLeft = false, padBottom = false, padTop = false;

            rightBtn.className = 'btn btn-danger button btn-sm paddingBtn disabled';

            leftBtn.className = 'btn button btn-sm paddingBtn';
            bottomBtn.className = 'btn button btn-sm paddingBtn';
            topBtn.className = 'btn button btn-sm paddingBtn';
        }
        else{
            setImagePadding(parseInt(0),"none"); 
            rightBtn.className = 'btn button btn-sm paddingBtn'; 
            leftBtn.className = 'btn button btn-sm paddingBtn';
            bottomBtn.className = 'btn button btn-sm paddingBtn';
            topBtn.className = 'btn button btn-sm paddingBtn';
            padRight = false; 
        } 
    });


    /**
     * @function leftPaddingBtn 'click' event handler
     * 
     * @description on click, checks for valid input and then calls the padding functions and changes UI
    */  
    $("#leftPaddingBtn").on('click',function(event){
        
        if(!isNaN(parseInt(paddingBoxInput.value))){
            setImagePadding(parseInt(paddingBoxInput.value),'left');
            padLeft = true, padBottom = false, padRight=false, padTop = false;
            
            leftBtn.className = 'btn btn-danger button btn-sm paddingBtn disabled';
            
            bottomBtn.className = 'btn button btn-sm paddingBtn';
            rightBtn.className = 'btn button btn-sm paddingBtn';
            topBtn.className = 'btn button btn-sm paddingBtn';
        }
        else{
            setImagePadding(parseInt(0),"none"); 
            leftBtn.className = 'btn button btn-sm paddingBtn'; 
            bottomBtn.className = 'btn button btn-sm paddingBtn';
            rightBtn.className = 'btn button btn-sm paddingBtn';
            topBtn.className = 'btn button btn-sm paddingBtn';
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
        else if(((keys[0] === 16 && keys[1] === 18) || (keys[1] === 16 && keys[0] === 18)) && keys.length === 3){
            event.preventDefault();
            if(keys[2] === 76){
                if(lineArr.length > 0){
                    $("#undoLine").mousedown(); 
                }
            }
            else if(keys[2] === 79){
                $("#eyeCheckbox").change();
                if(document.getElementById("eyeCheckbox").checked){
                    document.getElementById("eyeCheckbox").checked = false;
                }
                else{
                    document.getElementById("eyeCheckbox").checked = true;
                } 
            }
            else if(keys[2] === 66){
                if(highlightBoxArray.length !== 0){
                    $("#undoBox").mousedown(); 
                }
            }
            else if(keys[2] === 78){
                $("#northCheckbox").change();
                if(document.getElementById("northCheckbox").checked){
                    document.getElementById("northCheckbox").checked = false;
                }
                else{
                    document.getElementById("northCheckbox").checked = true;
                } 
            }
            else if(keys[2] === 83){
                $("#sunCheckbox").change();
                if(document.getElementById("sunCheckbox").checked){
                    document.getElementById("sunCheckbox").checked = false;
                }
                else{
                    document.getElementById("sunCheckbox").checked = true;
                } 
            }
            else if(keys[2] === 84){
                if(textBoxArray.length > 0){
                    $("#undoText").mousedown();
                }
            }
            else if(keys[2] === 82){
                $("#scaleCheckbox").change();
                if(document.getElementById("scaleCheckbox").checked){
                    document.getElementById("scaleCheckbox").checked = false;
                }
                else{
                    document.getElementById("scaleCheckbox").checked = true;
                }
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
        // TODO: figure our how to buffer the Y portion
        var bufferY = 50;
        // get proper svg as target
        var target = (t == svg ? svg : t.parentNode);
        
        // get new svg relative point
        var svgP = svgPoint(target, x, y);
        // convert to int
        mouseX = parseInt(svgP.x),
        mouseY = parseInt(svgP.y);

        //console.log('MOUSE MOVING OVER SVG BOX: ' + mouseX + ': ' + mouseY);
        if( drawFlag && clickArray.length >1  
            && document.elementFromPoint(event.clientX, event.clientY) !== svg){
            drawLine(line, mouseX, mouseY);
        }
        
        /*
        if(cropFlag && !doneResizing){


            // clicking close to the 0,0
            if(mouseX < 0 && mouseY < bufferY){
                mouseX = 0;
                mouseY = 0;
            }
            // if the click is close to max corner(bottom right)
            else if(mouseY > Number(<%=h%>) - bufferY && mouseX > Number(<%=w%>)){
                mouseX = <%=w%>;
                mouseY = <%=h%>;
            }
            // if the click is close to the top right 
            else if(mouseX > Number(<%=w%>) && mouseY < bufferY){
                mouseX = <%=w%>;
                mouseY = 0;
            }
            // if the click is close to bottom left corner
            else if(mouseX < 0 && mouseY > Number(<%=h%>) - bufferY){
                mouseX = 0;
                mouseY = <%=h%>;
            }
            // for left side
            else if(mouseX < 0 && mouseY < Number(<%=h%>) - bufferY){
                mouseX = 0;
                
            }
            // for right side
            else if(mouseX > Number(<%=w%>) && mouseY < Number(<%=h%>) - bufferY && mouseY > bufferY){
                mouseX = <%=w%>;
            }
            adjustBox();
        }*/
    });

    /* 

    // button to undo the cropped image
    $("#backBtn").on('click',function(event){
        event.preventDefault();

        var currentImg = '<%= image %>';

        console.log(currentImg);

        // if the image has been cropped then get the previous image
        if(currentImg.indexOf('_crop.png') > -1){
            // ajax request for the data sending the current image link
            $.ajax({
                type: 'GET',
                
                cache: false,
                url: 'http://localhost:8080/crop?currentImage=' +'<%= image %>',
                success: function(response) {
                    $("html").html(response);
                
                    
                },
                error: function(xhr, status, err) {
                    console.log(xhr.responseText);
                    loadInvisible();
                    
                }
            });
        }
        else{
            // if the current image is the base image then alert the user
            loadInvisible();
            alert('Base Image:\nCannot Be Undone');
        }
    }); */

    /* 
    // use same logic for other button
    $("#cropFlag").click(function(){
        cropFlag = !cropFlag;

        if(cropFlag){
            if(!northIconPlaced){
                northFlag = false
                document.getElementById('northIconFlag').innerHTML = "Add North Arrow";
            }
            if(!sunIconPlaced){
                sunFlag = false;
                document.getElementById('sunIconFlag').innerHTML = "Add Sun Icon";
            }
            if(eyeFlag && !eyeIconPlaced){
                eyeFlag = false;
                document.getElementById('eyeFlag').innerHTML = "Add Observer Icon";
            }

            document.getElementById('cropFlag').innerHTML = "Cancel?";
            
        }
        else{
            clickArray = [];
            document.getElementById('cropFlag').innerHTML = "Crop Image";
            outlineBox.style.visibility = 'hidden';
        }
        
    }); */


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
            y = event.clientY;

        // TODO: figure our how to buffer the Y portion
        var bufferY = parseInt(h * .09);
        
        // get proper svg as target
        var target = (t == svg ? svg : t.parentNode);
        
        // get new svg relative point
        var svgP = svgPoint(target, x, y);
        // convert to int
        mouseX = parseInt(svgP.x),
        mouseY = parseInt(svgP.y);
        
        // if the draw flag is true and length of clicks is 0
        if(drawFlag && clickArray.length === 0 
            && document.elementFromPoint(event.clientX, event.clientY) !== svg){
            // create the new  line dynamically and add it to the array so we can remove it later if needed
            line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("x1",mouseX);
            line.setAttribute("y1",mouseY);
            line.setAttribute("x2",mouseX);
            line.setAttribute("y2",mouseY);
            line.style.visibility = "visible";
            if(userLineColor){
                line.style.stroke = userLineColor;
            }
            else{
                line.style.stroke = "white";
            }
            
            line.style.strokeWidth = 10;
            svg.appendChild(line);

            lineArr.push(line);
            captureClick(mouseX,mouseY);
        }
        else if(drawFlag && clickArray.length > 1  
            && document.elementFromPoint(event.clientX, event.clientY) !== svg){
            // if the line is being drawn and the seconf click happens set the final location
            line.setAttribute("x2",mouseX);
            line.setAttribute("y2",mouseY);

            clickArray = [];
            drawFlag = false;
            // reset the button color and allow for click detection again
            document.getElementById("pencilIconFlag").className = "btn btn-lg button";

            if(lineArr.length > 0){
                document.getElementById("undoLine").style.visibility = "visible";
            }

            bg.className.baseVal = "";

            // parse the whole svg and set the pointerevents to accept clicks again
            setSvgClickDetection(svg, "all");
        }
    
        /*   COMMENTING OUT FOR NOW
        if(cropFlag){
            // clicking close to the 0,0
            if(mouseX < 0 && mouseY < bufferY){
                captureClick(0,0);
            }
            // if the click is close to max corner(bottom right)
            else if(mouseY > Number(<%=h%>) - bufferY && mouseX > Number(<%=w%>)){
                captureClick(<%=w%>,<%=h%>);
            }
            // if the click is close to the top right 
            else if(mouseX > Number(<%=w%>) && mouseY < bufferY){
                captureClick(<%=w%>,0);
            }
            // if the click is close to bottom left corner
            else if(mouseX < 0 && mouseY > Number(<%=h%>) - bufferY){
                captureClick(0,<%=h%>);
            }
            // for left side
            else if(mouseX < 0 && mouseY < Number(<%=h%>) - bufferY){
                captureClick(0,mouseY);
            }
            // for right side
            else if(mouseX > Number(<%=w%>) && mouseY < Number(<%=h%>) - bufferY && mouseY > bufferY){
                captureClick(<%=w%>,mouseY);
            }

            if(!doneResizing){
                    console.log(clickArray);
                outlineBox.style.visibility = 'visible';
                svg.appendChild(outlineBox);
                outlineBox.setAttribute('x',clickArray[0]);
                outlineBox.setAttribute('y',clickArray[1]);
            }

            if(clickArray.length === 4){
                // and if the points arent stacked
                if((clickArray[0] === clickArray[2] && clickArray[0] !== 0) 
                    || clickArray[1] === clickArray[3]){
                    clickArray = [];
                    alert('Cannot be cropped in this manner');
                    cropFlag = false;
                    document.getElementById('cropFlag').innerHTML = "Crop Image";
                
                }
                else{
                    prepareCrop(clickArray);
                    // activate loader gif 
                    loaderActivate();
                    // set done resizeing flag
                    doneResizing = true;
                    //get the array string for the request
                    let arrayStr = clickArray.toString();
                    // prevent defaults 
                    event.preventDefault();
                    // send ajax POST request through http
                    $.ajax({
                        type: 'POST',
                        cache: false,
                        async: true,
                        url: 'http://localhost:8080/crop?cropArray=' + arrayStr 
                        + '&currentImage=' +'<%= image %>',
                        success: function(response) { 
                            // on success load the new html data into the page    
                            $("html").html(response);
                            // set the loader to invisible
                            loadInvisible();
                            // reset clickarray
                            clickArray = [];
                            // reset flag
                            cropFlag = false;
                        },
                        error: function(xhr, status, err) {
                            // on error log the error
                            console.log(xhr.responseText);
                            alert('Crop Failed');
                            loadInvisible();
                        }
                    });
                }
            }   
        }
        */
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
            else if(padRight){
                setImagePadding(parseInt(this.value),'right');
            }
            else if(padLeft){
                setImagePadding(parseInt(this.value),'left');
            }
            else if(padTop){
                setImagePadding(parseInt(this.value),'top');
            }
        }
        else{
            // if the value is not a number, warn the user that only numbers can render
            //  warned flag is to onl warn each user 1 time
            if(this.value !== "" && !warned){
                alert("Only Accepts Whole Numbers");
                warned = true;
            }
            // reset the padding to 0
            $("#resetPaddingBtn").click();
        }
    });


    /*  // capture mouse position on image mouse over
    $('#crop').mousemove(function(event){
        event.preventDefault();

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

        console.log( "mouse over image: " + mouseX +': ' + mouseY);
        
        // only adjust the box if currently croppping
        if(!doneResizing && clickArray.length > 1){
            
            adjustBox();
        }
    }); */


    /* 
    // when the image registers a click
    $("image").on("click", function(event) {
        event.preventDefault();
        // capture event variables for px calculations
        var t = event.target;
        var x = event.pageX;
        var y = event.pageY;
    
        // if the target is the svg DOM then keep it the same 
            //  otherwise set it to the parent of the current target 
        var target = (t == svg ? svg : t.parentNode);
        // get the converted svg coordinates
        var svgP = svgPoint(target, x, y);
        // convert floats to integers
        var x = parseInt(svgP.x),
            y = parseInt(svgP.y);
    
        // ======== FOR TESTING=======
        console.log("x is: " + x);
        console.log("y is:" + y);
        // ===========================

        /* // if any of the flags are true
        if(cropFlag){

            // and if the click array is either length = 0 or the clicks are in 
                // a proper location for cropping capture the click in the clickArray 
            if(clickArray.length === 0){
                captureClick(x,y);
                // check click array
                console.log(clickArray);
            }
            else if(clickArray.length === 2){
                
                captureClick(x,y);
                prepareCrop(clickArray);
                
                
            }
            
            // Then if the click flag is true and the length of the array is 2
            if(cropFlag && clickArray.length === 2){
                // set the dimensions and visibilty of the outline box
                outlineBox.style.visibility = 'visible';
                svg.insert(outlineBox);
                
                outlineBox.setAttribute('x',clickArray[0]);
                outlineBox.setAttribute('y',clickArray[1]);
            }
            // if the crop flag is true and the length of the click array is 4 crop the image
            else if( cropFlag && clickArray.length === 4){
                // activate loader gif 
                loaderActivate();
                // set done resizeing flag
                doneResizing = true;
                //get the array string for the request
                let arrayStr = clickArray.toString();
                // prevent defaults 
                event.preventDefault();
                // send ajax POST request through http
                $.ajax({
                    type: 'POST',
                    cache: false,
                    async: true,
                    url: 'http://localhost:8080/crop?cropArray=' + arrayStr 
                    + '&currentImage=' +'<%= image %>',
                    success: function(response) { 
                        // on success load the new html data into the page    
                        $("html").html(response);
                        // set the loader to invisible
                        loadInvisible();
                        // reset clickarray
                        clickArray = [];
                        // reset flag
                        cropFlag = false;
                    },
                    error: function(xhr, status, err) {
                        // on error log the error
                        console.log(xhr.responseText);
                        alert('Crop Failed');
                        loadInvisible();
                    }
                });
                
            }
        }  
    }); // end image click
    */
    // ---------------------------------- End Click & Text Input Handlers -----------------------------------
    
});/** ------------------------------------ End Jquery Handlers ------------------------------------------ */