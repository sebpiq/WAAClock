WAAClock.js
=============

Web Audio API doesn't provide a comprehensive API for scheduling things in the time. For example, it is hard or impossible to cancel events once they have been scheduled ; there is no way to schedule a custom event ; there is no way to schedule repeating events.

`WAAClock` adds a very thin layer allowing you to play with the time in a more easy way.

First download the latest stable release of `WAAClock.js` from [dist/](https://github.com/sebpiq/WAAClock.js/tree/master/dist), then create an `AudioContext` and a `WAAClock` :

```javascript
var context = window.AudioContext ? new AudioContext() : new webkitAudioContext()
  , clock = new WAAClock(context)
```

And now you can :

**Schedule and cancel built-in Web Audio API events** :

```
var osc = context.createOscillator()
  , startEvent = osc.start2(5)
  , freqChangeEvent = osc.frequency.setValueAtTime2(220, 5)

clock.setTimeout(function() {
  startEvent.clear()
  freqChangeEvent.clear()
}, 4)
```

**Schedule (approximatively) custom events** :

```
var event = clock.setTimeout(function() { console.log('wow!') }, 13)
```

**You can set events to repeat periodically** :

```javascript
var event = clock.setTimeout(function() { console.log('wow!') }, 3).repeat(2)
```

**Change the tempo of a group of events** :

```javascript
var event1 = clock.setTimeout(function() { console.log('wow!') }, 1).repeat(2)
  , event2 = clock.setTimeout(function() { console.log('what?') }, 2).repeat(2)
  , tempoChange = clock.setTimeout(function() {
    clock.timeStretch([event1, event2], 0.5)
  }, 10)
```

**note :** this library is still being developed, please, please, please, report any bugs, request features, give feedback.

Examples
---------

Check-out this [simple repetitive pattern](http://sebpiq.github.io/WAAClock.js/tempoChange.html) or a [basic sequencer](http://sebpiq.github.io/WAAClock.js/beatSequence.html).

API
----

TBD

License
--------

Released under MIT license

Change log
-----------

