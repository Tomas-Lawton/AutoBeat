import io from "socket.io-client";

const socket = io("http://localhost:3000").connect();

socket.on("connect", () => {
    console.log("Connected to Max 8 from Custom");
});

// import WebMidi from 'webmidi';
import * as Tone from 'tone';


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

var sampleBaseUrl = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699';

var reverb = new Tone.Convolver(
    `${sampleBaseUrl}/small-drum-room.wav`
).toMaster();
// reverb.wet.value = 0.35;

let snarePanner = new Tone.Panner().connect(reverb);
new Tone.LFO(0.13, -0.25, 0.25).connect(snarePanner.pan).start();

let drumKit = [
    new Tone.Players({
        high: `${sampleBaseUrl}/808-kick-vh.mp3`,
        med: `${sampleBaseUrl}/808-kick-vm.mp3`,
        low: `${sampleBaseUrl}/808-kick-vl.mp3`
    }).toMaster(),
    new Tone.Players({
        high: `${sampleBaseUrl}/flares-snare-vh.mp3`,
        med: `${sampleBaseUrl}/flares-snare-vm.mp3`,
        low: `${sampleBaseUrl}/flares-snare-vl.mp3`
    }).connect(snarePanner),
    new Tone.Players({
        high: `${sampleBaseUrl}/808-hihat-vh.mp3`,
        med: `${sampleBaseUrl}/808-hihat-vm.mp3`,
        low: `${sampleBaseUrl}/808-hihat-vl.mp3`
    }).connect(new Tone.Panner(-0.5).connect(reverb)),
    new Tone.Players({
        high: `${sampleBaseUrl}/808-hihat-open-vh.mp3`,
        med: `${sampleBaseUrl}/808-hihat-open-vm.mp3`,
        low: `${sampleBaseUrl}/808-hihat-open-vl.mp3`
    }).connect(new Tone.Panner(-0.5).connect(reverb)),
    new Tone.Players({
        high: `${sampleBaseUrl}/slamdam-tom-low-vh.mp3`,
        med: `${sampleBaseUrl}/slamdam-tom-low-vm.mp3`,
        low: `${sampleBaseUrl}/slamdam-tom-low-vl.mp3`
    }).connect(new Tone.Panner(-0.4).connect(reverb)),
    new Tone.Players({
        high: `${sampleBaseUrl}/slamdam-tom-mid-vh.mp3`,
        med: `${sampleBaseUrl}/slamdam-tom-mid-vm.mp3`,
        low: `${sampleBaseUrl}/slamdam-tom-mid-vl.mp3`
    }).connect(reverb),
    new Tone.Players({
        high: `${sampleBaseUrl}/slamdam-tom-high-vh.mp3`,
        med: `${sampleBaseUrl}/slamdam-tom-high-vm.mp3`,
        low: `${sampleBaseUrl}/slamdam-tom-high-vl.mp3`
    }).connect(new Tone.Panner(0.4).connect(reverb)),
    new Tone.Players({
        high: `${sampleBaseUrl}/909-clap-vh.mp3`,
        med: `${sampleBaseUrl}/909-clap-vm.mp3`,
        low: `${sampleBaseUrl}/909-clap-vl.mp3`
    }).connect(new Tone.Panner(0.5).connect(reverb)),
    new Tone.Players({
        high: `${sampleBaseUrl}/909-rim-vh.wav`,
        med: `${sampleBaseUrl}/909-rim-vm.wav`,
        low: `${sampleBaseUrl}/909-rim-vl.wav`
    }).connect(new Tone.Panner(0.5).connect(reverb))
];


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

// let outputs = {
//     internal: {
//         play: (drumIdx, velocity, time) => {
//             drumKit[drumIdx].get(velocity).start(time);
//         }
//     }
// };

let rnn = new mm.MusicRNN(
    'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/drum_kit_rnn'
);
let vae = new mm.MusicVAE(
    'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_vae/drums_2bar_hikl_small'
);

// EVERYTHING HAPPENS HERE AFTER THE MODELS ARE LOADED.
let res;

