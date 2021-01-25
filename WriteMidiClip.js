autowatch = 1;
outlets = 2;

var SequenceLength = 8;

function log() {
    for (var i = 0, len = arguments.length; i < len; i++) {
        var message = arguments[i];
        if (message && message.toString) {
            var s = message.toString();
            if (s.indexOf("[object ") >= 0) {
                s = JSON.stringify(message);
            }
            post(s);
        } else if (message === null) {
            post("<null>");
        } else {
            post(message);
        }
    }
    post("\n");
}

log("___________________________________________________");
log("Reload:", new Date);

function setSeqLength(inputdata) {
    log('setting sequence length!');
    log(inputdata);
    SequenceLength = inputdata;
}

function ReadClip() {
    this.trackclipslot = new LiveAPI("live_set view highlighted_clip_slot");
    this.liveObject = new LiveAPI("live_set view highlighted_clip_slot clip");
    var selectedtrack = new LiveAPI("live_set view selected_track");
    this.noteData;
    var isArmed = selectedtrack.get('arm');
    log('ARMING IS: ', isArmed);
    if (isArmed == 1) {
        log('IS ARMED');
        // Check there is a clip
        var YesClip = this.trackclipslot.get('has_clip');
        if (YesClip == true) {
            const startTime = 0;
            var timeRange = this.liveObject.get('length');
            const startPitch = 0;
            const pitchRange = 128;
            var data = this.liveObject.call("get_notes", startTime, startPitch, timeRange, pitchRange);
            this.noteData = data;
            // Set this.noteData to none otherwise.
        } else log('No Clip in clipslot');
    } else log('NOT ARMED');

    ReadClip.prototype.returnData = function() {
        return this.noteData;
    }

}

// For creating new clips and messing with the note data. Use ReadClip to get a clip and export current note data.
function Clip() {
    this.trackclipslot = new LiveAPI("live_set view highlighted_clip_slot");
    var selectedtrack = new LiveAPI("live_set view selected_track");
    var isArmed = selectedtrack.get('arm');
    log('ARMING IS: ', isArmed);
    if (isArmed == 1) {
        log('IS ARMED');
        var YesClip = this.trackclipslot.get('has_clip');
        if (YesClip == true) {
            this.isPlaying = this.trackclipslot.get('is_playing');
            log('RESULT OF IS PLAYING : ', this.isPlaying);
            this.trackclipslot.call('delete_clip');
        }
        this.trackclipslot.call('create_clip', '10');
        this.liveObject = new LiveAPI("live_set view highlighted_clip_slot clip");
        this.liveObject.set('loop_end', SequenceLength / 2);
    } else log('NOT ARMED');
}

Clip.prototype.getLength = function() {
    return this.liveObject.get('length');
}

Clip.prototype._parseNoteData = function(data) {
    var notes = [];
    // data starts with "notes"/count and ends with "done" (which we ignore)
    for (var i = 2, len = data.length - 1; i < len; i += 6) {
        var note = new Note(data[i + 1], data[i + 2], data[i + 3], data[i + 4], data[i + 5]);
        notes.push(note);
    }
    return notes;
}

Clip.prototype.getSelectedNotes = function() {
    var data = this.liveObject.call('get_selected_notes');
    return this._parseNoteData(data);
}

Clip.prototype.getNotes = function(startTime, timeRange, startPitch, pitchRange) {
    if (!startTime) startTime = 0;
    if (!timeRange) timeRange = this.getLength();
    if (!startPitch) startPitch = 0;
    if (!pitchRange) pitchRange = 128;

    var data = this.liveObject.call("get_notes", startTime, startPitch, timeRange, pitchRange);
    return this._parseNoteData(data);
}

Clip.prototype.setNotes = function(notes) {
    var liveObject = this.liveObject;
    liveObject.call("set_notes");
    liveObject.call("notes", notes.length);
    notes.forEach(function(note) {
        liveObject.call("note", note.getPitch(),
            note.getStart(), note.getDuration(),
            note.getVelocity(), note.getMuted());
    });
    liveObject.call("done");
}

//--------------------------------------------------------------------
// Note class

function Note(pitch, start, duration, velocity, muted) {
    this.pitch = pitch;
    this.start = start;
    this.duration = duration;
    this.velocity = velocity;
    this.muted = muted;
}

