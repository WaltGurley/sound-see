//AUDIO SETUP
//setup and store audio context if Web Audio API available
try {
  var windowAudioContext = window.AudioContext || window.webkitAudioContext;
  var audioCtx = new windowAudioContext();
} catch (e) {
  alert("Web Audio API not supported");
}

//get audio data (not audio) from audioboom with the ivizsci tag
// REF: https://github.com/audioboom/api/blob/master/sections/audio_clips.md
var recordings;
d3.json("http://api.audioboom.com/tag/ivizsci/audio_clips",
  function(error, audioClips) {
    recordings = audioClips.body.audio_clips;

    var audio;
    d3.xhr(recordings[0].urls.high_mp3)
      .responseType("arraybuffer")
      .get(function(error, data) {
        audio = data;
      });

    // d3.select(".load-button").on("click", loadSound(recordings[0].urls.high_mp3));

    d3.select(".play-button").on("click", function() {

    });

});
