var assert = require('assert')
  , WAAClock = require('../index')

var eToObj1 = function(event) {
  return {
    time: event.time,
    repeat: event.repeatTime
  }
}

var eToObj2 = function(event) {
  return {
    time: event.time,
    func: event.func
  }
}

// Just for testing, we don't want the clock to start
WAAClock.prototype._start = function() {}

var dummyContext = {
  currentTime: 0
}

describe('Event', function() {

  it('should be an EventEmitter', function() {
    var waaClock = new WAAClock(dummyContext)
      , event = waaClock._createEvent(function(){}, 5)
      , called = []
      , cb = function() { called.push('bla') }
    event.on('bla', cb)
    assert.deepEqual(called, [])
    event.emit('bla')
    assert.deepEqual(called, ['bla'])
    event.removeListener('bla', cb)
    event.emit('bla')
    assert.deepEqual(called, ['bla'])
  })

  describe('tolerance', function() {

    it('should get the default tolerance', function() {
      var waaClock = new WAAClock(dummyContext, {tolerance: {early: 11, late: 22}})
        , event = waaClock._createEvent(function(){}, 5)
      assert.equal(event.toleranceLate, waaClock.toleranceLate)
      assert.equal(event.toleranceEarly, waaClock.toleranceEarly)
    })

    it('shouldn\'t change the tolerance if value not provided', function() {
      var waaClock = new WAAClock(dummyContext, {tolerance: {early: 11, late: 22}})
        , event = waaClock._createEvent(function(){}, 5)
      assert.equal(event.toleranceLate, waaClock.toleranceLate)
      assert.equal(event.toleranceEarly, waaClock.toleranceEarly)

      event.tolerance(88)
      assert.equal(event.toleranceLate, 88)
      assert.equal(event.toleranceEarly, waaClock.toleranceEarly)

      event.tolerance(null, 999)
      assert.equal(event.toleranceLate, 88)
      assert.equal(event.toleranceEarly, 999)
    })

    it('should update cached values', function() {
      var waaClock = new WAAClock(dummyContext)
        , event = waaClock._createEvent(function(){}, 5).tolerance(33, 2)

      assert.equal(event.time, 5)
      assert.equal(event.toleranceLate, 33)
      assert.equal(event.toleranceEarly, 2)
      assert.equal(event._expireTime, 5 + 33)
      assert.equal(event._earliestTime, 5 - 2)

      event.schedule(10)
      assert.equal(event.time, 10)
      assert.equal(event.toleranceLate, 33)
      assert.equal(event.toleranceEarly, 2)
      assert.equal(event._expireTime, 10 + 33)
      assert.equal(event._earliestTime, 10 - 2)

      event.tolerance(11, 4)
      assert.equal(event.time, 10)
      assert.equal(event.toleranceLate, 11)
      assert.equal(event.toleranceEarly, 4)
      assert.equal(event._expireTime, 10 + 11)
      assert.equal(event._earliestTime, 10 - 4)
    })

  })

  describe('schedule', function() {

    beforeEach(function() {
      dummyContext = {
        currentTime: 0
      }
    })

    it('should set time and update the list of events', function() {
      var waaClock = new WAAClock(dummyContext)
        , event1 = waaClock._createEvent(function() {}, 1)
        , event2 = waaClock._createEvent(function() {}, 0.5)
        , event3 = waaClock._createEvent(function() {}, 2)

      assert.deepEqual(waaClock._events.map(eToObj1),
        [ {time: 0.5, repeat: null}, {time: 1, repeat: null}, {time: 2, repeat: null} ])

      event2.schedule(1.234)
      assert.deepEqual(waaClock._events.map(eToObj1),
        [ {time: 1, repeat: null}, {time: 1.234, repeat: null}, {time: 2, repeat: null} ])

      event3.schedule(0.2)
      assert.deepEqual(waaClock._events.map(eToObj1),
        [ {time: 0.2, repeat: null}, {time: 1, repeat: null}, {time: 1.234, repeat: null} ])
    })

  })

  describe('repeat', function() {

    beforeEach(function() {
      dummyContext = {
        currentTime: 0
      }
    })

    it('should set event\'s repeat', function() {
      var waaClock = new WAAClock(dummyContext)
        , event = waaClock._createEvent(function() {}, 1)
      event.repeat(1.234)

      assert.deepEqual(eToObj1(event), {time: 1, repeat: 1.234})
    })

  })

  describe('clear', function() {

    it('should remove event when calling clear', function() {
      var waaClock = new WAAClock(dummyContext)
        , event = waaClock._createEvent(function() {}, 1000)
      assert.deepEqual(waaClock._events, [event])
      event.clear()
      assert.deepEqual(waaClock._events, [])
    })

  })

})

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

    event1 = waaClock.setTimeout(cb, 2).repeat(2)
    dummyContext.currentTime = 3.0
    event2 = waaClock.setTimeout(cb, 2).repeat(2)
    dummyContext.currentTime = 3.6
    event3 = waaClock.setTimeout(cb, 2).repeat(2)

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

  it('should stretch rightly events with different repeat', function() {
    var waaClock = new WAAClock(dummyContext)
      , cb = function() {}
      , event1, event2, event3, ratio
    event1 = waaClock.setTimeout(cb, 2).repeat(2)
    event2 = waaClock.setTimeout(cb, 3).repeat(3)
    event3 = waaClock.setTimeout(cb, 4).repeat(4)

    assert.deepEqual(eToObj1(event1), {time: 2, repeat: 2})
    assert.deepEqual(eToObj1(event2), {time: 3, repeat: 3})
    assert.deepEqual(eToObj1(event3), {time: 4, repeat: 4})

    ratio = 1/2
    waaClock.timeStretch([event1, event2, event3], ratio)
    assert.deepEqual(eToObj1(event1), {time: 1, repeat: 1})
    assert.deepEqual(eToObj1(event2), {time: 1.5, repeat: 1.5})
    assert.deepEqual(eToObj1(event3), {time: 2, repeat: 2})
  })

  it('should work also if the event is very close', function() {
    var waaClock = new WAAClock(dummyContext)
      , cb = function() {}
      , event1, event2, event3, ratio
    event1 = waaClock.callbackAtTime(cb, 1).repeat(2)
    event2 = waaClock.callbackAtTime(cb, 2).repeat(2)

    assert.deepEqual(eToObj1(event1), {time: 1, repeat: 2})
    assert.deepEqual(eToObj1(event2), {time: 2, repeat: 2})

    ratio = 1/2
    dummyContext.currentTime = 1
    waaClock.timeStretch([event1, event2], ratio)
    assert.deepEqual(eToObj1(event1), {time: 2, repeat: 1})
    assert.deepEqual(eToObj1(event2), {time: 1.5, repeat: 1})
  })

  it('should stretch rightly with events that do not repeat', function() {
    var waaClock = new WAAClock(dummyContext)
      , cb = function() {}
      , event1, event2, event3, ratio
    event1 = waaClock.setTimeout(cb, 1.76)
    event2 = waaClock.setTimeout(cb, 3.1).repeat(1)
    event3 = waaClock.setTimeout(cb, 3.8)

    assert.deepEqual(eToObj1(event1), {time: 1.76, repeat: null})
    assert.deepEqual(eToObj1(event2), {time: 3.1, repeat: 1})
    assert.deepEqual(eToObj1(event3), {time: 3.8, repeat: null})

    ratio = 1/2
    waaClock.timeStretch([event1, event2, event3], ratio)
    assert.deepEqual(eToObj1(event1), {time: 1.76/2, repeat: null})
    assert.deepEqual(eToObj1(event2), {time: 3.10/2, repeat: 0.5})
    assert.deepEqual(eToObj1(event3), {time: 3.8/2, repeat: null})
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
      , event1 = waaClock._createEvent(function() { called.push(1) }, 9)
      , event2 = waaClock._createEvent(function() { called.push(2) }, 3.51)
      , event3 = waaClock._createEvent(function() { called.push(3) }, 2.55)
    event1.tolerance(null, 4)
    event2.tolerance(null, 2.5)
    event3.tolerance(null, 2.5)
    
    // t=0
    waaClock._tick()
    assert.deepEqual(called, [])
    dummyContext.currentTime += 1

    // t=1
    waaClock._tick()
    assert.deepEqual(called, [3])
    dummyContext.currentTime += 1

    // t=2
    waaClock._tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += 2

    // t=4
    waaClock._tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += 1

    // t=5
    waaClock._tick()
    assert.deepEqual(called, [3, 2, 1])
    assert.deepEqual(waaClock._events, [])
  })

  it('should execute repeated events', function() {
    var called = []
      , waaClock = new WAAClock(dummyContext, {toleranceEarly: 2.5})
      , event1 = waaClock._createEvent(function() { called.push(1) }, 3)
      , event2 = waaClock._createEvent(function() { called.push(2) }, 1.2)
    event2.repeat(1.2)
    
    // t=0 / look ahead=2.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2])
    dummyContext.currentTime += 1

    // t=1 / look ahead=3.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2, 1])
    dummyContext.currentTime += 1

    // t=2 / look ahead=4.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2, 1, 2])
    dummyContext.currentTime += 1

    event2.clear()
    // t=3 / look ahead=5.5
    waaClock._tick()
    assert.deepEqual(called, [2, 2, 1, 2])
    dummyContext.currentTime += 1
  })

  it('should emit \'executed\'', function() {
    var called = []
      , waaClock = new WAAClock(dummyContext, {toleranceEarly: 2.5})
      , event1 = waaClock._createEvent(function() {}, 3)
      , event2 = waaClock._createEvent(function() {}, 1.2)
    event1.on('executed', function() { called.push('1-ok') })
    event2.on('executed', function() { called.push('2-ok') })

    // t=0 / look ahead=2.5
    waaClock._tick()
    assert.deepEqual(called, ['2-ok'])
    dummyContext.currentTime += 1

    // t=1 / look ahead=3.5
    waaClock._tick()
    assert.deepEqual(called, ['2-ok', '1-ok'])
    
  })

  it('should forget expired events and emit \'expired\'', function() {
    var called = []
      , waaClock = new WAAClock(dummyContext, {lookAheadTime: 1, tickTime: 1})
      , event1 = waaClock._createEvent(function() { called.push('1-ok') }, 2).tolerance(0.1)
      , event2 = waaClock._createEvent(function() { called.push('2-ok') }, 5).tolerance(0.1)
      , event3 = waaClock._createEvent(function() { called.push('3-ok') }, 7).tolerance(0.1)
    event1.on('expired', function() { called.push('1-exp') })
    event2.on('expired', function() { called.push('2-exp') })
    event3.on('expired', function() { called.push('3-exp') })

    dummyContext.currentTime = 2.1
    // t=2.1 / look ahead=3.1
    waaClock._tick()
    assert.equal(waaClock._events.length, 2)
    assert.deepEqual(called, ['1-exp'])

    dummyContext.currentTime = 5.5
    // t=5.5 / look ahead=6.5
    waaClock._tick()
    assert.equal(waaClock._events.length, 1)
    assert.deepEqual(called, ['1-exp', '2-exp'])

    dummyContext.currentTime = 7.05
    // t=7.05 / look ahead=8.05
    waaClock._tick()
    assert.equal(waaClock._events.length, 0)
    assert.deepEqual(called, ['1-exp', '2-exp', '3-ok'])
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

})

