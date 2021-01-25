import io from "socket.io-client";
import * as Tone from 'tone';

const socket = io("http://localhost:3000").connect();
const socket2 = io("http://localhost:3001").connect();


socket2.on("connect", () => {
    console.log("Listening for Read Data.");
});

socket.on("connect", () => {
    console.log("Connected to Max 8 from Custom");
});

const scale = (num, in_min, in_max, out_min, out_max) => {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const DRUM_CLASSES = [
    'Kick',
    'Snare',
    'Hi-hat closed',
    'Hi-hat open',
    'Tom low',
    'Tom mid',
    'Tom high',
    'Clap',
    'Rim'
];
var TIME_HUMANIZATION = 0.0;
let midiDrums = [36, 38, 42, 46, 41, 43, 45, 49, 51];
let reverseMidiMapping = new Map([
    [36, 0],
    [35, 0],
    [38, 1],
    [27, 1],
    [28, 1],
    [31, 1],
    [32, 1],
    [33, 1],
    [34, 1],
    [37, 1],
    [39, 1],
    [40, 1],
    [56, 1],
    [65, 1],
    [66, 1],
    [75, 1],
    [85, 1],
    [42, 2],
    [44, 2],
    [54, 2],
    [68, 2],
    [69, 2],
    [70, 2],
    [71, 2],
    [73, 2],
    [78, 2],
    [80, 2],
    [46, 3],
    [67, 3],
    [72, 3],
    [74, 3],
    [79, 3],
    [81, 3],
    [45, 4],
    [29, 4],
    [41, 4],
    [61, 4],
    [64, 4],
    [84, 4],
    [48, 5],
    [47, 5],
    [60, 5],
    [63, 5],
    [77, 5],
    [86, 5],
    [87, 5],
    [50, 6],
    [30, 6],
    [43, 6],
    [62, 6],
    [76, 6],
    [83, 6],
    [49, 7],
    [55, 7],
    [57, 7],
    [58, 7],
    [51, 8],
    [52, 8],
    [53, 8],
    [59, 8],
    [82, 8]
]);

let temperature = 1.2;
let rnn = new mm.MusicRNN(
    'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/drum_kit_rnn'
);
let vae = new mm.MusicVAE(
    'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_vae/drums_2bar_hikl_small'
);
let res;

Promise.all([
    rnn.initialize(),
    vae.initialize(),
    res = new Tone.Buffer()

]).then(([InitialisedModels]) => {

    // Drum note sequence
    let state = {
        // PATTERN LENGTH
        patternLength: 16,
        seedLength: 4,
        swing: 0,
        pattern: [
            [0],
            [],
            [2]
        ].concat(_.times(32, i => [])),
        tempo: 120
    };
    let stepEls = [],
        hasBeenStarted = false,
        sequence,
        densityRange = null;


    socket2.on("ClipData", (data) => {
        var items = data.data.split(/[ ,]+/);
        // console.log(items);
        const numNotes = items[1];
        var noteData = [];
        for (let i = 0; i < numNotes; i++) {
            var currentNote = (i * 6) + 2;
            var thisNote = [];
            thisNote.push(items[currentNote + 1]); //midi pitch
            thisNote.push(items[currentNote + 2]); //quantised start time
            noteData.push(thisNote);
        }
        console.log("Note Array: ", noteData);

    });

    document.getElementById("length8").addEventListener("click", function() {
        setPatternLength(8);
        var allcells = document.getElementsByClassName('cell');
        for (var i = 0; i < allcells.length; i++) {
            allcells[i].style.width = '63px';
        }
    });

    document.getElementById("length16").addEventListener("click", function() {
        setPatternLength(16);
        var allcells = document.getElementsByClassName('cell');
        for (var i = 0; i < allcells.length; i++) {
            allcells[i].style.width = '34px';
        }
    });

    document.getElementById("length32").addEventListener("click", function() {
        setPatternLength(32);
        var allcells = document.getElementsByClassName('cell');
        for (var i = 0; i < allcells.length; i++) {
            allcells[i].style.width = '17.5px';
        }
    });

    document.body.onkeyup = function(e) {
        if (e.key === 32 || e.key === ' ') {
            const socketData = {
                'PLAYPAUSE': "PlayPause"
            }
            socket.emit("changeplayingableton", {
                data: socketData
            });
        }
    }


    window.addEventListener("keyup", function(event) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }
        if (event.key == 's') {
            convertPatterntoMidi();
        }
        if (event.key == 'g') {
            GENERATESEQUENCE();
        }
        if (event.key == 'f') {
            FIRECLIP();
        }
        event.preventDefault();
    }, true);

    function generatePattern(seed, length) {
        let seedSeq = toNoteSequence(seed);
        return rnn
            .continueSequence(seedSeq, length, temperature)
            .then(r => seed.concat(fromNoteSequence(r, length)));
    }

    function humanizeTime(start, end) {
        var randomValue = Math.random();
        var startTime = start - TIME_HUMANIZATION / 2 + randomValue * TIME_HUMANIZATION;
        var endTime = end - TIME_HUMANIZATION / 2 + randomValue * TIME_HUMANIZATION;
        return [startTime, endTime];;
    }

    function renderPattern(regenerating = false) {
        let seqEl = document.querySelector('.sequencer .steps');
        while (stepEls.length > state.pattern.length) {
            let { stepEl, gutterEl } = stepEls.pop();
            stepEl.remove();
            if (gutterEl) gutterEl.remove();
        }

        // STEP INDEX STYLING
        for (let stepIdx = 0; stepIdx < state.patternLength; stepIdx++) {
            let step = state.pattern[stepIdx];
            let stepEl, gutterEl, cellEls;
            if (stepEls[stepIdx]) {
                stepEl = stepEls[stepIdx].stepEl;
                gutterEl = stepEls[stepIdx].gutterEl;
                cellEls = stepEls[stepIdx].cellEls;
            } else {
                stepEl = document.createElement('div');
                stepEl.classList.add('step');
                stepEl.dataset.stepIdx = stepIdx;
                seqEl.appendChild(stepEl);
                cellEls = [];
            }

            stepEl.style.flex = stepIdx % 2 === 0 ? state.swing : 1 - state.swing + 0.5;

            if (!gutterEl && stepIdx < state.pattern.length - 1) {
                gutterEl = document.createElement('div');
                // Adds or removes line
                gutterEl.classList.add('gutter');
                seqEl.insertBefore(gutterEl, stepEl.nextSibling);
            } else if (gutterEl && stepIdx >= state.pattern.length) {
                gutterEl.remove();
                gutterEl = null;
            }

            if (gutterEl && stepIdx === state.seedLength - 1) {
                gutterEl.classList.add('seed-marker');
            } else if (gutterEl) {
                gutterEl.classList.remove('seed-marker');
            }
            // CELLS IN EACH STEP
            for (let cellIdx = 0; cellIdx < DRUM_CLASSES.length; cellIdx++) {
                let cellEl;
                if (cellEls[cellIdx]) {
                    cellEl = cellEls[cellIdx];
                } else {
                    cellEl = document.createElement('div');
                    cellEl.classList.add('cell');
                    cellEl.classList.add(_.kebabCase(DRUM_CLASSES[cellIdx]));
                    cellEl.dataset.stepIdx = stepIdx;
                    cellEl.dataset.cellIdx = cellIdx;
                    stepEl.appendChild(cellEl);
                    cellEls[cellIdx] = cellEl;
                }
                if (step.indexOf(cellIdx) >= 0) {
                    cellEl.classList.add('on');
                } else {
                    cellEl.classList.remove('on');
                }
            }
            stepEls[stepIdx] = { stepEl, gutterEl, cellEls };
            let stagger = stepIdx * (300 / (state.patternLength - state.seedLength));
            setTimeout(() => {
                if (stepIdx < state.seedLength) {
                    stepEl.classList.add('seed');
                } else {
                    stepEl.classList.remove('seed');
                    if (regenerating) {
                        stepEl.classList.add('regenerating');
                    } else {
                        stepEl.classList.remove('regenerating');
                    }
                }
            }, stagger);
        }
    }

    function regenerate() {
        // Takes the values in the pattern array up to the point of
        // the dividing bar. Creates Seed.
        let seed = _.take(state.pattern, state.seedLength);
        renderPattern(true);
        return generatePattern(seed, state.patternLength - seed.length).then(
            result => {
                // The entire sequence is updated to the generated continuiation + seed
                state.pattern = result;
                // Update everything else.
                // TURN NEW PATTERN INTO NOTE SEQUENCE AND THEN INTO MIDI
                onPatternUpdated();
                setDensityValue();
                updateDensityRange();
            }
        );
    }

    document.getElementById('sendNotes').addEventListener('click', convertPatterntoMidi);

    function convertPatterntoMidi() {
        // MAX DOES NOT SUPPORT ARRAYS OF DICTIONARIES 
        console.log("EXAMPLE SEQUENCE: \n");
        console.log(state.pattern);
        var NOTESEQUENCE = toNoteSequence(state.pattern);
        var newseq = {};
        var i = 0;
        for (i = 0; i < NOTESEQUENCE.notes.length; i++) {
            newseq[i.toString()] = NOTESEQUENCE.notes[i];
        }
        NOTESEQUENCE.notesdict = newseq;
        delete NOTESEQUENCE.notes;

        // 120 * 2 for quaver and * 2 again because max displace ments of quaver is a semiquaver. (Swing is a ratio between straight and semiquaver)
        // 60 000/tempo for millisecond between crochets at given tempo

        var maxdisplacement = (60 / state.tempo) / 2;
        var scaleddisplacement = scale(state.swing, 0, 1, 0, maxdisplacement);
        var numNotes = Object.keys(NOTESEQUENCE.notesdict).length;
        for (i = 0; i < numNotes; i++) {
            let isSwung = false;
            var testisOdd = ((NOTESEQUENCE.notesdict[i.toString()].startTime.toFixed(1) % 1) != 0);
            if (testisOdd) {
                isSwung = true;
            }
            // SwingRatio
            var start = NOTESEQUENCE.notesdict[i.toString()].startTime;
            var end = NOTESEQUENCE.notesdict[i.toString()].endTime;

            if (isSwung) {
                start += scaleddisplacement;
                end += scaleddisplacement;
            }

            // Drunken
            var newTimes = humanizeTime(start, end);
            NOTESEQUENCE.notesdict[i.toString()].startTime = newTimes[0];
            NOTESEQUENCE.notesdict[i.toString()].endTime = newTimes[1];
        }

        const notes = NOTESEQUENCE.notesdict;
        const socketData = {
            'NoteSequence': notes,
            'SeqLength': state.patternLength
        }
        socket.emit("savetomidi", {
            data: socketData
        });
    }


    function onPatternUpdated() {
        if (sequence) {
            sequence.dispose();
            sequence = null;
        }
        renderPattern();
    }

    // ADDS BEATS TO SEQUENCE 
    function toggleStep(cellEl) {
        if (state.pattern && cellEl.classList.contains('cell')) {
            let stepIdx = +cellEl.dataset.stepIdx;
            let cellIdx = +cellEl.dataset.cellIdx;
            let isOn = cellEl.classList.contains('on');
            if (isOn) {
                _.pull(state.pattern[stepIdx], cellIdx);
                cellEl.classList.remove('on');
            } else {
                state.pattern[stepIdx].push(cellIdx);
                cellEl.classList.add('on');
            }
            setDensityValue();
            densityRange = null;
        }
    }

    function setDensityValue() {
        let totalCellCount = state.pattern.length * 9;
        let activeCellCount = _.sum(state.pattern.map(p => p.length));
        let density = activeCellCount / totalCellCount;
        let roundedDensity = Math.round(density / 0.05) * 0.05;
        document.querySelector('#density').value = roundedDensity;
    }

    function updateDensityRange(
        density = +document.querySelector('#density').value
    ) {
        let stepsDown = density / 0.05;
        let stepsUp = (0.75 - density) / 0.05;
        let stepsBeyond = 0.25 / 0.05;
        let emptySeq = toNoteSequence([]);
        let fullSeq = toNoteSequence(
            _.times(state.pattern.length, () => _.range(9))
        );
        let currentSeq = toNoteSequence(state.pattern);
        densityRange = [];
        let interpsUp = stepsDown > 0 ? vae.interpolate([emptySeq, currentSeq], stepsDown) : Promise.resolve([]);
        let interpsDown = stepsUp > 0 ? vae.interpolate(
            [currentSeq, fullSeq],
            stepsUp + stepsBeyond
        ) : Promise.resolve([]);
        interpsDown.then(interps => {
                for (let noteSeq of interps) {
                    densityRange.push(fromNoteSequence(noteSeq, state.pattern.length));
                }
            }).then(() => densityRange.push(state.pattern))
            .then(() => interpsUp)
            .then(interps => {
                for (let noteSeq of interps) {
                    if (stepsUp-- > 0) {
                        densityRange.push(fromNoteSequence(noteSeq, state.pattern.length));
                    }
                }
            });
    }

    function toNoteSequence(pattern) {
        const NOTESEQUENCE = mm.sequences.quantizeNoteSequence({
                ticksPerQuarter: 220,
                totalTime: pattern.length / 2,
                timeSignatures: [{
                    time: 0,
                    numerator: 4,
                    denominator: 4
                }],
                tempos: [{
                    time: 0,
                    qpm: 120
                }],
                sourceInfo: {
                    encodingType: 3,
                    parser: 6
                },
                notes: _.flatMap(pattern, (step, index) =>
                    step.map(d => ({
                        velocity: 85,
                        instrument: 0,
                        program: 0,
                        isDrum: true,
                        pitch: midiDrums[d],
                        startTime: index * 0.5,
                        endTime: (index + 1) * 0.5
                    }))
                ),
            },
            1
        );
        return NOTESEQUENCE;
    }

    // Turns result of continue into array for sequence.
    function fromNoteSequence({ notes }, patternLength) {
        let res = _.times(patternLength, () => []);
        for (let { pitch, quantizedStartStep }
            of notes) {
            res[quantizedStartStep].push(reverseMidiMapping.get(pitch));
        }
        return res;
    }

    function setSwing(newSwing) {
        state.swing = newSwing;
        renderPattern();
    }

    function setPatternLength(newPatternLength) {
        if (newPatternLength < state.patternLength) {
            state.pattern.length = newPatternLength;
        } else {
            for (let i = state.pattern.length; i < newPatternLength; i++) {
                state.pattern.push([]);
            }
        }
        let lengthRatio = newPatternLength / state.patternLength;
        state.seedLength = Math.max(
            1,
            Math.min(newPatternLength - 1, Math.round(state.seedLength * lengthRatio))
        );
        state.patternLength = newPatternLength;
        onPatternUpdated();
    }

    document.querySelector('.app').addEventListener('click', event => {
        if (event.target.classList.contains('cell')) {
            toggleStep(event.target);
        }
    });

    function GENERATESEQUENCE() {
        document.querySelector('.playpause').classList.remove('pulse');
        regenerate().then(() => {
            if (!hasBeenStarted) {
                Tone.context.resume();
                Tone.Transport.start();
                hasBeenStarted = true;
            }
        });
    }
    document.querySelector('.regenerate').addEventListener('click', event => {
        GENERATESEQUENCE();
    });

    function FIRECLIP() {
        const socketData = {
            'startClip': 'sent'
        }
        socket.emit("startClip", {
            data: socketData
        });
    }
    document.getElementById('fireclip').addEventListener('click', e => {
        FIRECLIP();
    })

    document.querySelector('.playpause').addEventListener('click', event => {
        event.preventDefault();
    });

    let draggingSeedMarker = false;
    document.querySelector('.app').addEventListener('mousedown', evt => {
        let el = evt.target;
        if (
            el.classList.contains('gutter') &&
            el.classList.contains('seed-marker')
        ) {
            draggingSeedMarker = true;
            evt.preventDefault();
        }
    });
    document.querySelector('.app').addEventListener('mouseup', () => {
        draggingSeedMarker = false;
    });
    document.querySelector('.app').addEventListener('mouseover', evt => {
        if (draggingSeedMarker) {
            let el = evt.target;
            while (el) {
                if (el.classList.contains('step')) {
                    let stepIdx = +el.dataset.stepIdx;
                    if (stepIdx > 0) {
                        state.seedLength = stepIdx;
                        renderPattern();
                    }
                    break;
                }
                el = el.parentElement;
            }
        }
    });
    document.querySelector('#density').addEventListener('input', evt => {
        let newDensity = +evt.target.value;
        let patternIndex = Math.round(newDensity / 0.05);
        if (_.isNull(densityRange)) {
            updateDensityRange(newDensity);
        }
        if (
            densityRange &&
            patternIndex >= 0 &&
            patternIndex < densityRange.length - 1
        ) {
            state.pattern = densityRange[patternIndex];
            renderPattern();
        }
    });

    document.querySelector('#drunk').addEventListener('input', evt => {
        let inputVal = +evt.target.value;
        TIME_HUMANIZATION = scale(inputVal, 0, 1, 0.00, 0.13);
    });

    document
        .querySelector('#temperature')
        .addEventListener('change', evt => {
            console.log('new modal temp');
            temperature = +evt.target.value;
        });

    renderPattern();
    setDensityValue();

    document.querySelector('.progress').remove();
    document.querySelector('.app').style.display = null;

    const presets = ['button-1', 'button-2', 'button-3', 'button-4'];
    var customDict = { 'button-5': null, 'button-6': null, 'button-7': null, 'button-8': null };
    var setlastClicked;

    document.querySelectorAll('.sequence-button').forEach(item => {
        item.addEventListener('click', event => {

            console.log('old state ? ', state.pattern);

            const oldPattern = state.pattern;
            const oldLength = state.patternLength;
            const oldSeedLength = state.seedLength;
            const stateData = [oldPattern, oldLength, oldSeedLength];

            // First make a copy before updating
            var oldData = setlastClicked;

            var copy = {};
            Object.assign(copy, customDict);

            if (copy.hasOwnProperty(oldData)) {
                console.log('setting');
                copy[oldData.toString()] = stateData;
            }

            customDict = copy;
            const SelectedID = event.target.id;
            setlastClicked = SelectedID;
            if (customDict.hasOwnProperty(SelectedID)) {
                console.log('got key');
                if (customDict[SelectedID] != null) {
                    console.log('updating current pattern');
                    state.patternLength = customDict[SelectedID][1];
                    state.pattern = customDict[SelectedID][0];
                    state.seedLength = customDict[SelectedID][2];
                } else { console.log('no saved content yet'); }
            } else { console.log('not a custom preset'); }

            document.querySelectorAll('.sequence-button').forEach(item => {
                if (item.id === event.target.id) {

                    if (presets.indexOf(item.id) != -1) {
                        item.src = "img/pad-on.png";
                        console.log('preset');
                        item.classList.remove('custom-button');
                        item.classList.add('magenta-button');
                    } else {
                        item.src = "img/pad-custom.svg";
                        console.log('custom');
                        item.classList.add('custom-button');
                        item.classList.remove('magenta-button');
                    }

                    if (item.id == 'button-1') {
                        // Reggaeton Seed
                        state.seedLength = 7;
                        state.pattern = [
                            [0, 2],
                            [2],
                            [2],
                            [1],
                            [0, 2],
                            [2],
                            [1, 2]
                        ];

                    } else if (item.id == 'button-2') {
                        // Reggaeton Seed
                        state.seedLength = 4;
                        state.pattern = [
                            [0],
                            [2],
                            [1, 0],
                            [2]
                        ];
                    } else if (item.id == 'button-3') {
                        // Reggaeton Seed
                        state.seedLength = 8;
                        state.pattern = [
                            [0, 2],
                            [],
                            [2],
                            [1, 2],
                            [],
                            [0, 2],
                            [1]
                        ];
                    } else if (item.id == 'button-4') {
                        // Reggaeton Seed
                        state.seedLength = 7;
                        state.pattern = [
                            [0, 7],
                            [6],
                            [3, 4],
                            [7, 4],
                            [1, 0],
                            [7, 8, 6],
                            [4]
                        ];

                    }
                    setPatternLength(state.patternLength);
                    onPatternUpdated();

                } else {
                    item.classList.remove('magenta-button');
                    item.classList.remove('custom-button');
                    item.src = "img/pad-off.png";
                }
            })
        })
    });

    document.querySelectorAll('.contain-length-buttons').forEach(item => {
        item.addEventListener('click', event => {
            document.querySelectorAll('.contain-length-buttons').forEach(item => {
                if (item.id === event.target.id) {
                    console.log('adding');
                    item.classList.add('lengthButtonActive');
                } else item.classList.remove('lengthButtonActive');
            })
        })
    });


    document.querySelector('#button-clear').addEventListener("click", function(event) {
        clearSequence();
    });

    document.querySelector('#button-read').addEventListener("click", function(event) {
        readAbletonClip();
        console.log('clicked read');
    });

    function readAbletonClip() {
        const socketData = {
            'readAbleton': 'emptymessage'
        }
        socket.emit("readAbleton", {
            data: socketData
        });
    }

    function clearSequence() {
        state.seed = [
            [],
            [],
            [],
            []
        ];
        state.pattern = [];

        setPatternLength(state.patternLength);
        onPatternUpdated();
    }

    ///////////////////////////////////////////////

    // Drag master inputs

    var max = 999;
    var TempoDefault = 120;
    var numInput = document.getElementById('frame-num-input');
    numInput.value = TempoDefault;
    numInput.addEventListener("mousedown", mousedownNum);

    var max2 = 999;
    var SwingDefault = 0;
    var swingInput = document.getElementById('frame-num-input2');
    swingInput.value = SwingDefault;
    swingInput.addEventListener("mousedown", mousedownSwing);

    var mouseNumStartPosition = {};
    var numStart;
    var swingStart;


    function mousedownNum(e) {
        mouseNumStartPosition.y = e.pageY;
        numStart = parseInt(numInput.value);
        numStart = isNaN(numStart) ? 0 : numStart;
        console.log(numStart);
        window.addEventListener("mousemove", mousemoveNum);
        window.addEventListener("mouseup", mouseupNum);
    }

    function mousemoveNum(e) {
        var diff = mouseNumStartPosition.y - e.pageY;
        var newLeft = numStart + diff;
        newLeft = newLeft > max ? max : newLeft;
        newLeft = newLeft < 0 ? 0 : newLeft;
        numInput.value = newLeft;
        numInputChange(numInput.value);
    }

    function mouseupNum(e) {
        window.removeEventListener("mousemove", mousemoveNum);
        window.removeEventListener("mouseup", mouseupNum);
    }

    function numInputChange(val) {
        console.log('got value', val);
        Tone.Transport.bpm.value = val;
        state.tempo = val;
        const socketData = {
            'SET_TEMPO': val
        }

        socket.emit("dispatch", {
            data: socketData
        });
    }

    function mousedownSwing(e) {
        mouseNumStartPosition.y = e.pageY;
        swingStart = parseInt(swingInput.value);
        swingStart = isNaN(swingStart) ? 0 : swingStart;
        console.log(swingStart);

        // add listeners for mousemove, mouseup
        window.addEventListener("mousemove", mousemoveSwing);
        window.addEventListener("mouseup", mouseupSwing);
    }

    function mousemoveSwing(e) {
        var diff = (mouseNumStartPosition.y - e.pageY) / 10;
        var maxDiff = 10 - swingStart;

        if (diff > maxDiff) { diff = maxDiff; }
        var newLeft = (swingStart + diff).toFixed(1);
        newLeft = newLeft > max2 ? max2 : newLeft;
        newLeft = newLeft < 0 ? 0 : newLeft;
        swingInput.value = newLeft;
        SwingInputChange(swingInput.value);
    }

    function mouseupSwing(e) {
        window.removeEventListener("mousemove", mousemoveSwing);
        window.removeEventListener("mouseup", mouseupSwing);
    }

    function SwingInputChange(val) {
        var scaled = scale(val, 0, 10, 0, 1);
        setSwing(scaled);
    }
})