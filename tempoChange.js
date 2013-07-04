var context = typeof AudioContext === 'undefined' ? new webkitAudioContext() : new AudioContext()
  , clock = new WAAClock(context, {tickTime: 0.01, lookAheadTime: 0.1})
  , osc = context.createOscillator()
  , currentTempo = 60
osc.connect(context.destination)

// Here all the events are scheduled.                                                                                         //
// The oscillator is started at t=1, this event is executed only once.                                                        //
// Then, we want the oscillator frequency to change every second. So we schedule two events that will repeat every 2 seconds. //
// `event1` being first scheduled at t=1, it will be executed at t=1, t=3, t=5, ... and `event2` being first scheduled        //
// at t=2, it will be executed at t=2, t=4, t=6, ...                                                                          //
var startEvent = osc.start2(1)
  , freqEvent1 = osc.frequency.setValueAtTime2(220, 1).repeat(2)
  , freqEvent2 = osc.frequency.setValueAtTime2(440, 2).repeat(2)

// To change the tempo, we use the function `Clock.timeStretch`. It will simply recalculate the events' time and repeat       //
var setTempo = function(newTempo) {
  clock.timeStretch([freqEvent1, freqEvent2], currentTempo / newTempo)
  currentTempo = newTempo
}
