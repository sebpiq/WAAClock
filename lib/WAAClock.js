var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , isBrowser = (typeof window !== 'undefined')

if (isBrowser && !AudioContext)
  throw new Error('This browser doesn\'t seem to support web audio API')

// ==================== Event ==================== //
var Event = function(clock, deadline, func) {
  this.clock = clock
  this.func = func
  this.repeatTime = null
  this.toleranceLate = 0.010
  this.toleranceEarly = 0.010
  this._expireTime = null
  this._earliestTime = null
  this.deadline = deadline
  this._update()
}
inherits(Event, EventEmitter)

// Unschedules the event
Event.prototype.clear = function() {
  this.clock._removeEvent(this)
  return this
}

// Sets the event to repeat every `time` seconds.
Event.prototype.repeat = function(time) {
  if (time === 0)
    throw new Error('delay cannot be 0')
  this.repeatTime = time
  return this
}

// Sets the time tolerance of the event.
// The event will be executed in the interval `[deadline - early, deadline + late]`
// If the clock fails to execute the event in time, the event will be dropped.
Event.prototype.tolerance = function(values) {
  if (typeof values.late === 'number')
    this.toleranceLate = values.late
  if (typeof values.early === 'number')
    this.toleranceEarly = values.early
  this._update()
  return this
}

// Returns true if the event is repeated, false otherwise
Event.prototype.isRepeated = function() { return this.repeatTime !== null }

// Schedules the event to be ran before `deadline`.
// If the time is within the event tolerance, we handle the event immediately
Event.prototype.schedule = function(deadline) {
  this.deadline = deadline
  this._update()
  if (this.clock.context.currentTime >= this._earliestTime) {
    this.clock._removeEvent(this)
    this.clock._handleEvent(this)
  }
}

// This recalculates some cached values and re-insert the event in the clock's list
// to maintain order.
Event.prototype._update = function() {
  this._expireTime = this.deadline + this.toleranceLate
  this._earliestTime = this.deadline - this.toleranceEarly
  this.clock._removeEvent(this)
  this.clock._insertEvent(this)
}

// ==================== WAAClock ==================== //
var CLOCK_DEFAULTS = {
  toleranceLate: 0.10,
  toleranceEarly: 0.001
}

var WAAClock = module.exports = function(context, opts) {
  var self = this
  opts = opts || {}
  this.toleranceEarly = opts.toleranceEarly || CLOCK_DEFAULTS.toleranceEarly
  this.toleranceLate = opts.toleranceLate || CLOCK_DEFAULTS.toleranceLate
  this.context = context
  this._events = []
  this._started = false
}

// ---------- Public API ---------- //
// Schedules `func` to run after `delay` seconds.
WAAClock.prototype.setTimeout = function(func, delay) {
  return this._createEvent(func, this._absTime(delay))
}

// Schedules `func` to run before `deadline`.
WAAClock.prototype.callbackAtTime = function(func, deadline) {
  return this._createEvent(func, deadline)
}

// Stretches `deadline` and `repeat` of all scheduled `events` by `ratio`, keeping
// their relative distance. In fact this is equivalent to changing the tempo.
WAAClock.prototype.timeStretch = function(events, ratio) {
  var tRef1 = Math.min.apply(Math, events.map(function(event) { return event.deadline }))
    , tRef2 = this._absTime(ratio * this._relTime(tRef1))
  events.forEach(function(event) {
    if (event.isRepeated()) event.repeat(event.repeatTime * ratio)
    event.schedule(tRef2 + ratio * (event.deadline - tRef1))
  })
  return events
}

// ---------- Private ---------- //

// Removes all scheduled events and starts the clock 
WAAClock.prototype.start = function() {
  if (this._started === false) {
    var self = this
    this._started = true
    this._events = []

    var bufferSize = 256
    // We have to keep a reference to the node to avoid garbage collection
    this._clockNode = this.context.createScriptProcessor(bufferSize, 1, 1)
    this._clockNode.connect(this.context.destination)
    this._clockNode.onaudioprocess = function () {
      setTimeout(function() { self._tick() }, 0)
    }
  }
}

// Stops the clock
WAAClock.prototype.stop = function() {
  if (this._started === true) {
    this._started = false
    this._clockNode.disconnect()
  }  
}

// This function is ran periodically, and at each tick it executes
// events for which `currentTime` is included in their tolerance interval.
WAAClock.prototype._tick = function() {
  var event = this._events.shift()

  while(event && event._earliestTime <= this.context.currentTime) {
    this._handleEvent(event)
    event = this._events.shift()
  }

  // Put back the last event
  if(event) this._events.unshift(event)
}

// Handles an event
WAAClock.prototype._handleEvent = function(event) {
  if (this.context.currentTime < event._expireTime) {
    event.func(event)
    event.emit('executed')
  } else {
    event.emit('expired')
    console.warn('event expired')
  }
  if (event.isRepeated())
    event.schedule(event.deadline + event.repeatTime)
}

// Creates an event and insert it to the list
WAAClock.prototype._createEvent = function(func, deadline) {
  var event = new Event(this, deadline, func)
  event.tolerance({late: this.toleranceLate, early: this.toleranceEarly})
  return event
}

// Inserts an event to the list
WAAClock.prototype._insertEvent = function(event) {
  this._events.splice(this._indexByTime(event._earliestTime), 0, event)
}

// Removes an event from the list
WAAClock.prototype._removeEvent = function(event) {
  var ind = this._events.indexOf(event)
  if (ind !== -1) this._events.splice(ind, 1)
}

// Returns the index of the first event whose deadline is >= to `deadline`
WAAClock.prototype._indexByTime = function(deadline) {
  // performs a binary search
  var low = 0
    , high = this._events.length
    , mid
  while (low < high) {
    mid = Math.floor((low + high) / 2)
    if (this._events[mid]._earliestTime < deadline)
      low = mid + 1
    else high = mid
  }
  return low
}

// Converts from relative time to absolute time
WAAClock.prototype._absTime = function(relTime) {
  return relTime + this.context.currentTime
}

// Converts from absolute time to relative time 
WAAClock.prototype._relTime = function(absTime) {
  return absTime - this.context.currentTime
}