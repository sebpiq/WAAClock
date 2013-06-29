var _ = require('underscore')

if (typeof AudioContext === 'undefined') {
  if (typeof webkitAudioContext !== 'undefined') 
    var AudioContext = webkitAudioContext
  else
    throw new Error('This browser doesn\'t seem to support web audio API')
}

// ==================== Event ==================== //
var Event = function(clock, time, func, repeat) {
  this.clock = clock
  this.time = time
  this.func = func
  this.repeat = repeat
}

_.extend(Event.prototype, {
  
  // Unschedules the event
  clear: function() {
    this.clock.clear(this)
    return this
  },

  // Sets the event to repeat. `repeat` is in seconds.
  setRepeat: function(repeat) {
    this.clock.setRepeat(this, repeat)
    return this
  },

  // Returns true if the event is repeated, false otherwise
  isRepeated: function() { return this.repeat !== undefined }

})

// ==================== WAAClock ==================== //
var WAAClock = module.exports = function(context) {
  var self = this
  this.context = context
  initAudioContext(context, this)
  this._events = []
  this.tickTime = 0.010
  this.lookAheadTime = 0.020
  this._start()
}

_.extend(WAAClock.prototype, {

  // ---------- Public API ---------- //
  // Schedule `func` to run after `delay` seconds.
  // This method tries to schedule the event as accurately as possible,
  // but it will never be exact as `AudioNode.start` or `AudioParam.scheduleSetValue`. 
  setTimeout: function(func, delay) {
    var self = this
      , event = this._createEvent(function() {
        setTimeout(func, self._relTime(event.time))
      }, this._absTime(delay))
    return event
  },

  // Stretch scheduled time and repeat time of `events` by `ratio`, keeping
  // their relative distance. In fact this is equivalent to changing the tempo.
  timeStretch: function(events, ratio) {
    var self = this
      , eventRef = _.min(events, function(e) { return e.time })
      , tRef1 = eventRef.time
      , tRef2 = this._absTime(ratio * this._relTime(eventRef.time))
    events.forEach(function(event) {
      self.setTime(event, tRef2 + ratio * (event.time - tRef1))
      if(event.isRepeated()) self.setRepeat(event, event.repeat * ratio)
    })
    return events
  },

  // Unschedule `event`
  clear: function(event) {
    this._removeEvent(event)
  },

  // Sets the interval at which `event` repeats. `repeat` is in seconds.
  setRepeat: function(event, repeat) {
    if (repeat === 0)
      throw new Error('delay cannot be 0')
    event.repeat = repeat
  },

  // Sets the occurence time of `event`. `time` is in seconds in the referential
  // of the web audio API context.
  setTime: function(event, time) {
    if (time < this.context.currentTime)
      throw new Error('cannot schedule an event in the past')
    this._removeEvent(event)
    event.time = time
    this._insertEvent(event)
  },

  // ---------- Private ---------- //
  // This starts the periodical execution of `_tick`
  _start: function() {
    if (this._tickIntervalId === undefined) { 
      var self = this
      this._tickIntervalId = setInterval(function() {
        self._tick()
      }, this.tickTime)
      self._tick()
    }
  },

  // This function is ran periodically, and at each tick it executes
  // events for which occurence time has arrived.
  // TODO : drop events that were missed?
  _tick: function() {
    var timeLookedAhead = this._absTime(this.lookAheadTime)
      , event = this._events.shift()

    // Execute the events
    while(event && event.time <= timeLookedAhead) {
      event.func()
      if (event.isRepeated())
        this.setTime(event, event.time + event.repeat)
      event = this._events.shift()
    }

    // Put back the last event
    if(event) this._events.unshift(event)
  },

  // Creates an event and insert it to the list
  _createEvent: function(func, time) {
    var event = new Event(this, time, func)
    this._insertEvent(event)
    return event
  },

  // Inserts an event to the list
  _insertEvent: function(event) {
    this._events.splice(this._indexByTime(event.time), 0, event)
  },

  // Removes an event from the list
  _removeEvent: function(event) {
    var ind = this._events.indexOf(event)
    if (ind !== -1) this._events.splice(ind, 1)
  },

  // Returns the index of the first event whose time is >= to `time`
  _indexByTime: function(time) {
    return _.sortedIndex(this._events, {time: time}, function(e) { return e.time })
  },

  // Converts from relative time to absolute time
  _absTime: function(relTime) {
    return relTime + this.context.currentTime
  },

  // Converts from absolute time to relative time 
  _relTime: function(absTime) {
    return absTime - this.context.currentTime
  }
})

// ==================== Web Audio API patches ==================== //
var AudioParamMixin = {

  setValueAtTime2: function(time, value) {
    var self = this
      , event = this._waac._createEvent(function() {
        self.setValueAtTime(value, event.time)
      }, time)
    return event
  },

  _waac: null

}

var initAudioContext = function(context, clock) {

  // Replacing the AudioNode creation methods to attach custom methods
  // upon creation of each AudioNode
  ['createOscillator', 'createBufferSource', 'createMediaElementSource',
    'createMediaStreamSource', 'createMediaStreamDestination', 'createScriptProcessor',
    'createAnalyser', 'createGain', 'createDelay', 'createBiquadFilter',
    'createWaveShaper', 'createPanner', 'createConvolver', 'createChannelSplitter',
    'createChannelMerger', 'createDynamicsCompressor'].forEach(function(methName) {
    context[methName] = function() {
      var node = AudioContext.prototype[methName].apply(this, arguments)
      return initAudioNode(node, clock)
    }
  })
  _.extend(context, AudioContextMixin, {_waac: clock})
  return context
}

var AudioContextMixin = {

  _waac: null

}

var initAudioNode = function(node, clock) {

  // Mixing-in AudioParams
  var audioParams = _.filter(_.values(node), function(val) {
    return _.isFunction(val.setValueAtTime)
  })
  audioParams.forEach(function(audioParam) {
    _.extend(audioParam, AudioParamMixin, {_waac: clock})
  })
  _.extend(node, AudioNodeMixin, {_waac: clock})
  return node
}

var AudioNodeMixin = {

  start2: function(time) {
    var self = this
      , args = _.toArray(arguments).slice(1)
      , event = this._waac._createEvent(function() {
        self.start.apply(self, [event.time].concat(args))
      }, time)
    return event
  },

  stop2: function(time) {
    var args = _.toArray(arguments).slice(1)
      , event = this._waac._createEvent(function() {
        self.stop.apply(self, [event.time].concat(args))
      }, time)
    return event
  },

  _waac: null

}