Note.prototype.toString = function() {
    return '{pitch:' + this.pitch +
        ', start:' + this.start +
        ', duration:' + this.duration +
        ', velocity:' + this.velocity +
        ', muted:' + this.muted + '}';
}

Note.MIN_DURATION = 1 / 128;

Note.prototype.getPitch = function() {
    if (this.pitch < 0) return 0;
    if (this.pitch > 127) return 127;
    return this.pitch;
}

Note.prototype.getStart = function() {
    // we convert to strings with decimals to work around a bug in Max
    // otherwise we get an invalid syntax error when trying to set notes
    if (this.start <= 0) return "0.0";
    return this.start.toFixed(4);
}

Note.prototype.getDuration = function() {
    if (this.duration <= Note.MIN_DURATION) return Note.MIN_DURATION;
    return this.duration.toFixed(4); // workaround similar bug as with getStart()
}

Note.prototype.getVelocity = function() {
    if (this.velocity < 1) return 1;
    if (this.velocity > 127) return 127;
    return this.velocity;
}

Note.prototype.getMuted = function() {
    if (this.muted) return 1;
    return 0;
}

//--------------------------------------------------------------------

function writeMidiClip(noteSequence) {
    post('selected clip');
    var LiveSequence = [];

    post('sequence ', noteSequence, '\n');

    for (key in noteSequence) {
        post(key + ": " + noteSequence[key].pitch, '\n');

        var noteDuration = (noteSequence[key].endTime - noteSequence[key].startTime);
        LiveSequence.push(new Note(noteSequence[key].pitch, noteSequence[key].startTime, noteDuration, noteSequence[key].velocity, 0));
    }

    var clip = new Clip();
    clip.setNotes(LiveSequence);
    if (clip.isPlaying == 1) { clip.trackclipslot.call('fire'); };
}


//--------------------------------------------------------------------

// MAX INPUT

// Read Clip
function readAbleton(data) {
    log('reading current clip');
    // READ CLIP CLASS
    var clip = new ReadClip();
    // No args, deal with in the frontend.
    const currentClip = clip.returnData();
    log(currentClip);
    outlet(1, currentClip);
}

// function dictionary(dictName) {
function dictionary(dictName) {
    post("incoming dict name: " + dictName + "\n");

    var dataDict = new Dict(dictName);
    var data = new Object();

    data = dict_to_jsobj(dataDict);

    // Print All Data with recursion.
    writeMidiClip(data);
    var newDict = jsobj_to_dict(data);
    outlet(0, "dictionary", newDict.name);
}

function dict_to_jsobj(dict) {
    if (dict == null) return null;

    if (typeof dict === 'object') {
        var o = new Object();
        var keys = dict.getkeys();
        if (keys == null || keys.length == 0) return null;

        if (keys instanceof Array) {
            for (var i = 0; i < keys.length; i++) {
                var value = dict.get(keys[i]);

                if (value && (value instanceof Dict)) {
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
}

function jsobj_to_dict(o) {
    var d = new Dict();

    for (var keyIndex in o) {
        var value = o[keyIndex];

        if (!(typeof value === "string" || typeof value === "number")) {
            var isEmpty = true;
            for (var anything in value) {
                isEmpty = false;
                break;
            }

            if (isEmpty) {
                value = new Dict();
            } else {
                var isArray = true;
                for (var valueKeyIndex in value) {
                    if (isNaN(parseInt(valueKeyIndex))) {
                        isArray = false;
                        break;
                    }
                }

                if (!isArray) {
                    value = jsobj_to_dict(value);
                }
            }
        }
        d.set(keyIndex, value);
    }
    return d;
}

// this function will post a JS object's content to the max window
function printobj(obj, name) {
    post("---- object " + name + "----" + "\n");
    printobjrecurse(obj, name);
}

function printobjrecurse(obj, name) {
    if (typeof obj === "undefined") {
        post(name + " : undefined" + "\n");
        return;
    }
    if (obj == null) {
        post(name + " : null" + "\n");
        return;
    }

    if ((typeof obj == "number") || (typeof obj == "string")) {
        post(name + " :" + obj + "\n");
    } else {
        var num = 0;
        for (var k in obj) {
            if (obj[k] && typeof obj[k] == "object") {
                printobjrecurse(obj[k], name + "[" + k + "]");
            } else {
                post(name + "[" + k + "] : " + obj[k] + "\n")
            }
            num++;
        }
        if (num == 0) {
            post(name + " : empty object" + "\n");
        }
    }
}