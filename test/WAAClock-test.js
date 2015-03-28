var assert = require('assert')
  , WAAClock = require('../index')

var round = function(val) {
  if (typeof val === 'number')
    return Math.round(val * 10000) / 10000
  return val
}

var eToObj1 = function(event) {
  return {
    deadline: round(event.deadline),
    repeat: round(event.repeatTime)
  }
}

var eToObj2 = function(event) {
  return {
    deadline: round(event.deadline),
    func: event.func
  }
}

var dummyContext = {
  currentTime: 0
}

describe('Event', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
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

      event.tolerance({late: 88})
      assert.equal(event.toleranceLate, 88)
      assert.equal(event.toleranceEarly, waaClock.toleranceEarly)

      event.tolerance({early: 999})
      assert.equal(event.toleranceLate, 88)
      assert.equal(event.toleranceEarly, 999)
    })

    it('should update cached values', function() {
      var waaClock = new WAAClock(dummyContext)
        , event = waaClock._createEvent(function(){}, 5).tolerance({early: 2, late: 33})

      assert.equal(event.deadline, 5)
      assert.equal(event.toleranceLate, 33)
      assert.equal(event.toleranceEarly, 2)
      assert.equal(event._latestTime, 5 + 33)
      assert.equal(event._earliestTime, 5 - 2)

      event.schedule(10)
      assert.equal(event.deadline, 10)
      assert.equal(event.toleranceLate, 33)
      assert.equal(event.toleranceEarly, 2)
      assert.equal(event._latestTime, 10 + 33)
      assert.equal(event._earliestTime, 10 - 2)

      event.tolerance({early: 4, late: 11})
      assert.equal(event.deadline, 10)
      assert.equal(event.toleranceLate, 11)
      assert.equal(event.toleranceEarly, 4)
      assert.equal(event._latestTime, 10 + 11)
      assert.equal(event._earliestTime, 10 - 4)
    })

  })

  describe('schedule', function() {

    it('should set time and update the list of events', function() {
      var waaClock = new WAAClock(dummyContext)
        , event1 = waaClock._createEvent(function() {}, 1)
        , event2 = waaClock._createEvent(function() {}, 0.5)
        , event3 = waaClock._createEvent(function() {}, 2)

      assert.deepEqual(waaClock._events.map(eToObj1),
        [ {deadline: 0.5, repeat: null}, {deadline: 1, repeat: null}, {deadline: 2, repeat: null} ])

      event2.schedule(1.234)
      assert.deepEqual(waaClock._events.map(eToObj1),
        [ {deadline: 1, repeat: null}, {deadline: 1.234, repeat: null}, {deadline: 2, repeat: null} ])

      event3.schedule(0.2)
      assert.deepEqual(waaClock._events.map(eToObj1),
        [ {deadline: 0.2, repeat: null}, {deadline: 1, repeat: null}, {deadline: 1.234, repeat: null} ])
    })

    // Test for a bug fix
    it('should not reschedule the event when immediately executed', function() {
      var waaClock = new WAAClock(dummyContext)
        , executed = 0
        , event

      event = waaClock.setTimeout(function() { executed++ }, 0) // Executed immediately
      assert.equal(executed, 1)
      assert.equal(waaClock._events.length, 0)
    })

    it('should schedule repeats even if the event is executed immediately', function() {
      var waaClock = new WAAClock(dummyContext)
        , event

      event = waaClock.setTimeout(function() {}, 0) // Executed immediately
      event.repeat(10)
      assert.equal(waaClock._events.length, 1)
    })

  })

  describe('repeat', function() {

    it('should set event\'s repeat', function() {
      var waaClock = new WAAClock(dummyContext)
        , event = waaClock._createEvent(function() {}, 1)
      event.repeat(1.234)

      assert.deepEqual(eToObj1(event), {deadline: 1, repeat: 1.234})
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

    it('should work if calling clear inside a callback', function() {
      var waaClock = new WAAClock(dummyContext)
        , called = false
        , event = waaClock._createEvent(function() {
          called = true
          event.clear()
        }, 1)

      event.repeat(1)
      dummyContext.currentTime = 1
      waaClock._tick()
      assert.equal(called, true)
      assert.deepEqual(waaClock._events.length, 0)
    })

  })

})

