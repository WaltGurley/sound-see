//AUDIO SETUP

//setup and store audio context
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var oscillator = audioCtx.createOscillator();
var gainNodeOsc = audioCtx.createGain();
var audioDataOsc = audioCtx.createAnalyser();

var gainNodeMic = audioCtx.createGain();
var audioDataMic = audioCtx.createAnalyser();

oscillator.connect(gainNodeOsc);
gainNodeOsc.connect(audioCtx.destination);
gainNodeOsc.gain.value = 0;
gainNodeOsc.connect(audioDataOsc);
oscillator.start(0);

//get user media (i.e., microphone)
navigator.mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
   getUserMedia: function(c) {
     return new Promise(function(y, n) {
       (navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia).call(navigator, c, y, n);
     });
   }
} : null);

//check if user media is available and start stream if so
if (!navigator.mediaDevices) {
  alert("getUserMedia() not supported.");
} else {
  var mic = navigator.mediaDevices.getUserMedia({ audio: true });

  mic.then(function(stream) {
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(audioDataMic);
    audioDataMic.connect(gainNodeMic);
    gainNodeMic.connect(audioCtx.destination);

    gainNodeMic.gain.value = 0.2;
  },

  function(err) {
     alert('The following error occured: ' + err);
  });
}

setupOscillatorControls();
setupVis();

//OSCILLATOR CONTROL SETUP
function setupOscillatorControls() {
  //list of oscillator types
  var oscTypes = ["sine", "sawtooth", "square", "triangle"];

  //create oscillator type buttons
  var oscChoose = d3.select(".controls").selectAll("button")
    .data(oscTypes)
    .enter()
    .append("button")
    .attr({
      "class": "col-md-3 btn btn-default",
      "type": "button"
    })
    .text(function(d) { return d; });

  //change oscillator when oscillator button is clicked
  oscChoose.on("click", function(d) {
    var pressedBtn = d3.select(this);

    if (pressedBtn.classed("active")) {
      oscChoose.classed("active", false);
      gainNodeOsc.gain.value = 0;
    } else {
      oscChoose.classed("active", false);
      pressedBtn.classed("active", true);
      gainNodeOsc.gain.value = 0.05;
    }

    oscillator.type = d;
  });
}

//VISUALIZATIONS
function setupVis() {

  //read data from audio (bufferLength default 1024, UInt8Array returns 0-128)
  var bufferLength = audioDataOsc.frequencyBinCount;

  //setup data for sources
  var sourceData = {
    "osc": [new Uint8Array(bufferLength), new Uint8Array(bufferLength)],
    "mic": [new Uint8Array(bufferLength), new Uint8Array(bufferLength)]
  };

  //get time and frequency data from each sourceData
  audioDataOsc.getByteTimeDomainData(sourceData.osc[0]);
  audioDataMic.getByteTimeDomainData(sourceData.mic[0]);
  audioDataOsc.getByteFrequencyData(sourceData.osc[1]);
  audioDataMic.getByteFrequencyData(sourceData.mic[1]);

  //create SVG
  var visContainer = d3.select(".vis-container").append("svg"),
    visWidth = parseInt(visContainer.style("width")),
    visHeight = parseInt(visContainer.style("height"));

  //control frequency when mouse is moved in vis-container
  visContainer.on("mousemove", function () {
    oscillator.frequency.value = d3.mouse(visContainer.node())[0] + 200;
  });

  //d3 function for parsing line data for waveform
  var drawWaveform = d3.svg.line()
    .x(function(d,i) { return i * visWidth / bufferLength; })
    .y(function(d) { return (d - 128) + visHeight / 2; })
    .interpolate("linear");

  //create waveform paths for audio sources
  var waveform = visContainer.selectAll("waveform")
    .data(d3.entries(sourceData))
    .enter()
    .append("path")
    .attr({
      "class": function(d) { return "waveform " + d.key; },
      "d": function(d) { return drawWaveform(d.value[0]); }
    });

  //d3 function for parsing line data for frequenct spectrum
  var drawFreqSpectrum = d3.svg.line()
    .x(function(d,i) { return i * visWidth / bufferLength; })
    .y(function(d) { return visHeight - d; })
    .interpolate("step");

  //create frequency paths for audio sources
  var freqSpectrum = visContainer.selectAll("freq-spec")
    .data(d3.entries(sourceData))
    .enter()
    .append("path")
    .attr({
      "class": function(d) { return "freq-spec " + d.key; },
      "d": function(d) { return drawFreqSpectrum(d.value[1]); }
    });

  //update visualization (get source audio data and redraw paths)
  function updateVisualization() {
    audioDataOsc.getByteTimeDomainData(sourceData.osc[0]);
    audioDataMic.getByteTimeDomainData(sourceData.mic[0]);
    audioDataOsc.getByteFrequencyData(sourceData.osc[1]);
    audioDataMic.getByteFrequencyData(sourceData.mic[1]);

    waveform
      .data(d3.values(sourceData))
      .attr("d", function(d) { return drawWaveform(d[0]); });

    freqSpectrum
      .data(d3.values(sourceData))
      .attr("d", function(d) { return drawFreqSpectrum(d[1]); });
  }

  //run update on an interval
  setInterval(updateVisualization, 50);

  //Resize SVG elements on window resize
  window.onresize = resized;
  function resized() {
    visWidth = parseInt(visContainer.style("width"));
    visHeight = parseInt(visContainer.style("height"));
  }
}
