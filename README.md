WAAClock.js
=============

Web Audio API doesn't provide a comprehensive API for scheduling things in the time. For example, it is hard or impossible to cancel events once they have been scheduled ; there is no way to schedule a custom event ; there is no way to schedule repeating events ; or change tempo.

`WAAClock(audioContext)` adds a very thin layer allowing you to play with the time in a more easy way.

**Schedule custom events**

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

**Cancel an event**

```javascript
// Start an oscillator node at context.currentTime = 13
var event = clock.callbackAtTime(function() { oscNode.start(13) }, 13)
// ... but change your mind and cancel that
event.clear()
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

**note :** this library uses current web audio API specification. Some older browsers still use prefixed / deprecated function names. You can use [Chris Wilson's AudioContext-MonkeyPatch](https://github.com/cwilso/AudioContext-MonkeyPatch) if you want to support those older browsers as well.


Getting started and examples
-----------------------------

First download the latest stable release of `WAAClock` from [dist/](https://github.com/sebpiq/WAAClock/tree/master/dist), then create an `AudioContext` and a `WAAClock` :

```javascript
var context = window.AudioContext ? new AudioContext() : new webkitAudioContext()
  , clock = new WAAClock(context)
clock.start()
```

For complete examples, check-out this [simple repetitive pattern](http://sebpiq.github.io/WAAClock/demos/tempoChange.html) or a [basic sequencer](http://sebpiq.github.io/WAAClock/demos/beatSequence.html).

API
----

##WAAClock(context, opts)

`WAAClock` handles all the scheduling work. It is the only object you need to create directly.

Because Web Audio API events cannot be cancelled, `WAAClock` simply queues all events, and schedules them only at the last moment.
In fact, each event has a tolerance zone *[t1, t2]* in which it should be executed.
Each event is scheduled as soon as the clock enters its tolerance zone.
On the other hand, if the event hasn't been scheduled when the clock gets out of the tolerance zone, the event will be dropped.
Once the event has been scheduled, it cannot be cancelled anymore, and **will** be executed.
Therefore, you should set the tolerance wisely : a too tight upper bound (`lateTolerance`), and the event can be dropped abusively, 
a too loose lower bound (`earlyTolerance`), and the event will be scheduled too early.

You can set the default tolerance with the options `lateTolerance` and `earlyTolerance`.
You can also set the tolerance on a "per-event" basis, by calling the `tolerance` method of the event.

###start()

Starts the clock.

###stop()

Stops the clock.

###callbackAtTime(func, deadline)

Schedules `func` to run before `deadline` in seconds, and returns an `Event` object.

###setTimeout(func, delay)

Schedules `func` to run after `delay` seconds, and returns an `Event` object.

###timeStretch(events, ratio)

Stretch time and repeat time of `events` by `ratio`, keeping their relative distance.
In fact this is equivalent to changing the tempo.

##Event

Every scheduling method returns an event object. All methods from `Event` return the calling event, so that you can chain them.

###deadline

The deadline of the event.

###schedule(deadline)

Reschedule the deadline of an event, `deadline` is the absolute time as given by `context.currentTime`.

###tolerance(values)

Sets the event's tolerance, `values` is on object that can have keys `late` and `early`. See `WAAClock` for a detailed explanation. Example :

```javascript
// The following executes `cb` before time 11. However, `cb` can be executed as early as
// time 10.9, and if something happends that prevent the event to be executed early enough,
// after time 12 the event will be dropped.
var clock.callbackAtTime(cb, 11)
  .tolerance({ early: 0.1, late: 1 })
```

###repeat(time)

Sets the event to repeat every `time` seconds.  If you want to remove the repeat you can pass `null`. Note that even if an event is dropped because it expired, subsequent "repeats" of the event will still be executed.

###clear()

Cancels the event execution. This will work only if the event hasn't been scheduled yet (see WAAClock for more infos).

### Event: 'executed'

This message is emitted when the event has been executed. You can listen to it by calling `on` :

```javascript
event.on('executed', function() { console.log('yeaay! :)') })
```


### Event: 'expired'

This message is emitted when the clock fell out of the event tolerance zone.
You can listen to it by calling `on` :

```javascript
event.on('expired', function() { console.log('oooh :(!') })
```


Running the tests
------------------

Tests are written with mocha. Just install mocha globally and run `mocha` from the root directory.
Integration with `node-web-audio-api` is tested manually running `node test/node-web-audio-api-test.js`.


Building
----------

Build with browserify to `dist/WAAClock-latest.js` by running `npm run build`.


License
--------

Released under MIT license

Change log
-----------

###0.5.0

- removed support for prefixed AudioContext
- removed underscore dependency
- changed `Event.tolerance` API
- renamed `Event.time` to `Event.deadline`

###0.4.0

- made `WAAClock.start` method public, and `start` needs to be called explicitely
- `WAAClock.stop` method
- removed web audio API monkey-patching
- removed support for old web audio API functions

###0.3.2

- bug fix

###0.3.1

- made `schedule` method of `Event` public.

###0.3.0

- added support for [node-web-audio-api](https://github.com/sebpiq/node-web-audio-api)

###0.2.0

- changed the tick method from `setInterval` to `ScriptProcessorNode`
- added event's `toleranceEarly` and `toleranceLate`
- removed clock `tickTime` and `lookAheadTime` options
- added support for old Web Audio API names

###0.1.2

- added `callbackAtTime`
- bug fixes

