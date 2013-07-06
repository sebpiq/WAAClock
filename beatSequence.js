var context = typeof AudioContext === 'undefined' ? new webkitAudioContext() : new AudioContext()
  , soundBank = {}, beats = {}
  , tempo = QUERY.tempo || 120
  , signature = QUERY.signature || 4
  , beatDur = 60/tempo, barDur = signature * beatDur
  , clock = new WAAClock(context, {tickTime: 0.05, lookAheadTime: 0.1})

// The following code highlights the current beat in the UI by calling the function `uiNextBeat` periodically.
var event = clock.callbackAtTime(uiNextBeat, 0)
  .repeat(beatDur)
  .tolerance(100)

// This function activates the beat `beatInd` of `track`.
var startBeat = function(track, beatInd) {
  var scheduleBeat = function(time) {
    var bufferNode = soundBank[track]()
      , redo = function() { scheduleBeat(event.time + barDur) }
      , event = bufferNode.start2(time).tolerance(0.01)
    event.on('executed', redo)
    event.on('expired', redo)
    beats[track][beatInd] = event
  }
  scheduleBeat(nextBeatTime(beatInd))
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
      soundBank[track] = createNode
    })
  }
  request.send()
}
