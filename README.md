![USGS](https://upload.wikimedia.org/wikipedia/commons/0/08/USGS_logo.png)
-------------------------------------------------------------------------------------------------------------
# PIPS: Planetary Image Publication Server
-------------------------------------------------------------------------------------------------------------
- [Introduction](#Introduction)
- [Install](#Installing)
- [Developing](#Developing)
- [Contributing](#Contributing)
- [Manual](#Manual)
- [Hotkeys](#Hot-Keys)
- [Licensing](#Licensing)
- [Links](#Links)

### Introduction

This is a server that is supported by USGS's ISIS3 on the backend, its purpose is to bring the 
power that ISIS has to the click of a button in the specific focus
of creating publication ready figures.

Users can upload cube (.cub) or geotiff (.tif) files to the server and be returned 
useful data that relates to the contents of the image header as well as the image itself.
The users have the able to edit a simple text caption and use the data that is found by ISIS
to write the captions for the images much faster than before. Using a tag format they can use data 
from the cube headers on the fly just by copy and pasting the tags into the caption field.
This will fast track the caption writing process for astrogeological researchers.

The other purpose is to allow for simple photo editing capabilities using the relevent data 
that is inside the cubes or tiffs. Users can ~~crop~~, annotate and add icons to the image on the fly using
a web interface that works all off the mouse.
The server will generate correct size scale bars and allow the user to place it where ever they 
want just by clicking on the icon and dragging it around. Icons will be generated with the correct
orientation and can be scaled up and down in size by dragging from the corners. 

Since the server has no need for a database and is fed through user input we chose to asyncronously
return data to the user while using cookies to instance users instead of sign ins. There is no need for a 
database simply because the user already should know what they would like to edit. Saving large amounts of
cubes to the server would just slow the server down and there isn't that much of a need for returning to old
uploads when the user should already have the file.

In the future this project will be linked to the POW site at the USGS to bring the fast editing
to a whole new scope of users and data.

## Installing
If you wish to only use the application and you have no intention to contribute to the GitHub then you can
install and run this code using Docker CE on any operating system. 

1. Follow the Docker installation guide for your OS [here](https://docs.docker.com/docker-for-windows/install/).

2. Once Docker is installed run this command in your console: `docker pull chaddfrasier/pips-usgs`

3. And lastly start the container by running the image: `docker run --name pips -p 8080:8080 chaddfrasier/pips-usgs`


## Developing

In order to develop on this project you will first need to install ISIS3, and Node.js/npm.

To check if they are installed simply run `node -v` & `npm -v` 
these commands should return a version number that your machine has. Otherwise you will need to install them.
Node will download npm for you, go [here](https://nodejs.org/en/) for the Node.js install.
__if you are on company servers you will need IT to install it for you because you lack permissions__

ISIS install can be achieved by following the instructions 
for installation [here](https://github.com/USGS-Astrogeology/ISIS3).

Once those are installed and environment variables have been set properly for 
ISIS you can pull down the server code and run.
`npm install` in the project folder. 
*This will install all Node.js dependencies for you.*

Then you can start developing.
Start the server with the command `node server` in the project directory.

## Contributing

When contributing to this project we ask that you create a new pull request for 
any changes that you would like to make, after review by the repository leads your
request will either be merged or closed without merge depending on what has been done. 
Any request will be considered.

Read the update paragraph in the [server.js](https://github.com/ChaddFrasier/PIPS/blob/master/server.js)
file before contributing to understand what is currently working, do not depricate any functions without
consent from the repository managers.

Post and issue if you wish to become a contributor stating who you are 
and why you feel you could benefit the project. 
Also feel post issues if you find bugs or have suggestions to better the project.

## Manual

This server is created to streamline the figure creation process for researchers of Astrogeology. 
Simply upload a cube file to the server and wait for the server to run ISIS3 commands on the cube and return
key value pairs of the data that is held in the Cube headers. Help buttons are at the top right of all
pages to guide you if you become confused.  

1. First you you will be required to upload either a Cube file (.cub) or a Tiff file (.tif) to 
the server. You can optionally upload a template file for the server if you have used it before otherwise simply
choose a template file preset using the buttons in the template box.
Hit the 'What is a TPL File?' button to read all about what a template file is for on the server and how to make one.
Choose a figure output size using the options box. Figure sizes are organized by journal title and figure 
types accepted by the journal. The server can create log files for all the uploads, just check the Log ISIS Output
check box to have the server generate a log file of the ISIS outputs that were recieved on the server run.
![Current Index Page](https://i.imgur.com/Ot90QqL.png)


2. Next you will be greeted with three boxes. One on the top row, and two on the bottom row. 
The top box is the caption output which is the resulting caption with data from ISIS embedded. The bottom right
box is the editing box where you can type your caption and paste data tags to use ISIS data directly
from the cube header. The bottom left box is where the tags from the usable ISIS data will be displayed with
there value. Copy and paste the tags into your editing box to switch the keys with the data values. The 'Show All Tags'
button will show every peice of data that could be extracted from the cube, so if you are looking for something 
specific try filtering through all the tags instead of only viewing the configured "Important Tags". Search for key 
words in the data by typeing in the search box to the left. You can add custom tags by using the green plus 
button in the tag box. Users can change the values of common tags by typing the tag name into the new tag UI and
entering the new value for it.
You can save several things from this page, you can download the finished caption with the embedded
ISIS data, you can save the raw template file, you can download the log file which contains the results from the
ISIS program calls executed on the server, or you can download the data as a CSV in Tag-Value format.
If you do not see a 'Save ISIS Logs' button in the center of the title box then you have no log file on the server.
Lasty, you can copy all the text in the output box by clicking the save to clipboard button, then just paste the 
text wherever it needs to live. The user can also add special characters by using the sigma button at the top of 
the output box. Place the pointer where you want to place the icon and then hit the button to add the icon.
![Current Writer Page](https://i.imgur.com/Paw8YJi.png)


3. Lastly, edit your image into an easily readable and printable figure using icons and other annotation features.
Add a North Arrow, a Sun azimuthal Direction indicator, a scalebar for the image ,and an observer
direction arrow by clicking the buttons with the icons. Swap colors of the icons using the check box
next to each of the icons. Every icon other than the scalebar can be scaled up and down using the mouse. 
Mouse over the corners of the object and clicking and dragging when promted to by the mouse pointer.
All icons can be dragged around the screen to be placed where ever you would like.
__(checkboxes are only visible when icons are on screen)__.
Draw over icons and the image using the pencil tool. Click the pencil button and click once to place one 
end of the line, and then click a second time to place the other end of the line. Change colors of the
line by using the color picker box next to the button. Once at least 1 line is on the screen,
a 'Undo Line' will appear on screen. Use this to remove the last line that you drew. Use the slider to add or remove
an arrowhead.
Add outline boxes to the figure by clicking the box button and then dragging the box around the image.
Scale the box larger and smaller by mouseing over the corners of the icon and click dragging the icon
when prompted. Again a color picker is given to allow you to change the color of the box, and again an
'Undo Box' button will appear if there are any on screen to allow you to remove the last added box.
Text boxes work the exact same way, with the color picker and undo button, but the only difference is 
when you first click the button, the webpage will prompt you to type what you want the box to say.
You can add padding to the image at one of the four sides, type the numbr of pixels you would like to
pad the image and a location to place the pixels. To remove the padding either delete the numbers
in the text box or hit the reset button.
Users can now change the figure size after upload. Padding is reset whenever the figure size changes.
And lastly, you can export the figure you create by clicking the blue save button at the very bottom.
Accepted file export types include svg, tif, png, and jpg.
![Current Edit Page](https://i.imgur.com/M8ZKKfB.png)

#### Hot Keys

Keys      | Command
----------|----------------------------------------  
`Alt + N` | `Toggle North Azimuthal Indicator`
`Alt + L` | `Start Line Drawing Tool`
`Alt + O` | `Toggle Observer Azimuthal Indicator`
`Alt + T` | `Start Text Tool`
`Alt + S` | `Toggle Sun Azimuthal Indicator`
`Alt + B` | `Add 1 Outline Box`
`Alt + R` | `Toggle Scalebar`

Keys              | Command
------------------|----------------------------------------  
`Shift + Alt + N` | `Toggle Color of North Azimuthal Indicator`
`Shift + Alt + L` | `Undo Last Drawn Line`
`Shift + Alt + O` | `Toggle Color of Observer Azimuthal Indicator`
`Shift + Alt + T` | `Undo Last Added Text`
`Shift + Alt + S` | `Toggle Color of Sun Azimuthal Indicator`
`Shift + Alt + B` | `Undo Last Outline Box`
`Shift + Alt + R` | `Toggle Color of Scalebar`

## Licensing

Right now PIPS is holding a GPLv3 for the reason that this project could be kept up 
and worked on by you the users whenever you feel fit although as of now contributors
must be approved prior to submitting pull requests.

### Links

Project Home:[Github](https://github.com/ChaddFrasier/PIPS),[DockerHub](https://hub.docker.com/r/chaddfrasier/pips-usgs)

Issue Tracker: [Issues/Bugs](https://github.com/ChaddFrasier/PIPS/issues)

Related Repos: [ISIS3](https://github.com/USGS-Astrogeology/ISIS3), [Dockerbuild](https://github.com/ChaddFrasier/PIPS_Docker)

-----------------------------------------------------------------------------------------------------------------------
@ChaddFrasier GitHub
