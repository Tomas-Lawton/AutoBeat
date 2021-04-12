## Abstract
AutoBeat is a project focusing on the creation of conceptual models to design artificially intelligent co-creative systems for music composition, and the application of these models to build a novel AI drum machine. The design phase involves exploration of the problem and its interaction paradigms, followed by iteration of possible machine learning concepts. The development phase converts the final concept into an integrated MIDI plugin by prototyping the frontend UI in Figma and implementing a functional pipeline with Electron, Node, Max the Live Object Model and a tensorflow wrapper by Google called Magenta.js. Validation will continue through interaction with this repository and user studies in 2021.

## Technical Overview
This project combines web technologies, Max visual programming, the Live Object Model (LOM) and a tensorflow wrapper by Google called Magenta.js to create an intelligent drum machine plugin for Ableton. The plugin autocompletes musical ideas in real time and can create surprising novel musical outcomes from the fragment of a musical idea. The plugin uses a RNN model for continuation and a density interpolation model to changes the 'density' of the sequence. (Learn more about models here: )[https://github.com/magenta/magenta-js]

![AUTOBEAT IMAGE](AutobeatImage.png)

## Video guides:
1. Hype Video: [https://youtu.be/CdLy-7iIT1g]
2. Set up guide: [https://youtu.be/cYFyo449VpU]
3. Feature demo: [https://youtu.be/fV6Y8C3ayOU]

## Pipeline:
The Max patch is the brain of this app. It pipes data between the UI and Ableton along this continuum: 
UI -> Node -> Max -> Live API -> Max -> Node -> UI. 

## Explanation:
The Max patch runs multiple JS scripts and two node processes. Two nodes processes are required because the Max API is only available in the node process that's evoked by node.script in the max patch. Therefore to interact with Ableton programmatically from the UI, two seperate processes are required. One that handles interaction with Ableton through Max, and one that runs the electron process to create the interface. These instances can communicate both ways through sockets. This is only a high level explanation because the code is decently jank and the project is fundimentally a design project to do with designing conceptual models for musicians to use AI generation tools. Due to the jank, there is a tonne of rogue code and questionable features that I hope you'll improve. Good luck!

## Getting started:
To run this app, you'll need:
1.    NPM
2.    Max for live (M4L) or MaxMSP (if using MaxMSP update the main.amxd extension)
3.    Ableton Live

Set up:
1.    Drag main.amxd onto a MIDI track in Ableton. Click the button labeled "Set up". Select an instrument such as a drum rack to use as a sampler
2.    Click the button labeled start. If something breaks you may need to run NPM i in the node directories. 
3.    To expand the Max code, you can open the patch editor and unfreeze the patch. 

![Screentshot](Screenshot.png)
## Thank yous!
Thank you Yuichi Yogo for the boiler plate Max/Electron code, Tero Parviainen for the open source code that was the basis of the sequencer and Liam Bray for conceptual design guidance.

1. Boiler plate [https://github.com/yuichkun/n4m-electron-boilerplate]
2. Magenta.js sequencer demo [https://magenta.tensorflow.org/blog/2018/05/03/connecting-with-magenta-js#a-drum-machine]
3. Liam [https://liambray.com.au/]

## Socials
1. Portfolio [currently in migration]
2. Insta [www.instagram.com/soju_club]
3. LinkedIn [www.linkedin.com/in/tomas-lawton-512066199]
