const { app, BrowserWindow } = require("electron");
const path = require('path');

app.on("ready", () => {
    console.log("Electron has started");
    let window = new BrowserWindow({
        width: 990,
        height: 700,
        resizable: false,
        titleBarStyle: 'hiddenInset',
        icon: path.join(__dirname, 'assets/icons/png/64x64.png')
    });
    window.loadFile("./src/index.html");
    window.on("closed", () => {
        window = null;
    });
    if (process.env.DEBUG) {
        window.webContents.openDevTools();
    }
});

app.on("window-all-closed", function() {
    if (process.platform !== "darwin") {
        app.quit();
    }
});