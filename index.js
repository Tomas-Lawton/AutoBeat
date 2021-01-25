// Main process controled by the Max "brain."
const MaxAPI = require("max-api");
const io = require("socket.io")();
const electron = require("electron");
const proc = require("child_process");
const child = proc.spawn(electron, ["./electron"]);

// Node -> Max Function messages
// Can probs change to a single message it works by unpacking dict in Max.
io.on("connection", socket => {
    socket.on("dispatch", ({ data }) => {
        MaxAPI.outlet(data);
    });
    socket.on("savetomidi", ({ data }) => {
        MaxAPI.outlet(data);
    });
    socket.on("changeplayingableton", ({ data }) => {
        MaxAPI.outlet(data);
    });
    socket.on("startClip", ({ data }) => {
        MaxAPI.outlet(data);
    });
    socket.on("readAbleton", ({ data }) => {
        MaxAPI.outlet(data);
    });
});

io.listen(3000, function() {
    console.log('listening on port 3000');
});

// This will ensure that when this parent process is killed in maxpat (either by `node.script stop` or Max is shutdown for some reason),
// it will terminate the child process, the Electron app.
process.on("exit", () => {
    child.kill();
});