Promise.all([
    rnn.initialize(),
    vae.initialize(),
    res = new Tone.Buffer()

]).then(([vars]) => {

    // THIS IS THE OBJECT THAT KEEPS TRACK OF THE GROOVE
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
        densityRange = null,
        activeOutput = 'internal';

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
        // width: 35.5px;
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
            console.log('pressed S key');
        }

        if (event.key == 'g') {
            GENERATESEQUENCE();
            console.log('pressed g key');
        }

        if (event.key == 'f') {
            FIRECLIP();
            console.log('pressed f key');
        }

        event.preventDefault();

    }, true);

    // Length is how much more to generate
    // Seed is the array of values up to the bar
    function generatePattern(seed, length) {
        // Convert from array into note sequence for magenta
        let seedSeq = toNoteSequence(seed);
        console.log('input pattern:', seed);
        console.log('seedSeq: ', seedSeq);
        // In future 'update' pattern from midi clip.
        // continues to give the next part of sequence
        // then concatonates the continued to the seed array
        // must convert from noteSequence back to array 
        // to write to midi this note sequence should be converted to midi.

        // return the final rnn sequence as array of notes

        console.log('current temp, ', temperature);
        return rnn
            .continueSequence(seedSeq, length, temperature)
            .then(r => seed.concat(fromNoteSequence(r, length)));
    }

    function getStepVelocity(step) {
        if (step % 4 === 0) {
            return 'high';
        } else if (step % 2 === 0) {
            return 'med';
        } else {
            return 'low';
        }
    }

    function humanizeTime(start, end) {
        var randomValue = Math.random();
        var startTime = start - TIME_HUMANIZATION / 2 + randomValue * TIME_HUMANIZATION;
        var endTime = end - TIME_HUMANIZATION / 2 + randomValue * TIME_HUMANIZATION;
        return [startTime, endTime];;
    }

    function playPattern() {
        // sequence = new Tone.Sequence(
        //     (time, { drums, stepIdx }) => {
        //         let isSwung = stepIdx % 2 !== 0;
        //         if (isSwung) {
        //             time += (state.swing - 0.5) * Tone.Time('8n').toSeconds();
        //         }
        //         let velocity = getStepVelocity(stepIdx);
        //         drums.forEach(d => {
        //             let humanizedTime = stepIdx === 0 ? time : humanizeTime(time);
        //             // outputs[activeOutput].play(d, velocity, time);
        //             visualizePlay(humanizedTime, stepIdx, d);
        //         });
        //     },
        //     state.pattern.map((drums, stepIdx) => ({ drums, stepIdx })),
        //     '16n'
        // ).start();
    }

    function visualizePlay(time, stepIdx, drumIdx) {
        Tone.Draw.schedule(() => {
            if (!stepEls[stepIdx]) return;
            let animTime = Tone.Time('2n').toMilliseconds();
            let cellEl = stepEls[stepIdx].cellEls[drumIdx];
            if (cellEl.classList.contains('on')) {
                let baseColor = stepIdx < state.seedLength ? '#e91e63' : '#64b5f6';
                cellEl.animate(
                    [{
                            transform: 'translateZ(-100px)',
                            backgroundColor: '#fad1df'
                        },
                        {
                            transform: 'translateZ(50px)',
                            offset: 0.7
                        },
                        { transform: 'translateZ(0)', backgroundColor: baseColor }
                    ], { duration: animTime, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
                );
            }
        }, time);
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

                // document.getElementById('test-gutter').classList.add('gutter');
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

        // setTimeout(repositionRegenerateButton, 0);
    }

    function repositionRegenerateButton() {
        // let regenButton = document.querySelector('.regenerate');
        // let sequencerEl = document.querySelector('.sequencer');
        // let seedMarkerEl = document.querySelector('.gutter.seed-marker');
        // let regenLeft =
        //     sequencerEl.offsetLeft +
        //     seedMarkerEl.offsetLeft +
        //     seedMarkerEl.offsetWidth / 2 -
        //     regenButton.offsetWidth / 2;
        // let regenTop =
        //     sequencerEl.offsetTop +
        //     seedMarkerEl.offsetTop +
        //     seedMarkerEl.offsetHeight / 2 -
        //     regenButton.offsetHeight / 2;
        // regenButton.style.left = `${regenLeft}px`;
        // regenButton.style.top = `${regenTop}px`;
        // regenButton.style.visibility = 'visible';
    }

    function regenerate() {

        // Takes the values in the pattern array up to the point of
        // the dividing bar. Creates Seed.
        let seed = _.take(state.pattern, state.seedLength);
        renderPattern(true);

        //Seed length = spaces up to bar
        // Pattern length = total length
        //Seed is the values up to that bar




        // Second arg is how much to generate?        
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
        // var isDict = false;

        console.log('current array pattern ', state.pattern);
        // MAX DOES NOT SUPPORT ARRAYS OF DICTIONARIES 
        var NOTESEQUENCE = toNoteSequence(state.pattern);

        // if (!isDict) {

        var newseq = {};
        var i = 0;

        for (i = 0; i < NOTESEQUENCE.notes.length; i++) {
            newseq[i.toString()] = NOTESEQUENCE.notes[i];
        }

        console.log(newseq);
        NOTESEQUENCE.notesdict = newseq;
        delete NOTESEQUENCE.notes;

        // isDict = true;

        console.log('complete Note Sequence', NOTESEQUENCE);

        // 120 * 2 for quaver and * 2 again because max displace ments of quaver is a semiquaver. (Swing is a ratio between straight and semiquaver)
        // 60 000/tempo for millisecond between crochets at given tempo

        var maxdisplacement = (60 / state.tempo) / 2;
        console.log('max displace', maxdisplacement);

        var scaleddisplacement = scale(state.swing, 0, 1, 0, maxdisplacement);
        console.log('displace', scaleddisplacement);

        var numNotes = Object.keys(NOTESEQUENCE.notesdict).length;
        for (i = 0; i < numNotes; i++) {
            let isSwung = false;

            console.log('STARTTIME \n', NOTESEQUENCE.notesdict[i.toString()].startTime);

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
            // console.log('drunk', newTimes);
            NOTESEQUENCE.notesdict[i.toString()].startTime = newTimes[0];
            NOTESEQUENCE.notesdict[i.toString()].endTime = newTimes[1];
        }

        console.log("Updated Value", NOTESEQUENCE);
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
            // if (sequence) {
            //     sequence.at(stepIdx, { stepIdx, drums: state.pattern[stepIdx] });
            // }
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
                //     notesdict: _.flatMap(pattern, (step, index) =>
                //         step.map(d => ({
                //             velocity: 85,
                //             instrument: 0,
                //             program: 0,
                //             isDrum: true,
                //             pitch: midiDrums[d],
                //             startTime: index * 0.5,
                //             endTime: (index + 1) * 0.5
                //         }))
                // )
            },
            1
        );
        // console.log('NS ', NOTESEQUENCE);
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
        if (Tone.Transport.state === 'started') {
            playPattern();
        }
    }

    function updatePlayPauseIcons() {
        if (Tone.Transport.state === 'started') {
            document.querySelector('.playpause .pause-icon').style.display = null;
            document.querySelector('.playpause .play-icon').style.display = 'none';
        } else {
            document.querySelector('.playpause .play-icon').style.display = null;
            document.querySelector('.playpause .pause-icon').style.display = 'none';
        }
    }

    function encodeState() {
        return Object.keys(state)
            .reduce((a, k) => {
                a.push(k + '=' + JSON.stringify(state[k]));
                return a;
            }, [])
            .join('&');
    }

    // clearSequence();


    // WebMidi.enable(err => {
    //     if (err) {
    //         console.error('WebMidi could not be enabled', err);
    //         return;
    //     }
    //     // document.querySelector('.webmidi-enabled').style.display = 'block';
    //     let outputSelector = document.querySelector('.midi-output');

    //     function onOutputsChange() {
    //         while (outputSelector.firstChild) {
    //             outputSelector.firstChild.remove();
    //         }
    //         let internalOption = document.createElement('option');
    //         internalOption.value = 'internal';
    //         internalOption.innerText = 'Internal drumkit';
    //         outputSelector.appendChild(internalOption);
    //         for (let output of WebMidi.outputs) {
    //             let option = document.createElement('option');
    //             option.value = output.id;
    //             option.innerText = output.name;
    //             outputSelector.appendChild(option);
    //         }
    //         onActiveOutputChange('internal');
    //     }

    //     function onActiveOutputChange(id) {
    //         if (activeOutput !== 'internal') {
    //             outputs[activeOutput] = null;
    //         }
    //         activeOutput = id;
    //         if (activeOutput !== 'internal') {
    //             let output = WebMidi.getOutputById(id);
    //             outputs[id] = {
    //                 play: (drumIdx, velo, time) => {
    //                     let delay = (time - Tone.now()) * 1000;
    //                     let duration = Tone.Time('16n').toMilliseconds();
    //                     let velocity = { high: 1, med: 0.75, low: 0.5 };
    //                     output.playNote(midiDrums[drumIdx], 1, {
    //                         time: delay > 0 ? `+${delay}` : WebMidi.now,
    //                         velocity,
    //                         duration
    //                     });
    //                 }
    //             };
    //         }
    //         for (let option of Array.from(outputSelector.children)) {
    //             option.selected = option.value === id;
    //         }
    //     }

    //     onOutputsChange();
    //     WebMidi.addListener('connected', onOutputsChange);
    //     WebMidi.addListener('disconnected', onOutputsChange);
    //     // $(outputSelector)

    //     // outputSelector
    //     //     .addEventListener('change', evt => onActiveOutputChange(evt.target.value))
    //     //     .material_select();
    // });



    document.querySelector('.app').addEventListener('click', event => {
        if (event.target.classList.contains('cell')) {
            toggleStep(event.target);
        }
    });

    function GENERATESEQUENCE() {
        // event.preventDefault();
        // event.currentTarget.classList.remove('pulse');
        document.querySelector('.playpause').classList.remove('pulse');
        regenerate().then(() => {
            if (!hasBeenStarted) {
                Tone.context.resume();
                Tone.Transport.start();
                // updatePlayPauseIcons();
                hasBeenStarted = true;
            }
            if (Tone.Transport.state === 'started') {
                setTimeout(() => playPattern(), 0);
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
        console.log("HIT PLAY");
        // document.querySelector('.playpause').classList.remove('pulse');
        // if (Tone.Transport.state !== 'started') {
        //     Tone.context.resume();
        //     Tone.Transport.start();
        //     playPattern();
        //     // updatePlayPauseIcons();
        //     hasBeenStarted = true;
        // } else {
        //     if (sequence) {
        //         sequence.dispose();
        //         sequence = null;
        //     }
        //     Tone.Transport.pause();
        //     // updatePlayPauseIcons();
        // }
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
            // if (sequence) {
            //     state.pattern.forEach((drums, stepIdx) =>
            //         sequence.at(stepIdx, { stepIdx, drums })
            //     );
            // }
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

    // window.addEventListener('resize', repositionRegenerateButton);

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
            // console.log(dict, copy);

            console.log('Storage Before: ', copy);

            if (copy.hasOwnProperty(oldData)) {
                console.log('setting');
                copy[oldData.toString()] = stateData;
            }

            customDict = copy;

            console.log('The old key was: ', oldData);
            console.log('Storage After: ', customDict);

            const SelectedID = event.target.id;
            setlastClicked = SelectedID;

            console.log('the new key is: ', SelectedID);

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
        console.log('clicked clear');

    });

    function clearSequence() {
        // toNoteSequence([])
        // let emptysequence = []
        // for (let i = 0; i < state.patternLength; i++) {
        //     emptysequence.push([''])
        // }
        state.seed = [
            [],
            [],
            [],
            []
        ];
        state.pattern = [];

        setPatternLength(state.patternLength);
        // state.patternLength = state.patternLength;
        // setDensityValue();
        onPatternUpdated();


        // state.patternLength = 0;


        // renderPattern();
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

        // add listeners for mousemove, mouseup
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



        // console.log("GOT INFO ", event);
        // if (isNaN(parseInt(numInput.value))) {
        //     numInput.value = 0;
        // }
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
        console.log('got SWING', val);

        var scaled = scale(val, 0, 10, 0, 1);
        setSwing(scaled);


        // Tone.Transport.bpm.value = val;
        // state.tempo = val;
        // currentTempo.a = val;
        // console.log("GOT INFO ", event);
        // if (isNaN(parseInt(numInput.value))) {
        //     numInput.value = 0;
        // }
    }








})