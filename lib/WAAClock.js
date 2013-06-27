var _ = require('underscore')

var WAAClock = module.exports = function(context) {
  this.context = context
  this._events = []

  this.tickTime = 0.010
  this.lookAheadTime = 0.020

  this._start()
}

_.extend(WAAClock.prototype, {

  // ==================== Public API ==================== //
  setValueAtTime: function(obj, time, value) {
    var event = this._setTimeout(function() {
      obj.setValueAtTime(value, event.time)
    }, this._relTime(time))
    return event
  },

  start: function(obj, time) {
    var args = _.toArray(arguments).slice(2)
      , event = this._setTimeout(function() {
        obj.start.apply(obj, [event.time].concat(args))
      }, this._relTime(time))
    return event
  },

  stop: function(obj, time) {
    var args = _.toArray(arguments).slice(2)
      , event = this._setTimeout(function() {
        obj.stop.apply(obj, [event.time].concat(args))
      }, this._relTime(time))
    return event
  },

  setTimeout: function(func, delay) {
    var self = this
      , event = this._setTimeout(function() {
        setTimeout(func, self._relTime(event.time))
      })
    return event
  },

  // `func` can be a function to execute periodically, an event
  // in order to change its periodicity, or a list of events.
  setInterval: function(obj, delay) {
    var self = this
      , event
      , setRepeat = function(event, repeat) {
        if (event.hasOwnProperty('repeat')) {
          event.time = event.time - event.repeat + repeat
          event.repeat = repeat
          while (event.time < this.context.currentTime)
            event.time += event.repeat
        } else event.repeat = repeat
        return event
      }
    if (delay === 0) throw new Error('delay cannot be 0')
    
    // If `obj` is a function, we create a new event
    if (_.isFunction(obj)) {
      var self = this
      event = this._setTimeout(function() {
        setTimeout(obj, this._relTime(this.event.time))
      }, delay)
      return setRepeat(event, delay)

    // If `obj` is an array of events, we calculate a new time for
    // all of them, in order to keep relative times between all events.
    } else if (_.isArray(obj)) {
      var eventRef = _.min(obj, function(e) { return e.time })
      if (eventRef.hasOwnProperty('repeat')) {
        var ratio = delay/eventRef.repeat
          , tRef1 = eventRef.time
          , tRef2 = this._absTime(ratio * this._relTime(eventRef.time))
        obj.forEach(function(event) {
          event.time = tRef2 + ratio * (event.time - tRef1)
        })
      }
      obj.forEach(function(event) { event.repeat = delay })
      return obj

    // Otherwise, if `obj` is an event we just set the delay
    } else return setRepeat(obj, delay)
  },

  clear: function(event) {
    this._removeEvent(event)
  },

  // ==================== Private ==================== //
  _setTimeout: function(func, delay) {
    var timeThen = this._absTime(delay)
      , event = {time: timeThen, func: func}
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
      if (event.hasOwnProperty('repeat')) {
        event.time = event.time + event.repeat
        this._insertEvent(event)
      }
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

  _absTime: function(time) {
    return time + this.context.currentTime
  },

  _relTime: function(time) {
    return time - this.context.currentTime
  }
})

/*['linearRampToValueAtTime',
'exponentialRampToValueAtTime', 'setTargetAtTime', 'setValueCurveAtTime']

*/
