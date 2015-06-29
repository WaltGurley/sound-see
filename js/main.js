//AUDIO SETUP
//setup and store audio context if Web Audio API available
try {
  var windowAudioContext = window.AudioContext || window.webkitAudioContext;
  var audioCtx = new windowAudioContext();
} catch (e) {
  alert("Web Audio API not supported");
}

//setup oscillator
var oscillator = audioCtx.createOscillator();
var gainNodeOsc = audioCtx.createGain();
var audioDataOsc = audioCtx.createAnalyser();

oscillator.connect(gainNodeOsc);
gainNodeOsc.connect(audioCtx.destination);
gainNodeOsc.connect(audioDataOsc);
var firstInteraction = true;

//get user media (i.e., microphone)
navigator.mediaDevices = navigator.mediaDevices ||
  ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
   getUserMedia: function(c) {
     return new Promise(function(y, n) {
       (navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia).call(navigator, c, y, n);
     });
   }
} : null);

//check if user media is available and start mic stream if so
if (!navigator.mediaDevices) {
  alert("getUserMedia() not supported.\nCannot use microphone");
} else {

  //setup microphone
  var mic = navigator.mediaDevices.getUserMedia({ audio: true });
  var gainNodeMic = audioCtx.createGain();
  var audioDataMic = audioCtx.createAnalyser();

  mic.then(function(stream) {
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(gainNodeMic);
    gainNodeMic.connect(audioDataMic);
    audioDataMic.connect(audioCtx.destination);

    gainNodeMic.gain.value = 0;

    //setup microphone controls if mic available
    setupMicControls();
  },

  function(err) {
     alert('The following error occured: ' + err.name);
  });
}

//always setup oscillator and visualization
setupOscillatorControls();
setupVis();

//OSCILLATOR CONTROL SETUP
function setupOscillatorControls() {

  //initial oscillator output parameters
  var volumeOsc = 0.1,
    mutedOsc = false,
    freqOsc = 440;

  setupOscillatorButtons();
  setupOscillatorSliders();

  //setup buttons to control waveform type (sine, sawtooth, triangle, square)
  function setupOscillatorButtons() {
    //list of oscillator types
    var oscTypes = ["sine", "sawtooth", "square", "triangle"];

    //create oscillator type buttons
    var oscChoose = d3.select(".osc-btns").selectAll("button")
      .data(oscTypes)
      .enter()
      .append("button")
      .attr({
        "class": "col-xs-3 col-md-6 btn btn-default",
        "type": "button"
      })
      .text(function(d) { return d; });

    //change oscillator when oscillator button is clicked
    oscChoose.on("click", function(d) {
      var pressedBtn = d3.select(this);

      //start oscillator on first click of button (needed for iOS)
      if (firstInteraction) {
        oscillator.start(0);
        firstInteraction = false;
      }

      if (pressedBtn.classed("active")) {
        oscChoose.classed("active", false);

        mutedOsc = true;
        gainNodeOsc.gain.value = 0;
      } else {
        oscChoose.classed("active", false);
        pressedBtn.classed("active", true);

        mutedOsc = false;
        gainNodeOsc.gain.value = volumeOsc;
      }

      oscillator.type = d;
    });
  }

  function setupOscillatorSliders() {
    //options for controlling the oscillator
    var oscOptions = {
      "volume": {
        "class": "osc-volume-slider",
        "min": 0,
        "max": 1,
        "step": 0.05,
        "value": volumeOsc
      },
      "frequency": {
        "class": "osc-freq-slider",
        "min": 20,
        "max": 20000,
        "step": 10,
        "value": freqOsc
      }
    };

    //add sliders to window with control options
    var oscSliders = d3.selectAll(".osc-slider").append("input")
      .data(d3.values(oscOptions))
      .attr({
        "class": function(d) { return d.class; },
        "type": "range",
        "min": function(d) { return d.min; },
        "max": function(d) { return d.max; },
        "step": function(d) { return d.step; },
        "value": function(d) { return d.value; }
      });

    //change frequency or volume on slider value change
    oscSliders.on("input", function(d) {
      if (d.class == "osc-volume-slider") {
        volumeOsc = parseFloat(this.value);

        if (!mutedOsc) {
          gainNodeOsc.gain.value = volumeOsc;
        }

      } else if (d.class == "osc-freq-slider") {
        freqOsc = parseFloat(this.value);
        oscillator.frequency.value = freqOsc;
      }

    });
  }
}

//MICROPHONE CONTROL SETUP
function setupMicControls() {
    //unhide microhpone controls
    d3.select(".mic-controls").style("visibility", "visible");

  //initial microphone parameters
  var volumeMic = 0.1,
    mutedMic = false;

  gainNodeOsc.gain.value = volumeMic;
  setupMicButtons();
  setupMicSlider();

  function setupMicButtons() {
    //create on/off buttons for microphone
    var micOnOff = d3.select(".mic-btns").selectAll("button")
      .data(["on", "off"])
      .enter()
      .append("button")
      .attr({
        "class": "col-xs-3 col-md-6 btn btn-default",
        "type": "button"
      })
      .text(function(d) { return d; });

    //toggle microphone on and off when clicked
    micOnOff.on("click", function(d) {
      var pressedBtn = d3.select(this);

      if (pressedBtn.classed("active")) {
        return;
      } else if (!pressedBtn.classed("active")) {
        micOnOff.classed("active", false);
        pressedBtn.classed("active", true);

        if (d === "on") {
          mutedMic = false;
          gainNodeMic.gain.value = volumeMic;
        } else if (d == "off") {
          mutedMic = true;
          gainNodeMic.gain.value = 0;
        }
      }
    });
  }

  function setupMicSlider() {

    var micVolSlider = d3.select(".mic-slider").append("input")
      .attr({
        "class": "osc-freq-slider",
        "type": "range",
        "min": 0,
        "max": 1,
        "step": 0.05,
        "value": volumeMic
      });

    micVolSlider.on("input", function() {
      volumeMic = this.value;

      if (!mutedMic) {
        gainNodeMic.gain.value = volumeMic;
      }
    });
  }
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

  //control frequency when mouse or touch is moved in vis-container
  visContainer.on("touchmove", function(e) {
    oscillator.frequency.value = d3.mouse(visContainer.node())[0] + 200;
    e.preventDefault();
  });

  visContainer.on("mousemove", function() {
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
    .y(function(d) { return visHeight - 15 - d; })
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