describe('WAAClock', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
  })

  describe('timeStretch', function() {

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

      assert.deepEqual(eToObj1(event1), {deadline: 4.4, repeat: 2})
      assert.deepEqual(eToObj1(event2), {deadline: 5.0, repeat: 2})
      assert.deepEqual(eToObj1(event3), {deadline: 5.6, repeat: 2})

      dummyContext.currentTime = 4.0
      ratio = 1/4
      waaClock.timeStretch(4.0, [event1, event2, event3], ratio)
      assert.deepEqual(eToObj1(event1), {deadline: 4.1, repeat: 0.5})
      assert.deepEqual(eToObj1(event2), {deadline: round(4.1 + (0.6 * ratio)), repeat: 0.5})
      assert.deepEqual(eToObj1(event3), {deadline: round(4.1 + (1.2 * ratio)), repeat: 0.5})
    })

    it('should stretch rightly events with different repeat', function() {
      var waaClock = new WAAClock(dummyContext)
        , cb = function() {}
        , event1, event2, event3, ratio
      event1 = waaClock.setTimeout(cb, 2).repeat(2)
      event2 = waaClock.setTimeout(cb, 3).repeat(3)
      event3 = waaClock.setTimeout(cb, 4).repeat(4)

      assert.deepEqual(eToObj1(event1), {deadline: 2, repeat: 2})
      assert.deepEqual(eToObj1(event2), {deadline: 3, repeat: 3})
      assert.deepEqual(eToObj1(event3), {deadline: 4, repeat: 4})

      ratio = 1/2
      waaClock.timeStretch(0, [event1, event2, event3], ratio)
      assert.deepEqual(eToObj1(event1), {deadline: 1, repeat: 1})
      assert.deepEqual(eToObj1(event2), {deadline: 1.5, repeat: 1.5})
      assert.deepEqual(eToObj1(event3), {deadline: 2, repeat: 2})
    })

    it('should stretch rightly with events that do not repeat', function() {
      var waaClock = new WAAClock(dummyContext)
        , cb = function() {}
        , event1, event2, event3, ratio
      event1 = waaClock.setTimeout(cb, 1.76)
      event2 = waaClock.setTimeout(cb, 3.1).repeat(1)
      event3 = waaClock.setTimeout(cb, 3.8)

      assert.deepEqual(eToObj1(event1), {deadline: 1.76, repeat: null})
      assert.deepEqual(eToObj1(event2), {deadline: 3.1, repeat: 1})
      assert.deepEqual(eToObj1(event3), {deadline: 3.8, repeat: null})

      ratio = 1/2
      Tref = 1.2
      waaClock.timeStretch(Tref, [event1, event2, event3], ratio)
      assert.deepEqual(eToObj1(event1), {deadline: Tref + (1.76 - Tref) * ratio, repeat: null})
      assert.deepEqual(eToObj1(event2), {deadline: Tref + (3.10 - Tref) * ratio, repeat: 0.5})
      assert.deepEqual(eToObj1(event3), {deadline: Tref + (3.8 - Tref) * ratio, repeat: null})
    })

    it('should stretch rightly events for which current time is past (deadline - early)', function() {
      var waaClock = new WAAClock(dummyContext)
        , called = []
        , cb = function(event) { called.push(event.deadline) }
        , event1, event2, event3, event4, ratio
      // Event just reached earliestTime
      event1 = waaClock.callbackAtTime(cb, 1).repeat(2).tolerance({ early: 0.1 })
      event2 = waaClock.callbackAtTime(cb, 2).repeat(2).tolerance({ early: 0.01 })
      event3 = waaClock.callbackAtTime(cb, 0.1).repeat(0.3).tolerance({ early: 0.01 })
      event4 = waaClock.callbackAtTime(cb, 0.1)

      assert.deepEqual(eToObj1(event1), {deadline: 1, repeat: 2})
      assert.deepEqual(eToObj1(event2), {deadline: 2, repeat: 2})
      assert.deepEqual(eToObj1(event3), {deadline: 0.1, repeat: 0.3})
      assert.deepEqual(eToObj1(event4), {deadline: 0.1, repeat: null})

      ratio = 1/2
      dummyContext.currentTime = 0.9
      waaClock.timeStretch(0.9, [event1, event2, event3], ratio)
      assert.deepEqual(called, [])
      assert.deepEqual(eToObj1(event1), {deadline: round(0.9 + (1 - 0.9) * ratio + (1 * ratio) * 2), repeat: 1}) // Stretched from Tref, moved to next possible occurence
      assert.deepEqual(eToObj1(event2), {deadline: round(0.9 + (2 - 0.9) * ratio), repeat: 1}) // Tref is event2.deadline so 2 - 1.1 / 2
      assert.deepEqual(eToObj1(event3), {deadline: round(0.9 + (0.1 - 0.9) * ratio + (0.15 * ratio) * 6), repeat: 0.15}) // Stretched from Tref, moved to next possible occurence
      assert.deepEqual(eToObj1(event4), {deadline: 0.1, repeat: null}) // no transformation applied
    })

    it('shouldnt fail if calling stretch from inside callback', function() {
      var waaClock = new WAAClock(dummyContext)
        , called = []
        , cb = function(event) {
          called.push(event.deadline)
          waaClock.timeStretch(event1.deadline, [event1], 1/2)
        }
        , event1
      
      event1 = waaClock.callbackAtTime(cb, 1).repeat(2).tolerance({ early: 0.1 })
      assert.deepEqual(eToObj1(event1), {deadline: 1, repeat: 2})

      dummyContext.currentTime = 0.9
      assert.deepEqual(called, [])

      waaClock._tick()
      assert.deepEqual(called, [1])
      assert.deepEqual(eToObj1(event1), {deadline: 2, repeat: 1})
    })


  })

  describe('_tick', function() {

    it('should execute simple events rightly', function() {
      var called = []
        , waaClock = new WAAClock(dummyContext)
        , cb = function(event) { called.push(round(event.deadline)) }
        , event1 = waaClock._createEvent(cb, 9)
        , event2 = waaClock._createEvent(cb, 3.51)
        , event3 = waaClock._createEvent(cb, 2.55)
      event1.tolerance({early: 4})
      event2.tolerance({early: 2.5})
      event3.tolerance({early: 2.5})
      
      // t=0
      waaClock._tick()
      assert.deepEqual(called, [])
      dummyContext.currentTime += 1

      // t=1
      waaClock._tick()
      assert.deepEqual(called, [2.55])
      dummyContext.currentTime += 1

      // t=2
      waaClock._tick()
      assert.deepEqual(called, [2.55, 3.51])
      dummyContext.currentTime += 2

      // t=4
      waaClock._tick()
      assert.deepEqual(called, [2.55, 3.51])
      dummyContext.currentTime += 1

      // t=5
      waaClock._tick()
      assert.deepEqual(called, [2.55, 3.51, 9])
      assert.deepEqual(waaClock._events, [])
    })

    it('should execute repeated events', function() {
      var called = []
        , waaClock = new WAAClock(dummyContext, {toleranceEarly: 2.5})
        , cb = function(event) { called.push(round(event.deadline)) }
        , event1 = waaClock._createEvent(cb, 3)
        , event2 = waaClock._createEvent(cb, 1.2)
      event2.repeat(1.2)
      
      // t=0 / look ahead=2.5
      waaClock._tick()
      assert.deepEqual(called, [1.2, 2.4])
      dummyContext.currentTime += 1

      // t=1 / look ahead=3.5
      waaClock._tick()
      assert.deepEqual(called, [1.2, 2.4, 3])
      dummyContext.currentTime += 1

      // t=2 / look ahead=4.5
      waaClock._tick()
      assert.deepEqual(called, [1.2, 2.4, 3, 3.6])
      dummyContext.currentTime += 1

      event2.clear()
      // t=3 / look ahead=5.5
      waaClock._tick()
      assert.deepEqual(called, [1.2, 2.4, 3, 3.6])
      dummyContext.currentTime += 1
    })

    it('should forget expired events and emit \'expired\'', function() {
      var called = []
        , waaClock = new WAAClock(dummyContext, {lookAheadTime: 1, tickTime: 1})
        , event1 = waaClock._createEvent(function() { called.push('1-ok') }, 2).tolerance({late: 0.1})
        , event2 = waaClock._createEvent(function() { called.push('2-ok') }, 5).tolerance({late: 0.1})
        , event3 = waaClock._createEvent(function() { called.push('3-ok') }, 7).tolerance({late: 0.1})
      event1.onexpired = function() { called.push('1-exp') }
      event2.onexpired = function() { called.push('2-exp') }
      event3.onexpired = function() { called.push('3-exp') }

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

    it('shouldnt schedule twice if event rescheduled in user callback', function() {
      var called = []
        , waaClock = new WAAClock(dummyContext)
        , nextDeadlines = [1.5, 1.55, 1.57]
        , cb = function(event) {
          called.push(event.deadline)
          if (nextDeadlines.length)
            event.schedule(nextDeadlines.shift())
        }
        , event1 = waaClock._createEvent(cb, 1).repeat(1).tolerance({ early: 0.1 })
      
      assert.deepEqual(eToObj1(event1), {deadline: 1, repeat: 1})
      waaClock._tick()
      assert.deepEqual(called, [])

      dummyContext.currentTime = 1
      waaClock._tick()
      assert.deepEqual(called, [1])
      assert.deepEqual(eToObj1(event1), {deadline: 1.5, repeat: 1})

      // Should cause the event to be rescheduled immediately
      dummyContext.currentTime = 1.5
      waaClock._tick()
      assert.deepEqual(called, [1, 1.5, 1.55, 1.57])
      assert.deepEqual(eToObj1(event1), {deadline: 2.57, repeat: 1})
    })



  })

  describe('_createEvent', function() {

    it('should create an event when called', function() {
      var waaClock = new WAAClock(dummyContext)
        , cb1 = function() {}
        , cb2 = function() {}
        , cb3 = function() {}
      waaClock._createEvent(cb1, 300)
      waaClock._createEvent(cb2, 1000)
      waaClock._createEvent(cb3, 200.5)
      assert.deepEqual(waaClock._events.map(eToObj2), [
        {deadline: 200.5, func: cb3},
        {deadline: 300, func: cb1},
        {deadline: 1000, func: cb2}
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

    it('can convert from absolute to relative time', function() {
      dummyContext.currentTime = 1
      var waaClock = new WAAClock(dummyContext)
      assert.equal(waaClock._relTime(2), 1)
      assert.equal(waaClock._relTime(0), -1)
      assert.equal(waaClock._absTime(2), 3)
      assert.equal(waaClock._absTime(-0.75), 0.25)
    })

  })

})