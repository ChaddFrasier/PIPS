![USGS](https://upload.wikimedia.org/wikipedia/commons/0/08/USGS_logo.png)
-------------------------------------------------------------------------------------------------------------
# PIPS: Planetary Image Publication Server
-------------------------------------------------------------------------------------------------------------
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

![Current Edit Page](https://i.imgur.com/M3qjZwt.png)

## Developing

In order to develop on this project you will first need to install ISIS3, and Node.js/npm.

To check if they are installed simply run `node -v` & `npm -v` 
these commands should return a version number that your machine has. Otherwise you will need to install them.
Node will download npm for you, go [here](https://nodejs.org/en/) for the Node.js install.
__if you are on company servers you will need IT to install it for you because you lack permissions__

ISIS install can be achieved by following the instructions 
for installation [here](https://github.com/USGS-Astrogeology/ISIS3).

You will need to obtain working versions of Cairo, Pango, libjpeg-dev and librsvg2-dev
On Linux run: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev librsvg2-dev`

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

## Licensing

Right now PIPS is holding a GPLv3 for the reason that this project could be kept up 
and worked on by you the users whenever you feel fit although as of now contributors
must be approved prior to submitting pull requests.

### Links

Project Home: https://github.com/ChaddFrasier/PIPS

Issue Tracker: https://github.com/ChaddFrasier/PIPS/issues

Related Repos: https://github.com/USGS-Astrogeology/ISIS3
