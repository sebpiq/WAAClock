var _ = require('underscore')

var WAAClock = module.exports = function(context) {
  this.context = context
  this._events = []

  this.tickTime = 0.010
  this.lookAheadTime = 0.020
}

WAAClock.prototype.setTimeout = function(func, delay) {
  var timeThen = this.context.currentTime + delay
    , event = {time: timeThen, func: func}
  this._insertEvent(event)
  return event
}

WAAClock.prototype.setInterval = function(func, delay) {
  var timeThen = this.context.currentTime + delay
    , event = {time: timeThen, func: func, repeat: delay}
  this._insertEvent(event)
  return event
}

WAAClock.prototype.clear = function(event) {
  this._removeEvent(event)
}

WAAClock.prototype.start = function() {
  if (this.intervalId !== undefined) { 
    var self = this
    this.intervalId = setInterval(function() {
      self.tick()
    }, this.tickTime)
    self.tick()
  }
}

// TODO : drop events that were missed?
WAAClock.prototype.tick = function() {
  var timeLookedAhead = this.context.currentTime + this.lookAheadTime
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
}

WAAClock.prototype._insertEvent = function(event) {
  this._events.splice(this._indexByTime(event.time), 0, event)
}

WAAClock.prototype._removeEvent = function(event) {
  var ind = this._events.indexOf(event)
  if (ind !== -1) this._events.splice(ind, 1)
}

// Returns the index of the first event whose time is >= to `time`
WAAClock.prototype._indexByTime = function(time) {
  return _.sortedIndex(this._events, {time: time}, function(e) { return e.time })
}
