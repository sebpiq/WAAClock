var _ = require('underscore')

// ==================== Event ==================== //
var Event = function(clock, time, func, repeat) {
  this.clock = clock
  this.time = time
  this.func = func
  this.repeat = repeat
}

_.extend(Event.prototype, {
  
  clear: function() { this.clock.clear(this) },

  setRepeat: function(repeat) { this.clock.setRepeat(this, repeat) },

  isRepeated: function() { return this.repeat !== undefined }

})

// ==================== WAAClock ==================== //
var WAAClock = module.exports = function(context) {
  var self = this
  this.context = context
  _.extend(context, AudioContextMixin, {_waac: this})
  this._events = []
  this.tickTime = 0.010
  this.lookAheadTime = 0.020
  this._start()
}

_.extend(WAAClock.prototype, {

  // ---------- Public API ---------- //
  // Schedule `func` to run after `delay` seconds.
  setTimeout: function(func, delay) {
    var self = this
      , event = this._createEvent(function() {
        setTimeout(func, self._relTime(event.time))
      }, this._absTime(delay))
    return event
  },

  // Schedule `func` to run periodically, at interval of `delay` seconds.
  setInterval: function(func, delay) {
    var event = this.setTimeout(func, delay)
    return this.setRepeat(event, delay)
  },

  // Stretch time and interval of `events` by `ratio`, keeping their relative time distance.
  // In fact this is equivalent to changing the tempo.
  timeStretch: function(events, ratio) {
    var self = this
      , eventRef = _.min(events, function(e) { return e.time })
    if (eventRef.isRepeated()) {
      var tRef1 = eventRef.time
        , tRef2 = this._absTime(ratio * this._relTime(eventRef.time))
      events.forEach(function(event) {
        self.setTime(event, tRef2 + ratio * (event.time - tRef1))
        if(event.repeat) event.repeat *= ratio
      })
    }
    return events
  },

  // Unschedule `event`
  clear: function(event) {
    this._removeEvent(event)
  },

  // Set the interval at which `event` repeats. `repeat` is in seconds.
  setRepeat: function(event, repeat) {
    if (repeat === 0)
      throw new Error('delay cannot be 0')
    if (event.isRepeated()) {
      var newTime = event.time - event.repeat + repeat
      event.repeat = repeat
      while (newTime < this.context.currentTime)
        newTime += event.repeat
      this.setTime(event, newTime)
    } else event.repeat = repeat
    return event
  },

  setTime: function(event, time) {
    if (time < this.context.currentTime)
      throw new Error('cannot schedule an event in the past')
    this._removeEvent(event)
    event.time = time
    this._insertEvent(event)
  },

  // ---------- Private ---------- //
  _createEvent: function(func, absTime) {
    var event = new Event(this, absTime, func)
    this._insertEvent(event)
    return event
  },

  _start: function() {
    if (this.intervalId === undefined) { 
      var self = this
      this.intervalId = setInterval(function() {
        self._tick()
      }, this.tickTime)
      self._tick()
    }
  },

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

  _insertEvent: function(event) {
    this._events.splice(this._indexByTime(event.time), 0, event)
  },

  _removeEvent: function(event) {
    var ind = this._events.indexOf(event)
    if (ind !== -1) this._events.splice(ind, 1)
  },

  // Returns the index of the first event whose time is >= to `time`
  _indexByTime: function(time) {
    return _.sortedIndex(this._events, {time: time}, function(e) { return e.time })
  },

  // Returns the time, taking for origin `context`'s origin
  _absTime: function(relTime) {
    return relTime + this.context.currentTime
  },

  // Returns the time, taking `currentTime` as origin. 
  _relTime: function(absTime) {
    return absTime - this.context.currentTime
  }
})

// ==================== Web Audio API patches ==================== //
var AudioParamMixin = {

  scheduleSetValue: function(time, value) {
    var self = this
      , event = this._waac._createEvent(function() {
        self.setValueAtTime(value, event.time)
      }, time)
    return event
  },

  repeatSetValue: function(delay, value) {
    var self = this
      , event = this._waac.setInterval(function() {
        self.setValueAtTime(value, event.time)
      }, delay)
    return event
  },

  _waac: null

}

var AudioContextMixin = {

  createOscillator: function() {
    var osc = webkitAudioContext.prototype.createOscillator.apply(this, arguments)
    return initAudioNode(osc, this._waac)
  },

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

  // Saving a reference to the methods we will override
  node._waac_start = node.start
  node._waac_stop = node.stop

  _.extend(node, AudioNodeMixin, {_waac: clock})
  return node
}

var AudioNodeMixin = {

  start: function(time) {
    var self = this
      , args = _.toArray(arguments).slice(1)
      , event = this._waac._createEvent(function() {
        self._waac_start.apply(self, [event.time].concat(args))
      }, time)
    return event
  },

  stop: function(time) {
    var args = _.toArray(arguments).slice(1)
      , event = this._waac._createEvent(function() {
        self._waac_stop.apply(self, [event.time].concat(args))
      }, time)
    return event
  },

  _waac: null

}
