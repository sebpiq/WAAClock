var context = typeof AudioContext === 'undefined' ? new webkitAudioContext() : new AudioContext()
  , clock = new WAAClock(context, {tickTime: 0.01, lookAheadTime: 0.1})
  , osc = context.createOscillator()
  , currentTempo = 60
osc.connect(context.destination)

// Here all the events are scheduled.
var startEvent = osc.start2(1)
  , freqEvent1 = osc.frequency.setValueAtTime2(220, 1).repeat(2)
  , freqEvent2 = osc.frequency.setValueAtTime2(440, 2).repeat(2)

// To change the tempo, we use the function `Clock.timeStretch`.
var setTempo = function(newTempo) {
  clock.timeStretch([freqEvent1, freqEvent2], currentTempo / newTempo)
  currentTempo = newTempo
}