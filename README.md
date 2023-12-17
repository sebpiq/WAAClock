WAAClock.js
=============

`WAAClock` is a small library to help you schedule things in time with Web Audio API.

```js
var clock = new WAAClock(audioContext)
clock.start()
```

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
  clock.timeStretch(context.currentTime, [event1, event2], 0.5)
}, 10)
```

**note :** this library uses current Web Audio API specification. Some older browsers still use prefixed / deprecated function names. You can use [Chris Wilson's AudioContext-MonkeyPatch](https://github.com/cwilso/AudioContext-MonkeyPatch) if you want to support those older browsers as well.


Downloads
------------

You can download the latest stable release of `WAAClock` from [dist/](https://github.com/sebpiq/WAAClock/tree/master/dist).

Examples
----------

- [tempo change](http://sebpiq.github.io/WAAClock/demos/tempoChange.html)
- [basic drum machine](http://sebpiq.github.io/WAAClock/demos/beatSequence.html).


More infos about scheduling
----------------------------

`WAAClock` implements the technique explained in Chris Wilson's article [A Tale of Two Clocks](http://www.html5rocks.com/en/tutorials/audio/scheduling/), providing it as a reusable library and adding extra control and features. 
By default, events are triggered by a combination of `ScriptProcessorNode` and `setTimeout`, but you can also implement a custom `tickMethod` to better control event triggering precision and performance.

In short, `WAAClock` merely executes your callback slightly before the given deadline, so you would have time to schedule things exactly using Web Audio API primitives. For example :

```js
var osc = audioContext.createOscillator()
osc.connect(audioContext.destination)

var startEvent = clock.callbackAtTime(function(event) {
  osc.start(event.deadline)
}, 100)
```

Each event created with `WAAClock` has a tolerance zone `[deadline - early, deadline + late]` in which it must be executed. The event is executed as soon as the clock enters this tolerance zone.
On the other hand, if the event hasn't been executed when the clock gets out of the tolerance zone, the event will be dropped (but in practice this shouldn't happen).

You can change the tolerance of an event by calling [Event.tolerance](#tolerancelate-early), but be wise about it : a too tight upper bound `late`, and the event could be dropped abusively, 
a too loose lower bound `early`, and the event will be executed too early.


API
----

## WAAClock(context, opts)

`WAAClock` handles all the scheduling work. It is the only object you need to create directly.

You can set the default tolerance of events with the options `toleranceLate` and `toleranceEarly`.

You can also pass a `tickMethod` option of "manual" to disable the built-in `ScriptProcessorNode`
method of triggering scheduled events, and instead call `clock.tick()` yourself on a regular interval.

### start()

Starts the clock. This will also erase all the events that were previously scheduled.


### stop()

Stops the clock.


### callbackAtTime(func, deadline)

Schedules `func` to run before `deadline` in seconds, and returns an `Event` object.


### setTimeout(func, delay)

Schedules `func` to run after `delay` seconds, and returns an `Event` object.


### timeStretch(tRef, events, ratio)

Stretch time and repeat time of `events` by `ratio`, keeping their relative distance, and taking `tRef` as a reference .
In fact this is equivalent to changing the tempo.

### tick()

Executes any events that are due since the last `tick()` call. This method does not need to be called unless you are using
`tickMethod: 'manual'`. If you are, this method must be called regularly during playback to trigger events. For example, to
use [worker-timers](https://github.com/chrisguttandin/worker-timers) for consistent scheduling when the page is in the background:

```js
import WAAClock from "waaclock";
import * as wt from "worker-timers";

const clock = new WAAClock(audioContext, { tickMethod: 'manual' });
clock.start();

// Event precision is limited by how often clock.tick() is called.
const interval = wt.setInterval(() => clock.tick(), 10);

// ...later...
clock.stop()
wt.clearInterval(interval);
```

## Event

Every scheduling method returns an event object. All methods from `Event` return the calling event, so that you can chain them.


### deadline

The deadline of the event.


### schedule(deadline)

Reschedule the deadline of an event, `deadline` is the absolute time as given by `context.currentTime`.


### tolerance(values)

Sets the event's tolerance, `values` is on object that can have keys `late` and `early`. See `WAAClock` for a detailed explanation. Example :

```javascript
// The following executes `cb` before time 11. However, `cb` can be executed as early as
// time 10.9, and if something happends that prevent the event to be executed early enough,
// after time 12 the event will be dropped.
var clock.callbackAtTime(cb, 11)
  .tolerance({ early: 0.1, late: 1 })
```

### repeat(time)

Sets the event to repeat every `time` seconds.  If you want to remove the repeat you can pass `null`. 
Note that even if an event is dropped because it expired, subsequent "repeats" of the event will still be executed.


### clear()

Cancels the event execution. This will work only if the event hasn't been scheduled yet (see WAAClock for more infos).


### Event: 'expired'

This message is emitted when the clock fell out of the event tolerance zone.
You can listen to it by calling `on` :

```javascript
event.onexpired = function(event) { console.log('oooh :(!') }
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

### 0.5.3

- bug fixes.


### 0.5.2

- bug fixes.


### 0.5.1

- bug fixes.

### 0.5.0

- removed support for prefixed AudioContext
- removed underscore dependency
- changed `Event.tolerance` API
- renamed `Event.time` to `Event.deadline`
- added `tRef` argument to `timeStretch`
- removed `executed` event and EventEmitter
- `expired` event to callback

### 0.4.0

- made `WAAClock.start` method public, and `start` needs to be called explicitely
- `WAAClock.stop` method
- removed web audio API monkey-patching
- removed support for old web audio API functions

### 0.3.2

- bug fix

### 0.3.1

- made `schedule` method of `Event` public.

### 0.3.0

- added support for [node-web-audio-api](https://github.com/sebpiq/node-web-audio-api)

### 0.2.0

- changed the tick method from `setInterval` to `ScriptProcessorNode`
- added event's `toleranceEarly` and `toleranceLate`
- removed clock `tickTime` and `lookAheadTime` options
- added support for old Web Audio API names

### 0.1.2

- added `callbackAtTime`
- bug fixes

