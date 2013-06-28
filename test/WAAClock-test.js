var assert = require('assert')
  , WAAClock = require('../lib/WAAClock')

var eToObj1 = function(event) {
  return {
    time: event.time,
    repeat: event.repeat
  }
}

var eToObj2 = function(event) {
  return {
    time: event.time,
    func: event.func
  }
}

// Just for testing, we don't want the clock to start
WAAClock._start = function() {}

var dummyContext = {
  currentTime: 0
}

describe('timeStretch', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
  })

  it('should stretch rightly events with the same interval', function() {
    var waaClock = new WAAClock(dummyContext)
      , cb = function() {}
      , event1, event2, event3, ratio
    dummyContext.currentTime = 2.4

    event1 = waaClock.setInterval(cb, 2)
    dummyContext.currentTime = 3.0
    event2 = waaClock.setInterval(cb, 2)
    dummyContext.currentTime = 3.6
    event3 = waaClock.setInterval(cb, 2)

    assert.deepEqual(eToObj1(event1), {time: 4.4, repeat: 2})
    assert.deepEqual(eToObj1(event2), {time: 5.0, repeat: 2})
    assert.deepEqual(eToObj1(event3), {time: 5.6, repeat: 2})

    dummyContext.currentTime = 4.0
    ratio = 1/4
    waaClock.timeStretch([event1, event2, event3], ratio)
    assert.deepEqual(eToObj1(event1), {time: 4.1, repeat: 0.5})
    assert.deepEqual(eToObj1(event2), {time: 4.1 + (0.6 * ratio), repeat: 0.5})
    assert.deepEqual(eToObj1(event3), {time: 4.1 + (1.2 * ratio), repeat: 0.5})
  })

  it('should stretch rightly events with different intervals', function() {
    var waaClock = new WAAClock(dummyContext)
      , cb = function() {}
      , event1, event2, event3, ratio
    event1 = waaClock.setInterval(cb, 2)
    event2 = waaClock.setInterval(cb, 3)
    event3 = waaClock.setInterval(cb, 4)

    assert.deepEqual(eToObj1(event1), {time: 2, repeat: 2})
    assert.deepEqual(eToObj1(event2), {time: 3, repeat: 3})
    assert.deepEqual(eToObj1(event3), {time: 4, repeat: 4})

    ratio = 1/2
    waaClock.timeStretch([event1, event2, event3], ratio)
    assert.deepEqual(eToObj1(event1), {time: 1, repeat: 1})
    assert.deepEqual(eToObj1(event2), {time: 1.5, repeat: 1.5})
    assert.deepEqual(eToObj1(event3), {time: 2, repeat: 2})
  })

})

describe('setRepeat', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
  })

  it('shouldn\'t change the time if repeat isn\'t already set', function() {
    var waaClock = new WAAClock(dummyContext)
      , event = waaClock._createEvent(function() {}, 1)
    waaClock.setRepeat(event, 1.234)

    assert.deepEqual(eToObj1(event), {time: 1, repeat: 1.234})
  })

  it('should update the time is repeat is changed', function() {
    var waaClock = new WAAClock(dummyContext)
      , event = waaClock._createEvent(function() {}, 1)

    waaClock.setRepeat(event, 0.5)
    assert.deepEqual(eToObj1(event), {time: 1, repeat: 0.5})

    waaClock.setRepeat(event, 1.2)
    assert.deepEqual(eToObj1(event), {time: 1.7, repeat: 1.2})

    waaClock.setRepeat(event, 0.1)
    assert.deepEqual(eToObj1(event), {time: 0.6, repeat: 0.1})
  })

})

describe('_tick', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
  })

  it('should execute simple events rightly', function() {
    var called = []
      , waaClock = new WAAClock(dummyContext)
      , event1 = waaClock._createEvent(function() { called.push(1) }, 7.5)
      , event2 = waaClock._createEvent(function() { called.push(2) }, 3.51)
      , event3 = waaClock._createEvent(function() { called.push(3) }, 2.55)
    waaClock.lookAheadTime = 2.5
    waaClock.tickTime = 1
    
    // t=0 / look ahead=2.5
    waaClock._tick()
    assert.deepEqual(called, [])
    dummyContext.currentTime += waaClock.tickTime

    // t=1 / look ahead=3.5
    waaClock._tick()
    assert.deepEqual(called, [3])
    dummyContext.currentTime += waaClock.tickTime

    // t=2 / look ahead=4.5
    waaClock._tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += waaClock.tickTime

    // t=3 / look ahead=5.5
    waaClock._tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += waaClock.tickTime

    // t=4 / look ahead=6.5
    waaClock._tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += waaClock.tickTime

    // t=5 / look ahead=7.5
    waaClock._tick()
    assert.deepEqual(called, [3, 2, 1])
    assert.deepEqual(waaClock._events, [])
  })

  it('should execute repeated events', function() {
    var called = []
      , waaClock = new WAAClock(dummyContext)
      , event1 = waaClock._createEvent(function() { called.push(1) }, 3)
      , event2 = waaClock._createEvent(function() { called.push(2) }, 1.2)
    waaClock.setRepeat(event2, 1.2)
    waaClock.lookAheadTime = 2.5
    waaClock.tickTime = 1
    
    // t=0 / look ahead=2.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2])
    dummyContext.currentTime += waaClock.tickTime

    // t=1 / look ahead=3.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2, 1])
    dummyContext.currentTime += waaClock.tickTime

    // t=2 / look ahead=4.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2, 1, 2])
    dummyContext.currentTime += waaClock.tickTime

    waaClock.clear(event2)
    // t=3 / look ahead=5.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2, 1, 2])
    dummyContext.currentTime += waaClock.tickTime
  })

})

