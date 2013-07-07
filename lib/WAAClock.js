var _ = require('underscore')
  , EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits

if (typeof AudioContext === 'undefined') {
  if (typeof webkitAudioContext !== 'undefined') 
    var AudioContext = webkitAudioContext
  else
    console.error('This browser doesn\'t seem to support web audio API')
}

// ==================== Event ==================== //
var Event = function(clock, time, func) {
  this.clock = clock
  this.func = func
  this.repeatTime = null
  this.toleranceLate = 0.010
  this.toleranceEarly = 0.010
  this._expireTime = null
  this._earliestTime = null
  this.time = time
  this._update()
}
inherits(Event, EventEmitter)

_.extend(Event.prototype, {
  
  // Unschedules the event
  clear: function() {
    this.clock._removeEvent(this)
    return this
  },

  // Sets the event to repeat every `time` seconds.
  repeat: function(time) {
    if (time === 0)
      throw new Error('delay cannot be 0')
    this.repeatTime = time
    return this
  },

  // Sets the time tolerance of the event.
  // The event will be executed in the interval `[time - early, time + late]`
  // where `time` is the event's due date. If the clock fails to execute the event in time,
  // the event will be dropped.
  tolerance: function(late, early) {
    if (_.isNumber(late))
      this.toleranceLate = late
    if (_.isNumber(early))
      this.toleranceEarly = early
    this._update()
    return this
  },

  // Returns true if the event is repeated, false otherwise
  isRepeated: function() { return this.repeatTime !== null },

  // Schedules the event to run at `time`.
  // If the time is within the event tolerance, we handle the event immediately
  _schedule: function(time) {
    this.time = time
    this._update()
    if (this.clock.context.currentTime >= this._earliestTime) {
      this.clock._removeEvent(this)
      this.clock._handleEvent(this)
    }
  },

  // This recalculates some cached values and re-insert the event in the clock's list
  // to maintain order.
  _update: function() {
    this._expireTime = this.time + this.toleranceLate
    this._earliestTime = this.time - this.toleranceEarly
    this.clock._removeEvent(this)
    this.clock._insertEvent(this)
  }

})

// ==================== WAAClock ==================== //
var CLOCK_DEFAULTS = {
  toleranceLate: 0.10,
  toleranceEarly: 0.001
}

var WAAClock = module.exports = function(context, opts) {
  var self = this
  opts = _.defaults(opts || {}, CLOCK_DEFAULTS)
  _.extend(this, _.pick(opts, Object.keys(CLOCK_DEFAULTS)))
  this.context = context
  initAudioContext(context, this)
  this._events = []
  this._start()
}

