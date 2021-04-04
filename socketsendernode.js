const path = require('path');
const Max = require('max-api');
const io = require("socket.io");
const server = io.listen(3001);

server.on("connection", (socket) => {
    Max.post('listening on *:3001');
});

Max.addHandler("readData", (input) => {
    // Max.post("Sending from Node.script: ", input);
    server.emit("ClipData", {
        data: input
    });
    Max.post("Data sent");
});

// Max.post(`Loaded the ${path.basename(__filename)} script`);