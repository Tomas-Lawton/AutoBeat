// import io from "socket.io-client";

// const socket = io("http://localhost:3000").connect();

// socket.on("connect", () => {
//     console.log("Connected to Max 8");
// });

// window.addEventListener("DOMContentLoaded", () => {
//     console.log("Hello Electron in the console!");

// currentTempo.registerListener(function(val) {
//     console.log('changed! ', val);

//     const socketData = {
//         'SET_TEMPO': val
//     }

//     socket.emit("dispatch", {
//         data: socketData
//     });

// });

// currentNoteObj.registerListener(function(val) {
//     console.log("Updated Value", val);
//     const notes = val.notesdict
//     const socketData = {
//         'NoteSequence': notes
//     }
//     socket.emit("savetomidi", {
//         data: socketData
//     });
// });
// });