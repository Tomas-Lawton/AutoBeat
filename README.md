This project combines web technologies, Max visual programming, the Live Object Model (LOM) and a tensorflow wrapper by Google called Magenta.js to create a an intelligent drum machine plugin for Ableton. The plugin autocompletes musical ideas in real time and can create surprising novel musical outcomes from the fragment of a musical idea. The plugin uses a RNN model for continuation and a density interpolation model to changes the 'density' of the sequence. (Learn more about models here: )[https://github.com/magenta/magenta-js]

The Max patch is the brain of this app. It patch pipes data between the UI and Ableton along this continuum: 
UI -> Node -> Max -> Live API -> Max -> Node -> UI. 
The Max patch runs multiple JS scripts and two node processes. Two nodes processes are required because the Max API is only available in the node process that's evoked by node.script in the max patch. Therefore two have interaction with Ableton to through the UI, two seperate process are required: 1 that handles interaction with Ableton through Max, and one that runs electron to create the interface. These instances can communicate both ways through sockets, although this only high level explanation. Due to the jank that is this project, there is a tonne of rogue code and some features are pretty questionable. Good luck!

To run this app, you'll need:
1.    NPM
2.    Max for live (M4L) or MaxMSP (if using MaxMSP update the main.amxd extension)
3.    Ableton Live

Set up:
1.    Drag main.amxd onto a MIDI track in Ableton. Click the button labeled "Set up". Select an instrument such as a drum rack to use as a sampler
2.    Click the button labeled start. If something breaks you may need to run NPM i in the node directories. 
3.    To expand the Max code, you can open the patch editor and unfreeze the patch. 

Thank you Yuichi Yogo for the boiler plate Max/Electron code, Tero Parviainen for the open source code that was the basis of the sequencer and Liam Bray for conceptual design guidance.

1. Boiler plate [https://github.com/yuichkun/n4m-electron-boilerplate]
2. Magenta.js sequencer demo [https://magenta.tensorflow.org/blog/2018/05/03/connecting-with-magenta-js#a-drum-machine]
3. Liam [https://liambray.com.au/]