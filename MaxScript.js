autowatch = 1;

var api = new LiveAPI(sample_callback, "live_set");
// var api = new LiveAPI(sample_callback, "live_set tracks 0 mixer_device volume");

function scale(num, in_min, in_max, out_min, out_max) {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function changeTempo(val) {
    post('\n');
    post('Changing tempo to: ', val, '\n');
    if (api) {
        post('GOT LOM', '\n');
        // getLiveInfo(scale(val, 20, 999, 20, 999));
        getLiveInfo(val);
    } else {
        post('no API', '\n');
    }
}

function sample_callback() {
    // function sample_callback(args) {
    // post("callback called with arguments:", args, "\n");
    post("Got Path for Live_Set", '\n');

}

function getLiveInfo(mappedValue) {
    // post('In Set Live Function', mappedValue);
    // post('INFO: ', api.info);
    api.set(['tempo'], [mappedValue]);
    // post("\n");
    post("The result ableton value is: ", api.get(["tempo"]), '\n');
}