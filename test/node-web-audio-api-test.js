var waa = require('web-audio-api')
  , WAAClock = require('../index')

if (require.main === module) {
  var context = new waa.AudioContext
    , clock = new WAAClock(context)
    , gain = context.createGain()
  gain.connect(context.destination)
  clock.callbackAtTime(function() { console.log('bla ' + context.currentTime) }, 1).repeat(2)
}