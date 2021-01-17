// Because this file is specified as the `main` in package.json
// this file will be the entry point for Electron App
// when `npm start` is called.

const { app, BrowserWindow } = require("electron");

app.on("ready", () => {

    console.log("Electron has started");

    // Launch a window and load index.html
    let window = new BrowserWindow({
        width: 990,
        height: 700,
        resizable: false,
        // frame: false,
        titleBarStyle: 'hiddenInset'
    });
    window.loadFile("./src/index.html");

    window.on("closed", () => {
        window = null;
    });

    // How to fix aspect ratio while scaling window?
    // window.setAspectRatio(1.57);

    // For Development Only (remove for prod version?)
    if (process.env.DEBUG) {
        window.webContents.openDevTools();
    }

});

app.on("window-all-closed", function() {

    if (process.platform !== "darwin") {
        app.quit();
    }

});