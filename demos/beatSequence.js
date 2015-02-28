if (!window.AudioContext) alert('you browser doesnt support Web Audio API')

var context = new AudioContext()
  , soundBank = {}
  , beats = {}
  , tempo = QUERY.tempo || 120
  , signature = QUERY.signature || 4
  , beatDur = 60/tempo
  , barDur = signature * beatDur
  , clock = new WAAClock(context, {toleranceEarly: 0.1})
clock.start()

// The following code highlights the current beat in the UI by calling the function `uiNextBeat` periodically.
var event = clock.callbackAtTime(uiNextBeat, 0)
  .repeat(beatDur)
  .tolerance({late: 100})

// This function activates the beat `beatInd` of `track`.
var startBeat = function(track, beatInd) {
  var event = clock.callbackAtTime(function(event) {
    var bufferNode = soundBank[track].createNode()
    bufferNode.start(event.deadline)
  }, nextBeatTime(beatInd))
  event.repeat(barDur)
  event.tolerance({late: 0.01})
  beats[track][beatInd] = event
}

// This function deactivates the beat `beatInd` of `track`.
var stopBeat = function(track, beatInd) {
  var event = beats[track][beatInd]
  event.clear()
  event.removeAllListeners()
}

// ---------- Just some helpers ---------- //
// This helper calculates the absolute time of the upcoming `beatInd`. 
var nextBeatTime = function(beatInd) {
  var currentTime = context.currentTime
    , currentBar = Math.floor(currentTime / barDur)
    , currentBeat = Math.round(currentTime % barDur)
  if (currentBeat < beatInd) return currentBar * barDur + beatInd * beatDur
  else return (currentBar + 1) * barDur + beatInd * beatDur
}

// This helper loads sound buffers
var loadTrack = function(track) {
  var request = new XMLHttpRequest()
  request.open('GET', 'sounds/' + track + '.wav', true)
  request.responseType = 'arraybuffer'
  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      var createNode = function() {
        var node = context.createBufferSource()
        node.buffer = buffer
        node.connect(context.destination)
        return node
      }
      soundBank[track] = { createNode: createNode }
    })
  }
  request.send()
}
