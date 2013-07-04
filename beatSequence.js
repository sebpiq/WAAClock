var context = typeof AudioContext === 'undefined' ? new webkitAudioContext() : new AudioContext()
  , soundBank = {}, beats = {}
  , tempo = QUERY.tempo || 120
  , signature = QUERY.signature || 4
  , beatDur = 60/tempo, barDur = signature * beatDur
  , clock = new WAAClock(context, {tickTime: 0.05, lookAheadTime: 0.1})

// The following code highlights the current beat in the UI by calling the function `uiNextBeat` periodically.  //
// Using `WAAClock.setTimeout` we create an event that will be executed at t=0, then repeated every `beatDur`   //
// (so at t=0, t=1*beatDur, t=2*beatDur, ...).                                                                  //
// We also set a very big tolerance, because we don't want an event to be dropped just because it is late.      //
var event = clock.callbackAtTime(uiNextBeat, 0)
  .repeat(beatDur)
  .tolerance(100)

// This function activates the beat `beatInd` of `track`.                                                       //
// First we calculate the time of the next `beatInd`, and we schedule the node to start playing then, using     //
// `AudioNode.start2`.                                                                                          //
// Because `AudioNode.start` can be called only once, we cannot use `repeat`, and we have to redo the whole     //
// thing : create a new node, schedule it with `start2`, loop, ..., once the event has been dealt with.         //
// This is achieved by adding listeners to 'executed' and 'expired' on the event, and rescheduling things for   // 
// the next bar.                                                                                                //
// For the `start` event, we need a small tolerance (10 ms here), because if the beat is activated right when   //
// it should be played, we will simply hear the beat late. So instead the beat is dropped and rescheduled for   //
// next bar, this keeping the pulse intact.                                                                     //
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

// This function deactivates the beat `beatInd` of `track`
var stopBeat = function(track, beatInd) {
  var event = beats[track][beatInd]
  event.clear()                           // If the beat is deactivated, we simply clear the upcoming event.
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
