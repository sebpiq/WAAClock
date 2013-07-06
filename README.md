WAAClock.js
=============

Web Audio API doesn't provide a comprehensive API for scheduling things in the time. For example, it is hard or impossible to cancel events once they have been scheduled ; there is no way to schedule a custom event ; there is no way to schedule repeating events.

`WAAClock` adds a very thin layer allowing you to play with the time in a more easy way :

**Schedule and cancel built-in Web Audio API events**

```javascript
var osc = context.createOscillator()
  , startEvent = osc.start2(5)
  , freqChangeEvent = osc.frequency.setValueAtTime2(220, 5)

// cancel those events in 4 seconds
clock.setTimeout(function() {
  startEvent.clear()
  freqChangeEvent.clear()
}, 4)
```

**Schedule (approximatively) custom events**

```javascript
// prints 'wow!' at context.currentTime = 13
var event = clock.callbackAtTime(function() { console.log('wow!') }, 13)
// prints 'wow!' in 13 seconds
var event = clock.setTimeout(function() { console.log('wow!') }, 13)
```

**Set events to repeat periodically**

```javascript
var event = clock.callbackAtTime(function() { console.log('wow!') }, 3).repeat(2)
```

**Change the tempo of a group of events**

```javascript
var event1 = clock.callbackAtTime(function() { console.log('wow!') }, 1).repeat(2)
  , event2 = clock.callbackAtTime(function() { console.log('what?') }, 2).repeat(2)

// in 10 seconds, the tempo will be multiplied by 2
clock.setTimeout(function() {
  clock.timeStretch([event1, event2], 0.5)
}, 10)
```

**note :** this library is still being developed, please, please, please, report any bugs, request features, give feedback.


Getting started
----------------

First download the latest stable release of `WAAClock.js` from [dist/](https://github.com/sebpiq/WAAClock.js/tree/master/dist), then create an `AudioContext` and a `WAAClock` :

```javascript
var context = window.AudioContext ? new AudioContext() : new webkitAudioContext()
  , clock = new WAAClock(context)
```


Examples
---------

Check-out this [simple repetitive pattern](http://sebpiq.github.io/WAAClock.js/tempoChange.html) or a [basic sequencer](http://sebpiq.github.io/WAAClock.js/beatSequence.html).

API
----

**Writing in progress**

###WAAClock(context, opts)

`WAAClock` handles all the scheduling work. It is the only object you need to create directly.
It takes an `AudioContext` as first argument and patches it to add new methods on Web Audio API objects.

For methods like `start2` or `setValueAtTime2`, under the hood the native methods are used, which means that the timing is exact.
For custom events, `setTimeout` is used, which means that the timing is very approximative.

Because Web Audio API events cannot be cancelled, `WAAClock` simply queues all events, and schedules them only at the last moment.
You can control this behaviour with the options `tickTime` and `lookAheadTime`. For example :

```javascript
var clock = new WAAClock(context, {tickTime: 1, lookAheadTime: 2})
  , event1 = clock.callbackAtTime(function() {}, 3)
  , event2 = clock.callbackAtTime(function() {}, 5)
// We've scheduled `event1` to run at t=3 and `event2` at t=5. The clock ticks every 1 second,
// so let's imagine what will happen :
// first tick, t=1, schedules events between t=1 and t=3 : `event1` scheduled and can't be canceled anymore.
// second tick, t=2, schedules events between t=2 and t=4 : nothing.
// third tick t=3, schedules events between t=3 and t=5 : `event2` scheduled and can't be canceled anymore.
```

##WAAClock.callbackAtTime(func, time)

Schedules `func` to run at `time` in seconds, and returns an `Event` object.

##WAAClock.setTimeout(func, delay)

Schedules `func` to run after `delay` seconds, and returns an `Event` object.

##WAAClock.timeStretch(events, ratio)

Stretch time and repeat time of `events` by `ratio`, keeping their relative distance.
In fact this is equivalent to changing the tempo.

###Event

Every scheduling method returns an event object. All methods from `Event` return the calling event, so that you can chain them.

##tolerance(time)

If for any reason (too short lookAheadTime, browser too slow, ...) the event cannot be scheduled on time, it will be dropped.
You can control this behaviour by setting the event's tolerance.
If tolerance is 0, the event will be dropped as soon as it falls behind.
If tolerance is 1, the event will be dropped if it is more than 1 second late. And so on ...

##repeat(time)

Sets the event to repeat every `time` seconds.

##clear()

Cancels the event execution. This will work only if the event hasn't been scheduled yet (see WAAClock for more infos).


License
--------

Released under MIT license

Change log
-----------

###0.1.2

- added `callbackAtTime` and bug fixes
- bug fixes

