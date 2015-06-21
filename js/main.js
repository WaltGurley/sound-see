//AUDIO SETUP
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();


var oscillator = audioCtx.createOscillator();
var gainNode = audioCtx.createGain();
var audioData = audioCtx.createAnalyser();

oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);
gainNode.gain.value = 0.1
oscillator.type = "sine";
oscillator.start();

setupControls();
setupVis();

//CONTROLS SETUP
function setupControls() {
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

  //make sine oscillator button active
  d3.select(oscChoose[0][0]).classed("active", true);

  //change oscillator when oscillator button is clicked
  oscChoose.on("click", function(d) {
    var pressedBtn = d3.select(this);

    if (pressedBtn.classed("active")) {
      oscChoose.classed("active", false);
    } else {
      oscChoose.classed("active", false);
      pressedBtn.classed("active", true);
    }

    oscillator.type = d;
  });
}

//VISUALIZATIONS
function setupVis() {
  var visContainer = d3.select(".vis-container").append("svg");

  oscillator.connect(audioData);
  var bufferLength = audioData.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  //control frequency and gain (i.e., volume) when mouse is moved in vis-container
  visContainer.on("mousemove", function () {
    oscillator.frequency.value = d3.mouse(visContainer.node())[0] + 200;
    gainNode.gain.value = 0.1 - (0.1 * d3.mouse(visContainer.node())[1] / window.innerHeight);
    //console.log(oscillator.frequency.value, gainNode.gain.value);

    //
  });

  //d3 function for parsing line data
  var makeLine = d3.svg.line()
    .x(function(d,i) { return i; })
    .y(function(d) { return d; });

  audioData.getByteTimeDomainData(dataArray);

  var waveForm = visContainer.append("path")
    .data(dataArray)
    .attr({
      "class": "waveform",
      "d": makeLine(dataArray)
    });

  setInterval(function() {
    audioData.getByteTimeDomainData(dataArray);
    waveForm.attr("d", makeLine(dataArray));
  }, 250);
}
