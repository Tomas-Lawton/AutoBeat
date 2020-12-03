// This file is the entrypoint for the Max patch.
// When this file is executed via `node.script start` in the Max patch,
// this program will launch an Electron app as a child process, and connect to it via socket.io.


const MaxAPI = require("max-api");
const io = require("socket.io")();
const electron = require("electron");
const proc = require("child_process");
const child = proc.spawn(electron, ["./electron"]);
// const MagentaCore = require('@magenta/music/node/core');
// const fs = require('fs');

// var dataDict = new Dict();

io.on("connection", socket => {

    console.log("Socket is connected with Electron App");

    socket.on("dispatch", ({ data }) => {
        console.log("dispatch: ", data);
        // This must be reloaded in patcher to clear old data
        MaxAPI.outlet(data);
    });


    socket.on("savetomidi", ({ data }) => {
        console.log("savetomidi: ", data);
        // This must be reloaded in patcher to clear old data

        // SAVE MIDI FILE FROM PATTERN
        //    savePattern(data);
        // const NoteSequence = data['NoteSequence'];
        MaxAPI.outlet(data);
    });


    socket.on("changeplayingableton", ({ data }) => {
        console.log("changing play/pause: ", data);
        MaxAPI.outlet(data);
    });

    socket.on("startClip", ({ data }) => {
        console.log("changing play/pause: ", data);
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






// // example
// function dictionary(dictName) {
//     post("incoming dict name: " + dictName + "\n");

//     var dataDict = new Dict(dictName);
//     var data = new Object();


//     data = dict_to_jsobj(dataDict);
//     post('DICT NAME: ', dictName, '\n');
//     post('--------\n');
//     post('THE DICT', data, '\n');
//     post('--------\n');

//     printobj(data, dictName);

//     savePattern(data);
//     // var newDict = jsobj_to_dict(data);

//     // outlet(0, "dictionary", newDict.name);
// }

// returns or includes null if there is a dict without containing data.
function dict_to_jsobj(dict) {
    if (dict == null) return null;
    var o = new Object();
    var keys = dict.getkeys();
    if (keys == null || keys.length == 0) return null;

    if (keys instanceof Array) {
        for (var i = 0; i < keys.length; i++) {
            var value = dict.get(keys[i]);

            if (value && value instanceof Dict) {
                value = dict_to_jsobj(value);
            }
            o[keys[i]] = value;
        }
    } else {
        var value = dict.get(keys);

        if (value && value instanceof Dict) {
            value = dict_to_jsobj(value);
        }
        o[keys] = value;
    }

    return o;
}

// // this function will post a JS object's content to the max window
// function printobj(obj, name) {
//     post("---- object " + name + "----" + "\n");
//     printobjrecurse(obj, name);
// }

// function printobjrecurse(obj, name) {
//     if (typeof obj === "undefined") {
//         post(name + " : undefined" + "\n");
//         return;
//     }
//     if (obj == null) {
//         post(name + " : null" + "\n");
//         return;
//     }

//     if ((typeof obj == "number") || (typeof obj == "string")) {
//         post(name + " :" + obj + "\n");
//     } else {
//         var num = 0;
//         for (var k in obj) {
//             if (obj[k] && typeof obj[k] == "object") {
//                 printobjrecurse(obj[k], name + "[" + k + "]");
//             } else {
//                 post(name + "[" + k + "] : " + obj[k] + "\n")
//             }
//             num++;
//         }
//         if (num == 0) {
//             post(name + " : empty object" + "\n");
//         }
//     }
// }



// const FILE_PREFIX = '/Users/tom/Music/Audio Music Apps/Sounds/User Library/Patches/AI ABLETON/n4m-electron-boilerplate/electron/src/midifiles';

function createPathName() {
    // const index = Math.floor(Math.random() * 1000000);

    return '/Users/tom/Music/Audio Music Apps/Sounds/User Library/Patches/AI ABLETON copy 3/n4m-electron-boilerplate/electron/src/midifiles/filetest.mid';
    // return `${FILE_PREFIX}/${index}.mid`;
}

// function createFileName() {
//     // const index = Math.floor(Math.random() * 1000000);
//     return 'filetest.mid';
//     // return `${index}.mid`;
// }


function savePattern(GeneratedNoteSeq) {
    var outputmessage1 = '1'
    MaxAPI.outlet(outputmessage1);
    const NoteSequence = GeneratedNoteSeq['NOTESEQUENCE'];
    // MaxAPI.outlet(NoteSequence);
    MaxAPI.outlet(NoteSequence);

    // // post('in function');
    // var path;
    // if (GeneratedNoteSeq) {
    //     path = createPathName();
    //     var outputmessage2 = '2'
    //     MaxAPI.outlet(outputmessage2);
    // } else {
    //     var outputmessage3 = '3'
    //     MaxAPI.outlet(outputmessage3);
    //     MaxAPI.outlet('BROKEN');
    //     // post('missing pattern');
    // }

    var outputmessage4 = '4'
    MaxAPI.outlet(outputmessage4);
    // Sequence Is Already QUANTISED
    // post('got path');



    try {
        var quantizedSeq = MagentaCore.sequences.quantizeNoteSequence(NoteSequence, 1);
        var outputmessageQ = 'quantised'
        MaxAPI.outlet(outputmessageQ);
        MaxAPI.outlet(quantizedSeq);
    } catch (err) {
        if (err) {
            var errormessage = 'something went wrong with quantization';
            MaxAPI.outlet(errormessage);
            MaxAPI.outlet(err);
        }
    }


    try {
        var midiData = MagentaCore.sequenceProtoToMidi(quantizedSeq);
        MaxAPI.outlet(midiData);
    } catch (err) {
        if (err) {
            var errormessage = 'something went wrong';
            MaxAPI.outlet(errormessage);
            MaxAPI.outlet(err);
        }
    }

    fs.writeFile("test.mid", midiData, function(err) {
        if (err) {
            var errormessage = 'something went wrong';
            MaxAPI.outlet(errormessage);
            MaxAPI.outlet(err);
            return
        }
        var finalMessage = "The file was saved!"
        MaxAPI.outlet(finalMessage);
    });











    var outputmessagedone = 'done'
    MaxAPI.outlet(outputmessagedone);

    // post('quantised');

    // var outputmessage1 = '5'
    // MaxAPI.outlet(outputmessage5);
    // pass funtion instead of string
    // window.saveAs(
    //     new File([window.MagentaCore.sequenceProtoToMidi(quantized)],
    //         'filetest.mid'
    //     )
    // );
}