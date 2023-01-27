# AutoBeat
AutoBeat is an intellignet AI drum machine for co-creative music production. 

The design phase involves exploration of the problem and its interaction paradigms, followed by iteration of possible machine learning concepts. The plugin autocompletes musical ideas in real time and can create surprising novel musical outcomes from the fragment of a musical idea. The plugin uses the Magenta.js RNN model for continuation and a density interpolation model to changes the 'density' of the sequence.

![Screentshot](Screenshot.png)

DEMO [https://vimeo.com/481090771]

# Setup

To run this app, you'll need:
```
1.    NPM
2.    Max for live (M4L) or MaxMSP (if using MaxMSP update the main.amxd extension)
3.    Ableton Live
```

# Run
```
1.    Drag main.amxd into Ableton. Click the button labeled "Set up". Select an instrument such as a drum rack to use as a sampler
2.    Click the button labeled start. If something breaks you may need to run NPM i in the node directories. 
3.    To expand the Max code, you can open the patch editor and unfreeze the patch. 
```

The Max patch is the brain of this app. It pipes data between the UI and Ableton: UI -> Node -> Max -> Live API -> Max -> Node -> UI. The Max patch runs multiple JS scripts and two node processes. Two nodes processes are required because the Max API is only available in the node process that's evoked by node.script in the max patch. Therefore to interact with Ableton programmatically from the UI, two seperate processes are required. One that handles interaction with Ableton through Max, and one that runs the electron process to create the interface. These instances can communicate both ways through sockets.

![AUTOBEAT IMAGE](AutobeatImage.png)