_.extend(WAAClock.prototype, {

  // ---------- Public API ---------- //
  // Schedule `func` to run after `delay` seconds.
  // This method tries to schedule the event as accurately as possible,
  // but it will never be exact as `AudioNode.start` or `AudioParam.scheduleSetValue`.
  setTimeout: function(func, delay) {
    return this._createEvent(func, this._absTime(delay)).tolerance(null, 0)
  },

  // Schedule `func` to run at `time`.
  // This method tries to schedule the event as accurately as possible,
  // but it will never be exact as `AudioNode.start` or `AudioParam.scheduleSetValue`.
  callbackAtTime: function(func, time) {
    return this._createEvent(func, time).tolerance(null, 0)
  },

  // Stretch time and repeat time of all scheduled `events` by `ratio`, keeping
  // their relative distance. In fact this is equivalent to changing the tempo.
  timeStretch: function(events, ratio) {
    var self = this
      , eventRef = _.min(events, function(e) { return e.time })
      , tRef1 = eventRef.time
      , tRef2 = this._absTime(ratio * this._relTime(tRef1))
    events.forEach(function(event) {
      if(event.isRepeated()) event.repeat(event.repeatTime * ratio)
      event._schedule(tRef2 + ratio * (event.time - tRef1))
    })
    return events
  },

  // ---------- Private ---------- //
  // This starts the periodical execution of `_tick`
  _start: function() {
    var self = this
      , bufferSize = 256
    // We have to keep a reference to the node to avoid garbage collection
    if (this.context.createScriptProcessor)
      this._clockNode = this.context.createScriptProcessor(bufferSize, 1, 1)
    // !!! OLD NAME
    else 
      this._clockNode = this.context.createJavaScriptNode(bufferSize, 1, 1)
    this._clockNode.connect(this.context.destination)
    this._clockNode.onaudioprocess = function () {
      setTimeout(function() { self._tick() }, 0)
    }
  },

  // This function is ran periodically, and at each tick it executes
  // events for which `currentTime` is included in their tolerance interval.
  _tick: function() {
    var event = this._events.shift()

    while(event && event._earliestTime <= this.context.currentTime) {
      this._handleEvent(event)
      event = this._events.shift()
    }

    // Put back the last event
    if(event) this._events.unshift(event)
  },

  // Handles an event
  _handleEvent: function(event) {
    if (this.context.currentTime < event._expireTime) {
      event.func()
      event.emit('executed')
    } else {
      event.emit('expired')
      console.warn('event expired')
    }
    if (event.isRepeated())
      event._schedule(event.time + event.repeatTime)
  },

  // Creates an event and insert it to the list
  _createEvent: function(func, time) {
    var event = new Event(this, time, func)
    event.tolerance(this.toleranceLate, this.toleranceEarly)
    return event
  },

  // Inserts an event to the list
  _insertEvent: function(event) {
    this._events.splice(this._indexByTime(event._earliestTime), 0, event)
  },

  // Removes an event from the list
  _removeEvent: function(event) {
    var ind = this._events.indexOf(event)
    if (ind !== -1) this._events.splice(ind, 1)
  },

  // Returns the index of the first event whose time is >= to `time`
  _indexByTime: function(time) {
    return _.sortedIndex(this._events, {_earliestTime: time}, function(e) { return e._earliestTime })
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
var initAudioContext = function(context, clock) {

  // Replacing the AudioNode creation methods to attach custom methods
  // upon creation of each AudioNode
  ['createOscillator', 'createBufferSource', 'createMediaElementSource',
    'createMediaStreamSource', 'createMediaStreamDestination', 'createScriptProcessor',
    'createAnalyser', 'createGain', 'createDelay', 'createBiquadFilter',
    'createWaveShaper', 'createPanner', 'createConvolver', 'createChannelSplitter',
    'createChannelMerger', 'createDynamicsCompressor',
  // !!! OLD NAMES
    'createGainNode', 'createDelayNode', 'createJavaScriptNode'
    ].forEach(function(methName) {
    if (context[methName]) {
      context[methName] = function() {
        var node = AudioContext.prototype[methName].apply(this, arguments)
        return initAudioNode(node, clock)
      }
    }
  })

  return _.extend(context, AudioContextMixin, {_waac: clock})
}

var initAudioNode = function(node, clock) {

  // Mixing-in AudioParams
  var audioParams = _.filter(_.values(node), function(val) {
    return _.isObject(val) && _.isFunction(val.setValueAtTime)
  })
  audioParams.forEach(function(audioParam) {
    _.extend(audioParam, AudioParamMixin, {_waac: clock})
  })

  // Adding start2/stop2 to nodes that have start/stop methods 
  ;['start', 'stop', 
  // !!! OLD NAMES
    'noteOn', 'noteGrainOn', 'noteOff'
  ].forEach(function(methName) {
    if (node[methName])
      node[methName+'2'] = makeAudioNodeMethod(methName)
  })
  return _.extend(node, AudioNodeMixin, {_waac: clock})
}

var makeAudioNodeMethod = function(nativeMethod) {
  return function(time) {
    var self = this
      , args = _.toArray(arguments).slice(1)
      , event = this._waac._createEvent(function() {
        self[nativeMethod].apply(self, [event.time].concat(args))
      }, time)
    return event
  }
}

var AudioContextMixin = {

  _waac: null

}

var AudioNodeMixin = {

  _waac: null

}

var AudioParamMixin = {

  setValueAtTime2: function(value, time) {
    var self = this
      , event = this._waac._createEvent(function() {
        self.setValueAtTime(value, event.time)
      }, time)
    return event
  },

  _waac: null

}
