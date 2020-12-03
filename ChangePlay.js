function changePlay(data) {
    post('CHANGING PLAY', data);

    var MasterPath = new LiveAPI("live_set");
    var isPlayingMaster = MasterPath.get('is_playing');

    post(isPlayingMaster)
    if (isPlayingMaster == 1) {
        MasterPath.set('is_playing', 0);
    } else MasterPath.set('is_playing', 1);
}

function fireClip(data) {
    var trackclipslot = new LiveAPI("live_set view highlighted_clip_slot");
    trackclipslot.call('fire');
}