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
// prints 'wow!' at content.currentTime = 13
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

This is the main object taking care of all the scheduling. It takes an `AudioContext` as first argument and patches it in order to add new properties on some Web Audio API objects.

The clock checks for upcoming events every `tickTime` seconds and schedules them to be run at the desired time with whatever **native** mechanism is available for doing so.
This is the reason why you can cancel events : they are actually queued and scheduled only at the last moment.

You can control this behaviour with the options `tickTime` and `lookAheadTime`. For example :

```javascript
// t=1, looks-up events between t=1 and t=3 : event1 scheduled for t=3 and can't be canceled anymore.
// t=2, looks-up events between t=2 and t=4 : no event.
// t=3, looks-up events between t=3 and t=5 : event2 scheduled for t=5 and can't be canceled anymore.
var clock = new WAAClock(context, {tickTime: 1, lookAheadTime: 2})
  , event1 = clock.setTimeout(function() {}, 3)
  , event2 = clock.setTimeout(function() {}, 5)
```



For Web Audio API event like `start` or `setValueAtTime`, under the hood the native functions are used, which means that the timing is exact.
For custom events, `setTimeout` is used, which means that the timing is very approximative.


License
--------

Released under MIT license

Change log
-----------

###0.1.2

- added `callbackAtTime` and bug fixes
- bug fixes

