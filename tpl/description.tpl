<u>A template for The PIP Server is a fast and simple way to repeat captions if you please.

When using PIPS you will be writing captions using the tags that are returned to you from ISIS3 but if 
you think you could reuse any of the captions for multiple images of the same planetary body it would 
be much faster to save the template from the webpage and upload it again later.
A tpl file is basically just a text file with ISIS3 data value names intertwined where the data should be used.

<u>Like this:

Template (.tpl): "This image of TargetName was taken by the InstrumentName orbitor." 

Caption Output: "This image of Mars was taken by the MRO orbiter."


<u>When no data can be found in ISIS3 but the tag is used it will be replaced like so:


Template (.tpl): `This image of TargetName was taken by the InstrumentName orbitor.` 

Caption Output: `This image of Mars was taken by the None orbitor.`