describe('_insertEvent', function() {

  it('should insert events at the right position', function() {
    var waaClock = new WAAClock(dummyContext)
    waaClock._events = [{_earliestTime: 2}, {_earliestTime: 3}, {_earliestTime: 7}, {_earliestTime: 11}]

    waaClock._insertEvent({_earliestTime: 1})
    assert.deepEqual(waaClock._events, [{_earliestTime: 1}, {_earliestTime: 2}, {_earliestTime: 3},
      {_earliestTime: 7}, {_earliestTime: 11}])

    waaClock._insertEvent({_earliestTime: 13})
    assert.deepEqual(waaClock._events, [{_earliestTime: 1}, {_earliestTime: 2}, {_earliestTime: 3},
      {_earliestTime: 7}, {_earliestTime: 11}, {_earliestTime: 13}])

    waaClock._insertEvent({_earliestTime: 9})
    assert.deepEqual(waaClock._events, [{_earliestTime: 1}, {_earliestTime: 2}, {_earliestTime: 3},
      {_earliestTime: 7}, {_earliestTime: 9}, {_earliestTime: 11}, {_earliestTime: 13}])

    waaClock._insertEvent({_earliestTime: 2, bla: 34})
    assert.deepEqual(waaClock._events, [{_earliestTime: 1}, {_earliestTime: 2, bla: 34}, {_earliestTime: 2},
      {_earliestTime: 3}, {_earliestTime: 7}, {_earliestTime: 9}, {_earliestTime: 11}, {_earliestTime: 13}])
  })

})

