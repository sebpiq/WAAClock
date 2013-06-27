var assert = require('assert')
  , WAAClock = require('../lib/WAAClock')

var dummyContext = {
  currentTime: 0
}

describe('tick', function() {

  beforeEach(function() {
    dummyContext = {
      currentTime: 0
    }
  })

  it('should execute simple events rightly', function() {
    var called = []
      , waaClock = new WAAClock(dummyContext)
      , event1 = waaClock.setTimeout(function() { called.push(1) }, 7.5)
      , event2 = waaClock.setTimeout(function() { called.push(2) }, 3.51)
      , event3 = waaClock.setTimeout(function() { called.push(3) }, 2.55)
    waaClock.lookAheadTime = 2.5
    waaClock.tickTime = 1
    
    // t=0 / look ahead=2.5
    waaClock.tick()
    assert.deepEqual(called, [])
    dummyContext.currentTime += waaClock.tickTime

    // t=1 / look ahead=3.5
    waaClock.tick()
    assert.deepEqual(called, [3])
    dummyContext.currentTime += waaClock.tickTime

    // t=2 / look ahead=4.5
    waaClock.tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += waaClock.tickTime

    // t=3 / look ahead=5.5
    waaClock.tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += waaClock.tickTime

    // t=4 / look ahead=6.5
    waaClock.tick()
    assert.deepEqual(called, [3, 2])
    dummyContext.currentTime += waaClock.tickTime

    // t=5 / look ahead=7.5
    waaClock.tick()
    assert.deepEqual(called, [3, 2, 1])
    assert.deepEqual(waaClock._events, [])
  })

})

describe('setTimeout', function() {

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
    waaClock.setTimeout(cb1, 1000)
    waaClock.setTimeout(cb2, 300)
    dummyContext.currentTime = 200
    waaClock.setTimeout(cb3, 200.5)
    assert.deepEqual(waaClock._events, [
      {time: 300, func: cb2},
      {time: 400.5, func: cb3},
      {time: 1000, func: cb1}
    ])
  })

  it('should remove event when calling clear', function() {
    var waaClock = new WAAClock(dummyContext)
      , event = waaClock.setTimeout(function() {}, 1000)
    assert.deepEqual(waaClock._events, [event])
    waaClock.clear(event)
    assert.deepEqual(waaClock._events, [])
  })

})

describe('setInterval', function() {

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
    waaClock.setInterval(cb1, 1000)
    waaClock.setInterval(cb2, 300)
    dummyContext.currentTime = 200
    waaClock.setInterval(cb3, 200.5)
    assert.deepEqual(waaClock._events, [
      {time: 300, func: cb2, repeat: 300},
      {time: 400.5, func: cb3, repeat: 200.5},
      {time: 1000, func: cb1, repeat: 1000}
    ])
  })

  it('should remove event when calling clear', function() {
    var waaClock = new WAAClock(dummyContext)
      , event = waaClock.setInterval(function() {}, 1000)
    assert.deepEqual(waaClock._events, [event])
    waaClock.clear(event)
    assert.deepEqual(waaClock._events, [])
  })

})

describe('_insertEvent', function() {

  it('should insert at the right position', function() {
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

describe('_removeEvent', function() {

  it('should remove event rightly', function() {
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