describe('_createEvent', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
  })

  it('should create an event when called', function() {
    var waaClock = new WAAClock(dummyContext)
      , cb1 = function() {}
      , cb2 = function() {}
      , cb3 = function() {}
    waaClock._createEvent(cb1, 300)
    waaClock._createEvent(cb2, 1000)
    waaClock._createEvent(cb3, 200.5)
    assert.deepEqual(waaClock._events.map(eToObj2), [
      {time: 200.5, func: cb3},
      {time: 300, func: cb1},
      {time: 1000, func: cb2}
    ])
  })

  it('should remove event when calling clear', function() {
    var waaClock = new WAAClock(dummyContext)
      , event = waaClock._createEvent(function() {}, 1000)
    assert.deepEqual(waaClock._events, [event])
    waaClock.clear(event)
    assert.deepEqual(waaClock._events, [])
  })

})

describe('events management', function() {

  it('should insert events at the right position', function() {
    var waaClock = new WAAClock(dummyContext)
    waaClock._events = [{time: 2}, {time: 3}, {time: 7}, {time: 11}]

    waaClock._insertEvent({time: 1})
    assert.deepEqual(waaClock._events, [{time: 1}, {time: 2}, {time: 3}, {time: 7},
      {time: 11}])

    waaClock._insertEvent({time: 13})
    assert.deepEqual(waaClock._events, [{time: 1}, {time: 2}, {time: 3}, {time: 7},
      {time: 11}, {time: 13}])

    waaClock._insertEvent({time: 9})
    assert.deepEqual(waaClock._events, [{time: 1}, {time: 2}, {time: 3}, {time: 7},
      {time: 9}, {time: 11}, {time: 13}])

    waaClock._insertEvent({time: 2, bla: 34})
    assert.deepEqual(waaClock._events, [{time: 1}, {time: 2, bla: 34}, {time: 2},
      {time: 3}, {time: 7}, {time: 9}, {time: 11}, {time: 13}])
  })

  it('should remove events rightly', function() {
    var waaClock = new WAAClock(dummyContext)
    waaClock._events = [{time: 2}, {time: 3}, {time: 4}, {time: 10.5}, {time: 11}]

    waaClock._removeEvent(waaClock._events[1])
    assert.deepEqual(waaClock._events, [{time: 2}, {time: 4}, {time: 10.5}, {time: 11}])

    waaClock._removeEvent(waaClock._events[0])
    assert.deepEqual(waaClock._events, [{time: 4}, {time: 10.5}, {time: 11}])

    waaClock._removeEvent(waaClock._events[waaClock._events.length - 1])
    assert.deepEqual(waaClock._events, [{time: 4}, {time: 10.5}])
  })

})

describe('_indexByTime', function() {
  
  it('should find the right index', function() {
    var waaClock = new WAAClock(dummyContext)
    waaClock._events = [{time: 2}, {time: 3}, {time: 7}, {time: 7}, {time: 7}, {time: 11}]

    assert.equal(waaClock._indexByTime(3), 1)
    assert.equal(waaClock._indexByTime(2), 0)
    assert.equal(waaClock._indexByTime(11), 5)
    assert.equal(waaClock._indexByTime(7), 2)
    assert.equal(waaClock._indexByTime(6.5), 2)
  })

})

describe('time referential', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
  })

  it('can convert from absolute to relative time', function() {
    dummyContext.currentTime = 1
    var waaClock = new WAAClock(dummyContext)
    assert.equal(waaClock._relTime(2), 1)
    assert.equal(waaClock._relTime(0), -1)
    assert.equal(waaClock._absTime(2), 3)
    assert.equal(waaClock._absTime(-0.75), 0.25)
  })

})