describe('_removeEvent', function() {

  it('should remove events rightly', function() {
    var waaClock = new WAAClock(dummyContext)
    waaClock._events = [{_earliestTime: 2}, {_earliestTime: 3}, {_earliestTime: 4},
      {_earliestTime: 10.5}, {_earliestTime: 11}]

    waaClock._removeEvent(waaClock._events[1])
    assert.deepEqual(waaClock._events, [{_earliestTime: 2}, {_earliestTime: 4}, {_earliestTime: 10.5},
      {_earliestTime: 11}])

    waaClock._removeEvent(waaClock._events[0])
    assert.deepEqual(waaClock._events, [{_earliestTime: 4}, {_earliestTime: 10.5}, {_earliestTime: 11}])

    waaClock._removeEvent(waaClock._events[waaClock._events.length - 1])
    assert.deepEqual(waaClock._events, [{_earliestTime: 4}, {_earliestTime: 10.5}])
  })

})

describe('_indexByTime', function() {
  
  it('should find the right index', function() {
    var waaClock = new WAAClock(dummyContext)
    waaClock._events = [{_earliestTime: 2}, {_earliestTime: 3}, {_earliestTime: 7}, {_earliestTime: 7},
      {_earliestTime: 7}, {_earliestTime: 11}]

    assert.equal(waaClock._indexByTime(3), 1)
    assert.equal(waaClock._indexByTime(2), 0)
    assert.equal(waaClock._indexByTime(11), 5)
    assert.equal(waaClock._indexByTime(7), 2)
    assert.equal(waaClock._indexByTime(6.5), 2)
  })

})

describe('_refTime, _absTime', function() {

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
