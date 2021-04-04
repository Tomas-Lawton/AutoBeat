autowatch = 1;

var api = new LiveAPI(sample_callback, "live_set");

function scale(num, in_min, in_max, out_min, out_max) {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function changeTempo(val) {
    post('\n');
    post('Changing tempo to: ', val, '\n');
    if (api) {
        post('GOT LOM', '\n');
        getLiveInfo(val);
    } else {
        post('no API', '\n');
    }
}

function sample_callback() {
    post("Got Path for Live_Set", '\n');
}

function getLiveInfo(mappedValue) {
    api.set(['tempo'], [mappedValue]);
    post("The result ableton value is: ", api.get(["tempo"]), '\n');
}